"""
Token Budget Management
Controls and tracks LLM token consumption across pipeline steps
"""

from dataclasses import dataclass, field
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class TokenUsage:
    """Tracks token usage for a single step"""
    step_name: str
    tokens: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    
    def __repr__(self):
        return f"TokenUsage({self.step_name}: {self.tokens} tokens)"


@dataclass
class TokenBudget:
    """Manages token budget for a pipeline run"""
    
    max_tokens_per_session: int = 50000  # 50k default budget
    steps: Dict[str, TokenUsage] = field(default_factory=dict)
    
    @property
    def total_used(self) -> int:
        """Calculate total tokens used across all steps"""
        return sum(step.tokens for step in self.steps.values())
    
    @property
    def remaining(self) -> int:
        """Calculate remaining tokens in budget"""
        return self.max_tokens_per_session - self.total_used
    
    @property
    def budget_percentage(self) -> float:
        """Get percentage of budget used"""
        return (self.total_used / self.max_tokens_per_session) * 100
    
    def can_proceed(self, estimated_tokens: int, buffer: float = 1.1) -> bool:
        """
        Check if we can proceed with estimated token usage
        
        Args:
            estimated_tokens: Expected tokens for this operation
            buffer: Safety buffer multiplier (default 1.1 = 10% safety margin)
        
        Returns:
            True if sufficient tokens available, False otherwise
        """
        required = int(estimated_tokens * buffer)
        can_proceed = self.remaining >= required
        
        if not can_proceed:
            logger.warning(
                f"Token budget check failed: "
                f"need {required} tokens, only {self.remaining} remaining "
                f"({self.budget_percentage:.1f}% used)"
            )
        
        return can_proceed
    
    def add_usage(
        self, 
        step_name: str, 
        tokens: int, 
        prompt_tokens: int = 0, 
        completion_tokens: int = 0
    ) -> None:
        """
        Record token usage for a step
        
        Args:
            step_name: Name of the processing step
            tokens: Total tokens used
            prompt_tokens: Tokens in prompt/input
            completion_tokens: Tokens in completion/output
        
        Raises:
            TokenBudgetExceeded: If adding this usage exceeds budget
        """
        if self.total_used + tokens > self.max_tokens_per_session:
            raise TokenBudgetExceeded(
                f"Cannot add {tokens} tokens to {step_name}: "
                f"would exceed budget ({self.total_used + tokens} > {self.max_tokens_per_session}). "
                f"Remaining: {self.remaining}"
            )
        
        self.steps[step_name] = TokenUsage(
            step_name=step_name,
            tokens=tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )
        
        logger.info(
            f"Step '{step_name}' used {tokens} tokens. "
            f"Budget: {self.total_used}/{self.max_tokens_per_session} "
            f"({self.budget_percentage:.1f}%)"
        )
    
    def get_step_usage(self, step_name: str) -> Optional[TokenUsage]:
        """Get token usage for a specific step"""
        return self.steps.get(step_name)
    
    def to_dict(self) -> dict:
        """Convert budget to dictionary for storage"""
        return {
            'max_tokens': self.max_tokens_per_session,
            'total_used': self.total_used,
            'remaining': self.remaining,
            'percentage_used': self.budget_percentage,
            'steps': {
                name: {
                    'tokens': usage.tokens,
                    'prompt_tokens': usage.prompt_tokens,
                    'completion_tokens': usage.completion_tokens,
                }
                for name, usage in self.steps.items()
            }
        }
    
    def __repr__(self):
        return (f"TokenBudget({self.total_used}/{self.max_tokens_per_session} tokens, "
                f"{self.budget_percentage:.1f}% used, {len(self.steps)} steps)")


class TokenBudgetExceeded(Exception):
    """Raised when token budget is exceeded"""
    pass


class TokenEstimator:
    """Estimates tokens for text based on language"""
    
    # Rough estimates for different languages
    # Actual tokens depend on tokenizer used
    TOKENS_PER_CHAR = {
        'ar': 0.4,      # Arabic: ~2.5 chars per token
        'en': 0.25,     # English: ~4 chars per token
        'default': 0.3  # Default: ~3.3 chars per token
    }
    
    @staticmethod
    def detect_language(text: str) -> str:
        """
        Simple language detection based on character range
        
        Returns:
            'ar' for Arabic, 'en' for English, 'default' for others
        """
        arabic_count = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
        total_chars = len(text)
        
        if total_chars == 0:
            return 'default'
        
        arabic_ratio = arabic_count / total_chars
        
        if arabic_ratio > 0.3:  # More than 30% Arabic characters
            return 'ar'
        else:
            return 'en'
    
    @staticmethod
    def estimate_tokens(text: str, language: Optional[str] = None) -> int:
        """
        Estimate number of tokens for given text
        
        Args:
            text: The text to estimate tokens for
            language: Language code ('ar', 'en', or None for auto-detect)
        
        Returns:
            Estimated token count
        """
        if not text:
            return 0
        
        if language is None:
            language = TokenEstimator.detect_language(text)
        
        ratio = TokenEstimator.TOKENS_PER_CHAR.get(language, TokenEstimator.TOKENS_PER_CHAR['default'])
        estimated = max(1, int(len(text) * ratio))
        
        return estimated
    
    @staticmethod
    def estimate_stt_tokens(transcript: str) -> int:
        """
        Estimate tokens for STT (Speech-to-Text) transcription
        
        More aggressive estimate since STT output is typically less dense
        """
        # STT tokens often cheaper than regular tokens
        # Estimate: 1 token per 5 characters
        return max(1, int(len(transcript) / 5))
