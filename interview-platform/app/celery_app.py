"""
Celery Application Configuration
Handles asynchronous task processing for interview pipeline
"""

from celery import Celery
from app.core.config import (
    CELERY_BROKER_URL,
    CELERY_RESULT_BACKEND,
    CELERY_TASK_SOFT_TIME_LIMIT,
    CELERY_TASK_TIME_LIMIT,
)

celery_app = Celery(
    'interview_platform',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=['app.tasks.pipeline_tasks']
)

# Configure Celery settings
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=CELERY_TASK_SOFT_TIME_LIMIT,
    task_acks_late=True,  # Acknowledge task after execution
    worker_prefetch_multiplier=1,  # Process one task at a time
    result_expires=3600,  # Results expire after 1 hour
    broker_connection_retry_on_startup=True,
    broker_connection_timeout=3,
    task_publish_retry=False,
    broker_transport_options={
        'socket_connect_timeout': 2,
        'socket_timeout': 2,
        'retry_on_timeout': False,
    },
    result_backend_transport_options={
        'socket_connect_timeout': 2,
        'socket_timeout': 2,
        'retry_on_timeout': False,
    },
)

# Task routing configuration
celery_app.conf.task_routes = {
    'app.tasks.pipeline_tasks.run_interview_pipeline_task': {'queue': 'default'},
}

# Task defaults
celery_app.conf.task_default_queue = 'default'
celery_app.conf.task_default_exchange = 'tasks'
celery_app.conf.task_default_routing_key = 'task.default'
