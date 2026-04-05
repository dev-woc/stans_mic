import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

celery_app = Celery(
    "distill",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.pipeline_tasks", "tasks.ingestion_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,          # re-queue on worker crash
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1, # one task at a time per worker
    task_soft_time_limit=120,     # 2 min soft limit
    task_time_limit=180,          # 3 min hard limit
)
