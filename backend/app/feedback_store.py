import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from .schemas import FeedbackRecord, ScientistFeedback


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
FEEDBACK_FILE = DATA_DIR / "feedback.json"


def _read_records() -> list[dict]:
    DATA_DIR.mkdir(exist_ok=True)
    if not FEEDBACK_FILE.exists():
        return []
    return json.loads(FEEDBACK_FILE.read_text())


def _write_records(records: list[dict]) -> None:
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
