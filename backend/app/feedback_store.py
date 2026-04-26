import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from . import databricks_workspace_store
from .schemas import FeedbackRecord, ScientistFeedback

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
FEEDBACK_FILE = DATA_DIR / "feedback.json"
DATABRICKS_FEEDBACK_PATH = databricks_workspace_store.DEFAULT_FEEDBACK_STORE_PATH


def _read_records() -> list[dict]:
    if databricks_workspace_store.configured():
        try:
            payload = databricks_workspace_store.read_json([], path=DATABRICKS_FEEDBACK_PATH)
            if not isinstance(payload, list):
                raise ValueError("Databricks feedback storage must contain a JSON list")
            return payload
        except Exception as exc:
            logger.warning("Databricks feedback store read failed; using local fallback: %s", exc)

    DATA_DIR.mkdir(exist_ok=True)
    if not FEEDBACK_FILE.exists():
        return []
    try:
        return json.loads(FEEDBACK_FILE.read_text())
    except Exception as exc:
        logger.warning("Local feedback store read failed: %s", exc)
        return []


def _write_records(records: list[dict]) -> None:
    if databricks_workspace_store.configured():
        try:
            databricks_workspace_store.write_json(records, path=DATABRICKS_FEEDBACK_PATH)
            return
        except Exception as exc:
            logger.warning("Databricks feedback store write failed; using local fallback: %s", exc)

    DATA_DIR.mkdir(exist_ok=True)
    FEEDBACK_FILE.write_text(json.dumps(records, indent=2))


def add_feedback(feedback: ScientistFeedback) -> FeedbackRecord:
    records = _read_records()
    record = FeedbackRecord(
        id=str(uuid4()),
        created_at=datetime.now(UTC).isoformat(),
        **feedback.model_dump(),
    )
    records.insert(0, record.model_dump())
    _write_records(records)
    return record


def list_feedback() -> list[FeedbackRecord]:
    return [FeedbackRecord(**record) for record in _read_records()]


def get_relevant_feedback(hypothesis: str, parsed_domain: str, experiment_type: str) -> list[FeedbackRecord]:
    records = list_feedback()

    hyp_words = set(hypothesis.lower().split())

    scored_records = []
    for r in records:
        score = 0
        if parsed_domain and r.parsed_domain and parsed_domain.lower() == r.parsed_domain.lower():
            score += 10

        if r.hypothesis:
            r_words = set(r.hypothesis.lower().split())
            overlap = len(hyp_words.intersection(r_words))
            score += overlap

        if score > 0:
            scored_records.append((score, r))

    scored_records.sort(key=lambda x: x[0], reverse=True)
    return [r for score, r in scored_records[:3]]
