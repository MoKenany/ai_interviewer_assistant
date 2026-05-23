"""
Custom exceptions for task queue and pipeline processing
"""


class PipelineException(Exception):
    """Base exception for pipeline errors"""
    pass


class RetriableError(PipelineException):
    """Error that can be retried (e.g., temporary API failure)"""
    pass


class FatalError(PipelineException):
    """Error that cannot be retried (e.g., validation failure)"""
    pass


class TranscriptionError(RetriableError):
    """STT transcription failed"""
    pass


class TokenBudgetExceeded(FatalError):
    """Token budget exceeded for session"""
    pass


class PipelineAlreadyRunning(FatalError):
    """Pipeline already running for this session"""
    pass


class MediaFileNotFound(FatalError):
    """Media file not found"""
    pass


class JobVersionNotFound(FatalError):
    """Job version not found for application"""
    pass


class CriteriaNotFound(FatalError):
    """No evaluation criteria defined for job version"""
    pass


class AIRequestTimeout(RetriableError):
    """AI API request timed out"""
    pass


class AIRequestFailed(RetriableError):
    """AI API request failed (may be retriable)"""
    pass


class StorageError(FatalError):
    """Error reading/writing to storage"""
    pass
