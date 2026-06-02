from pathlib import Path
import asyncio
import time
from tenacity import RetryError, retry, wait_exponential, stop_after_attempt
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from typing import List, Optional
from pydantic import BaseModel, Field
import contextvars

from app.schemas.job import EvaluationCriteriaProposal
from app.models.interview_evaluation import HiringRecommendationEnum
from app.core.config import GROQ_API_KEY

PROMPTS_DIR = Path(__file__).resolve().parents[3] / "prompts"

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
    justification: str
    evidence_quote: str

class ScoringResult(BaseModel):
    per_criterion_scores: List[CriterionScore]
    overall_weighted_score: float

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


class JobMatchDetail(BaseModel):
    jd_job_title: str
    transcript_job_title_inferred: str
    titles_match: bool
    match_explanation: str

class TopicAnalysis(BaseModel):
    jd_key_topics: List[str]
    transcript_topics: List[str]
    overlap_percentage: int
    missing_topics: List[str]
    extra_topics: List[str]

class LanguageAnalysis(BaseModel):
    jd_language: str
    transcript_language: str
    language_match: bool
    is_translated: bool
    translation_notes: Optional[str] = None

class TranscriptValidationResult(BaseModel):
    is_compatible: bool
    compatibility_score: int = Field(ge=0, le=100)
    job_match: JobMatchDetail
    topic_analysis: TopicAnalysis
    language_analysis: LanguageAnalysis
    critical_issues: List[str]
    assessment_notes: str
    recommendation: str  # "proceed" | "review_manually" | "reject"
    reasoning: str



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

class LlamaClient:
    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_jd_agent(jd_text: str) -> List[EvaluationCriteriaProposal]:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=CriteriaList)
        prompt_path = PROMPTS_DIR / "jd_extraction" / "v2.txt"
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["jd_text"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"jd_text": jd_text})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result.criteria

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_qa_extraction(transcript: str, criteria: list) -> List[QAPair]:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=QAPairList)
        prompt_path = PROMPTS_DIR / "qa_extraction" / "v2.txt"
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["transcript", "criteria"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"transcript": transcript, "criteria": str(criteria)})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result.qa_pairs

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_scoring(qa_pairs: list, criteria: list, jd_text: str, ai_mode: str = "normal") -> ScoringResult:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=ScoringResult)
        prompt_path = PROMPTS_DIR / "scoring" / "v2.txt"
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["qa_pairs", "criteria", "jd_text", "mode"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"qa_pairs": str(qa_pairs), "criteria": str(criteria), "jd_text": jd_text, "mode": ai_mode})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_insight_generation(scoring: ScoringResult, qa_pairs: list, criteria: list, ai_mode: str = "normal") -> InsightReport:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=InsightReport)
        prompt_path = PROMPTS_DIR / "insight_generation" / "v2.txt"
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["scoring", "qa_pairs", "criteria", "mode"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"scoring": scoring.model_dump_json(), "qa_pairs": str(qa_pairs), "criteria": str(criteria), "mode": ai_mode})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_transcript_validation(transcript: str, jd_text: str) -> TranscriptValidationResult:
        model = get_llama_model()
        parser = PydanticOutputParser(pydantic_object=TranscriptValidationResult)
        prompt_path = PROMPTS_DIR / "transcript_validation" / "v2.txt"
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["transcript", "jd_text"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"transcript": transcript, "jd_text": jd_text})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result
