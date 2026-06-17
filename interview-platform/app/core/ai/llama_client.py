from pathlib import Path
import asyncio
import time
from tenacity import RetryError, retry, wait_exponential, stop_after_attempt
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from typing import List, Optional
from pydantic import BaseModel, Field, computed_field
import contextvars

from app.schemas.job import EvaluationCriteriaProposal
from app.models.interview_evaluation import HiringRecommendationEnum
from app.core.config import GROQ_API_KEY
from app.core.prompts.sanitizer import sanitize_input
from app.core.prompts.jd_extraction_prompt import build_jd_extraction_prompt
from app.core.prompts.qa_extraction_prompt import build_qa_extraction_prompt
from app.core.prompts.scoring_prompt import build_scoring_prompt
from app.core.prompts.insight_generation_prompt import build_insight_generation_prompt

# Pydantic Models for Parsing
class CriteriaList(BaseModel):
    criteria: List[EvaluationCriteriaProposal] = Field(description="List of proposed evaluation criteria")

class QAPair(BaseModel):
    question: str
    answer: str
    competency_tag: str
    transcript_timestamps: str

class QAPairList(BaseModel):
    qa_pairs: List[QAPair]

class CriterionScore(BaseModel):
    criterion_name: str
    score: int = Field(ge=0, le=100)
    weight: float
    justification: str
    evidence_quote: str

class ScoringResult(BaseModel):
    per_criterion_scores: List[CriterionScore]

    @computed_field
    @property
    def overall_weighted_score(self) -> float:
        total_weight = sum(c.weight for c in self.per_criterion_scores)
        if total_weight == 0:
            return 0.0
        weighted_sum = sum(c.score * c.weight for c in self.per_criterion_scores)
        return round(weighted_sum / total_weight, 2)

class InsightStrength(BaseModel):
    criterion: str
    description: str
    evidence_quote: str

class InsightWeakness(BaseModel):
    criterion: str
    description: str
    gap_analysis: str

class InterviewerNotes(BaseModel):
    communication_style: str
    confidence_level: str
    confidence_explanation: str
    seniority_signals: str
    red_flags: str

class SuggestedQuestion(BaseModel):
    criterion: str
    weakness_reference: str
    question: str

class InsightReport(BaseModel):
    strengths: List[InsightStrength]
    weaknesses: List[InsightWeakness]
    interviewer_notes: InterviewerNotes
    executive_summary: str
    hiring_recommendation: HiringRecommendationEnum
    confidence_score: float
    suggested_questions: List[SuggestedQuestion]




# Context variables to track tokens
tokens_tracker = contextvars.ContextVar("tokens_tracker", default=0)

def extract_tokens(response) -> int:
    try:
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            return response.usage_metadata.get("total_tokens") or 0
        if hasattr(response, "response_metadata") and response.response_metadata:
            token_usage = response.response_metadata.get("token_usage") or {}
            if token_usage:
                return token_usage.get("total_tokens") or token_usage.get("prompt_tokens", 0) + token_usage.get("completion_tokens", 0)
    except Exception:
        pass
    return 0

GROQ_MODEL = "llama-3.3-70b-versatile"

def get_llama_model():
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured")
    return ChatGroq(
        model=GROQ_MODEL,
        groq_api_key=GROQ_API_KEY,
        temperature=0.2,
        max_retries=0
    )

def unwrap_ai_error(exc: Exception) -> Exception:
    if isinstance(exc, RetryError) and exc.last_attempt:
        last_exc = exc.last_attempt.exception()
        if last_exc:
            return last_exc
    return exc

def is_recoverable_ai_error(exc: Exception) -> bool:
    message = str(unwrap_ai_error(exc)).lower()
    recoverable_markers = [
        "resource_exhausted",
        "quota",
        "rate limit",
        "429",
        "timeout",
        "temporarily unavailable",
        "503",
        "503 service unavailable",
        "deadline",
        "connection",
    ]
    return any(marker in message for marker in recoverable_markers)

_llama_call_lock = asyncio.Lock()
_last_llama_call_time = 0.0
MIN_DELAY_BETWEEN_CALLS = 1.0  # Groq rate limit pacing

async def _rate_limited_ainvoke(model, formatted_prompt) -> any:
    global _last_llama_call_time
    
    async with _llama_call_lock:
        now = time.monotonic()
        target_time = max(now, _last_llama_call_time + MIN_DELAY_BETWEEN_CALLS)
        _last_llama_call_time = target_time
        
    sleep_time = target_time - time.monotonic()
    if sleep_time > 0:
        print(f"RATE LIMITER: Pausing for {sleep_time:.2f}s outside lock to protect Groq quota...")
        await asyncio.sleep(sleep_time)
        
    return await model.ainvoke(formatted_prompt)

def clean_json_response(text: str) -> str:
    """Strips markdown json wrappers if the model ignores the no-markdown instruction."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    
    if text.endswith("```"):
        text = text[:-3]
        
    return text.strip()

class LlamaClient:
    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_jd_agent(jd_text: str, job_title: str = "Unknown", department: str = "Unknown", employment_type: str = "Unknown", min_criteria: int = 4, max_criteria: int = 8) -> List[EvaluationCriteriaProposal]:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=CriteriaList)
        prompt = build_jd_extraction_prompt(parser, job_title, department, employment_type, min_criteria, max_criteria)
        
        formatted_prompt = await prompt.ainvoke({"jd_text": sanitize_input(jd_text)})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(clean_json_response(response.content))
        return result.criteria

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_qa_extraction(transcript: str, criteria: list, session_type: str = "general") -> List[QAPair]:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=QAPairList)
        prompt = build_qa_extraction_prompt(parser, session_type)
        
        formatted_prompt = await prompt.ainvoke({"transcript": sanitize_input(transcript), "criteria": str(criteria)})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(clean_json_response(response.content))
        return result.qa_pairs

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_scoring(qa_pairs: list, criteria: list, jd_text: str, ai_mode: str = "normal", job_title: str = "Unknown", session_type: str = "general") -> ScoringResult:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=ScoringResult)
        prompt = build_scoring_prompt(parser, ai_mode, job_title, session_type)
        
        formatted_prompt = await prompt.ainvoke({"qa_pairs": str(qa_pairs), "criteria": str(criteria), "jd_text": sanitize_input(jd_text)})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(clean_json_response(response.content))
        return result

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_insight_generation(scoring: ScoringResult, qa_pairs: list, criteria: list, ai_mode: str = "normal", job_title: str = "Unknown", department: str = "Unknown", session_type: str = "general") -> InsightReport:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=InsightReport)
        prompt = build_insight_generation_prompt(parser, ai_mode, job_title, department, session_type)
        
        formatted_prompt = await prompt.ainvoke({"scoring": scoring.model_dump_json(), "qa_pairs": str(qa_pairs), "criteria": str(criteria)})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(clean_json_response(response.content))
        return result
