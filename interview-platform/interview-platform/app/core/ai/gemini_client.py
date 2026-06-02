import os
from tenacity import RetryError, retry, wait_exponential, stop_after_attempt
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from typing import List, Optional
from app.schemas.job import EvaluationCriteriaProposal
from pydantic import BaseModel, Field

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
    seniority_signals: str
    red_flags: str

class SuggestedQuestion(BaseModel):
    criterion: str
    weakness_reference: str
    question: str

from app.models.interview_evaluation import HiringRecommendationEnum

class InsightReport(BaseModel):
    strengths: List[InsightStrength]
    weaknesses: List[InsightWeakness]
    interviewer_notes: InterviewerNotes
    executive_summary: str
    hiring_recommendation: HiringRecommendationEnum
    confidence_score: float
    suggested_questions: List[SuggestedQuestion]

import contextvars

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
    try:
        content_len = len(getattr(response, "content", ""))
        content = getattr(response, "content", "")
        arabic_chars = sum(1 for char in content if "\u0600" <= char <= "\u06FF")
        chars_per_token = 2.5 if content and arabic_chars / len(content) > 0.3 else 3.5
        return max(1, int(content_len / chars_per_token))
    except Exception:
        return 0

from app.core.config import GEMINI_API_KEY, GEMINI_MODEL

def get_gemini_model():
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.2,
        max_retries=0  # Prevents internal SDK/LangChain retries from causing retry-storm multipliers
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



import asyncio
import time

_gemini_call_lock = asyncio.Lock()
_last_gemini_call_time = 0.0
MIN_DELAY_BETWEEN_CALLS = 5.0  # Safe pacing to respect 15 RPM free tier limits (maximum of 12 calls/minute)

async def _rate_limited_ainvoke(model, formatted_prompt) -> any:
    global _last_gemini_call_time
    
    # 1. Acquire lock only to compute and reserve the future execution timestamp.
    # The lock is held for only microseconds and released immediately, allowing
    # other concurrent tasks to calculate their slots without blocking.
    async with _gemini_call_lock:
        now = time.monotonic()
        # Schedule the call at least MIN_DELAY_BETWEEN_CALLS after the last scheduled call
        target_time = max(now, _last_gemini_call_time + MIN_DELAY_BETWEEN_CALLS)
        _last_gemini_call_time = target_time
        
    # The lock is released. We calculate the delay to sleep outside of the lock.
    sleep_time = target_time - time.monotonic()
    if sleep_time > 0:
        print(f"RATE LIMITER: Pausing for {sleep_time:.2f}s outside lock to protect Gemini Free Tier quota...")
        await asyncio.sleep(sleep_time)
        
    # 2. Perform network I/O outside of the lock to prevent serializing subsequent tasks
    return await model.ainvoke(formatted_prompt)

class GeminiClient:
    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_jd_agent(jd_text: str) -> List[EvaluationCriteriaProposal]:
        model = get_gemini_model()
        parser = PydanticOutputParser(pydantic_object=CriteriaList)
        prompt_path = os.path.join(os.getcwd(), "prompts", "jd_extraction", "v1.txt")
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
        model = get_gemini_model()
        parser = PydanticOutputParser(pydantic_object=QAPairList)
        prompt_path = os.path.join(os.getcwd(), "prompts", "qa_extraction", "v1.txt")
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
    async def run_scoring(qa_pairs: list, criteria: list, jd_text: str) -> ScoringResult:
        model = get_gemini_model()
        parser = PydanticOutputParser(pydantic_object=ScoringResult)
        prompt_path = os.path.join(os.getcwd(), "prompts", "scoring", "v1.txt")
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["qa_pairs", "criteria", "jd_text"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"qa_pairs": str(qa_pairs), "criteria": str(criteria), "jd_text": jd_text})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result

    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=5, max=15), stop=stop_after_attempt(3))
    async def run_insight_generation(scoring: ScoringResult, qa_pairs: list, criteria: list) -> InsightReport:
        model = get_gemini_model()
        parser = PydanticOutputParser(pydantic_object=InsightReport)
        prompt_path = os.path.join(os.getcwd(), "prompts", "insight_generation", "v1.txt")
        with open(prompt_path, "r") as f:
            template_str = f.read()
        prompt = PromptTemplate(template=template_str, input_variables=["scoring", "qa_pairs", "criteria"], partial_variables={"format_instructions": parser.get_format_instructions()})
        
        formatted_prompt = await prompt.ainvoke({"scoring": scoring.model_dump_json(), "qa_pairs": str(qa_pairs), "criteria": str(criteria)})
        response = await _rate_limited_ainvoke(model, formatted_prompt)
        
        tokens = extract_tokens(response)
        tokens_tracker.set(tokens)
        
        result = parser.parse(response.content)
        return result
