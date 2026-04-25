import json
from datetime import UTC, datetime
from json import JSONDecodeError
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError

from . import databricks_workspace_store
from .schemas import (
    ExecutionPlan,
    ExecutionTask,
    ExecutionTaskSection,
    ExperimentPlan,
    InviteExecutorsResponse,
    UpdateTaskRequest,
)


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
EXECUTION_FILE = DATA_DIR / "execution_plans.json"

SAFETY_NOTICE = (
    "This workspace is for planning and coordination only. Do not begin regulated, hazardous, "
    "clinical, animal, human-subject, gene-editing, or chemical-risk work without appropriate "
    "PI and institutional approval."
)

SECTIONS: tuple[ExecutionTaskSection, ...] = (
    "Preparation",
    "Design Review",
    "Materials and Logistics",
    "Execution Tracking",
    "Validation and Analysis",
    "Safety and Compliance",
    "Final Review",
)

LEGACY_SECTION_MAP = {
    "Experimental Design Review": "Design Review",
    "Materials and Resources": "Materials and Logistics",
    "Timeline": "Execution Tracking",
    "Validation": "Validation and Analysis",
    "Risks and Safety": "Safety and Compliance",
}


class ExecutionStoreError(RuntimeError):
    pass


class ExecutionPlanNotFoundError(LookupError):
    pass


class ExecutionTaskNotFoundError(LookupError):
    pass


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _read_records() -> list[dict]:
    if databricks_workspace_store.configured():
        try:
            payload = databricks_workspace_store.read_json([])
            if not isinstance(payload, list):
                raise ExecutionStoreError("Databricks execution plan storage must contain a JSON list")
            return payload
        except Exception as exc:
            databricks_workspace_store.warn_remote_failure("read", exc)

    DATA_DIR.mkdir(exist_ok=True)
    if not EXECUTION_FILE.exists():
        return []

    try:
        payload = json.loads(EXECUTION_FILE.read_text())
    except JSONDecodeError as exc:
        raise ExecutionStoreError("Execution plan storage is corrupted JSON") from exc
    except OSError as exc:
        raise ExecutionStoreError("Execution plan storage could not be read") from exc

    if not isinstance(payload, list):
        raise ExecutionStoreError("Execution plan storage must contain a JSON list")

    return payload


def _write_records(records: list[dict]) -> None:
    if databricks_workspace_store.configured():
        try:
            databricks_workspace_store.write_json(records)
            return
        except Exception as exc:
            databricks_workspace_store.warn_remote_failure("write", exc)

    DATA_DIR.mkdir(exist_ok=True)
    try:
        EXECUTION_FILE.write_text(json.dumps(records, indent=2))
    except OSError as exc:
        raise ExecutionStoreError("Execution plan storage could not be written") from exc


def _load_plan(record: dict) -> ExecutionPlan:
    try:
        normalized_record = dict(record)
        raw_tasks = normalized_record.get("tasks", {})
        if isinstance(raw_tasks, dict):
            normalized_tasks = {}
            for section, tasks in raw_tasks.items():
                normalized_tasks[LEGACY_SECTION_MAP.get(section, section)] = tasks
            normalized_record["tasks"] = normalized_tasks
        return ExecutionPlan(**normalized_record)
    except ValidationError as exc:
        raise ExecutionStoreError("Execution plan storage contains invalid records") from exc


def _task(task_id: str, section: ExecutionTaskSection, title: str, description: str) -> ExecutionTask:
    return ExecutionTask(
        task_id=task_id,
        section=section,
        title=title,
        description=description,
        updated_at=_now(),
    )


def _source_summary(plan: ExperimentPlan) -> str:
    return (
        f"{plan.title}. {plan.executive_summary.content} "
        f"Confidence note: {plan.confidence_notes.content}"
    )


def _material_focus(plan: ExperimentPlan) -> str:
    if not plan.materials.content:
        return "required resources"
    return ", ".join(item.item for item in plan.materials.content[:2])


def _timeline_focus(plan: ExperimentPlan) -> str:
    if not plan.timeline.content:
        return "scheduled milestones"
    return ", ".join(item.phase for item in plan.timeline.content[:2])


def _validation_focus(plan: ExperimentPlan) -> str:
    if not plan.validation.content:
        return "validation targets"
    return ", ".join(item.metric for item in plan.validation.content[:2])


def _risk_focus(plan: ExperimentPlan) -> str:
    combined = [*plan.risks_and_assumptions.content, *plan.safety_and_ethics_notes.content]
    if not combined:
        return "documented risks and approvals"
    return combined[0]


def _build_tasks(plan: ExperimentPlan) -> dict[ExecutionTaskSection, list[ExecutionTask]]:
    materials_focus = _material_focus(plan)
    timeline_focus = _timeline_focus(plan)
    validation_focus = _validation_focus(plan)
    risk_focus = _risk_focus(plan)

    return {
        "Preparation": [
            _task(
                "preparation-1",
                "Preparation",
                "Confirm PI approval",
                "Done when the responsible scientist or PI has approved this plan for coordination use.",
            ).model_copy(update={"status": "needs_review"}),
            _task(
                "preparation-2",
                "Preparation",
                "Assign execution roles",
                "Done when an owner, executor, and reviewer are named in the workspace.",
            ),
            _task(
                "preparation-3",
                "Preparation",
                "Open the execution log",
                "Done when the team has a shared place to record updates, deviations, and observations.",
            ),
        ],
        "Design Review": [
            _task(
                "design-review-2",
                "Design Review",
                "Confirm study objective",
                "Done when the executor can restate the hypothesis and intended outcome in one short summary.",
            ),
            _task(
                "design-review-3",
                "Design Review",
                "Confirm controls and validation criteria",
                f"Done when the team has agreed how controls and success checks will be judged for {validation_focus}.",
            ),
            _task(
                "design-review-4",
                "Design Review",
                "Flag open assumptions",
                "Done when unresolved assumptions or scope questions are logged for review.",
            ),
        ],
        "Materials and Logistics": [
            _task(
                "materials-1",
                "Materials and Logistics",
                "Confirm materials availability",
                f"Done when availability or sourcing is confirmed for {materials_focus}.",
            ),
            _task(
                "materials-2",
                "Materials and Logistics",
                "Confirm logistics and timing",
                f"Done when scheduling and dependencies are clear for {timeline_focus}.",
            ),
            _task(
                "materials-3",
                "Materials and Logistics",
                "Confirm budget coverage",
                "Done when funding, purchasing, or internal approvals are sufficient for the planned work.",
            ),
        ],
        "Execution Tracking": [
            _task(
                "execution-1",
                "Execution Tracking",
                "Track milestone progress",
                "Done when current status is recorded for each major milestone in the workspace.",
            ),
            _task(
                "execution-2",
                "Execution Tracking",
                "Record deviations",
                "Done when any scope, timing, or resource deviations are logged with date and owner.",
            ),
            _task(
                "execution-3",
                "Execution Tracking",
                "Upload observations",
                "Done when non-procedural observations, outputs, or notes are captured for the team.",
            ),
        ],
        "Validation and Analysis": [
            _task(
                "validation-1",
                "Validation and Analysis",
                "Confirm validation plan",
                f"Done when validation checks are defined for {validation_focus}.",
            ),
            _task(
                "validation-2",
                "Validation and Analysis",
                "Review analysis readiness",
                "Done when analysis owners, required outputs, and review expectations are documented.",
            ),
            _task(
                "validation-3",
                "Validation and Analysis",
                "Capture review-ready evidence",
                "Done when observations and supporting outputs are organized for scientist review.",
            ),
        ],
        "Safety and Compliance": [
            _task(
                "safety-1",
                "Safety and Compliance",
                "Review safety requirements",
                f"Done when the team has reviewed safety considerations, including: {risk_focus}",
            ),
            _task(
                "safety-2",
                "Safety and Compliance",
                "Confirm required approvals",
                "Done when any PI, institutional, or program approvals are identified and tracked before work proceeds.",
            ).model_copy(update={"status": "needs_review"}),
            _task(
                "safety-3",
                "Safety and Compliance",
                "Escalate regulated work",
                "Done when regulated, hazardous, clinical, animal, human-subject, gene-editing, or chemical-risk work has been escalated for approval.",
            ),
        ],
        "Final Review": [
            _task(
                "final-review-1",
                "Final Review",
                "Request PI review",
                "Done when the scientist or PI has been asked to review the execution record and outcomes.",
            ).model_copy(update={"status": "needs_review"}),
            _task(
                "final-review-2",
                "Final Review",
                "Confirm completion notes",
                "Done when final notes, unresolved questions, and next steps are documented.",
            ),
            _task(
                "final-review-3",
                "Final Review",
                "Close the workspace",
                "Done when the plan is ready to archive or continue with a new review cycle.",
            ),
        ],
    }


def create_execution_plan(source_plan: ExperimentPlan, creator_email: str | None = None, executor_emails: list[str] | None = None) -> ExecutionPlan:
    records = _read_records()
    timestamp = _now()
    plan = ExecutionPlan(
        plan_id=str(uuid4()),
        title=f"Execution Plan: {source_plan.title}",
        hypothesis=source_plan.hypothesis,
        creator_email=creator_email,
        executor_emails=executor_emails or [],
        tasks=_build_tasks(source_plan),
        source_plan_summary=_source_summary(source_plan),
        safety_notice=SAFETY_NOTICE,
        created_at=timestamp,
        updated_at=timestamp,
    )
    records.insert(0, plan.model_dump())
    _write_records(records)
    return plan


def get_execution_plan(plan_id: str) -> ExecutionPlan:
    for record in _read_records():
        plan = _load_plan(record)
        if plan.plan_id == plan_id:
            return plan
    raise ExecutionPlanNotFoundError(plan_id)


def update_execution_task(plan_id: str, task_id: str, update: UpdateTaskRequest) -> ExecutionPlan:
    records = _read_records()

    for record_index, record in enumerate(records):
        plan = _load_plan(record)
        if plan.plan_id != plan_id:
            continue

        updated_tasks: dict[ExecutionTaskSection, list[ExecutionTask]] = {}
        found_task = False
        changed = False

        for section, tasks in plan.tasks.items():
            updated_tasks[section] = []
            for task in tasks:
                if task.task_id != task_id:
                    updated_tasks[section].append(task)
                    continue

                found_task = True
                task_update = {}
                if update.status is not None:
                    task_update["status"] = update.status
                if update.assignee is not None:
                    task_update["assignee"] = update.assignee
                if update.notes is not None:
                    task_update["notes"] = update.notes

                if task_update:
                    task_update["updated_at"] = _now()
                    changed = True
                updated_tasks[section].append(task.model_copy(update=task_update))

        if not found_task:
            raise ExecutionTaskNotFoundError(task_id)

        if not changed:
            return plan

        updated_plan = plan.model_copy(update={"tasks": updated_tasks, "status": "in_progress", "updated_at": _now()})
        records[record_index] = updated_plan.model_dump()
        _write_records(records)
        return updated_plan

    raise ExecutionPlanNotFoundError(plan_id)


def invite_executors(plan_id: str, executor_emails: list[str], share_url: str) -> InviteExecutorsResponse:
    records = _read_records()

    for record_index, record in enumerate(records):
        plan = _load_plan(record)
        if plan.plan_id != plan_id:
            continue

        merged_emails = list(dict.fromkeys([*plan.executor_emails, *executor_emails]))
        updated_plan = plan.model_copy(update={"executor_emails": merged_emails, "updated_at": _now()})
        records[record_index] = updated_plan.model_dump()
        _write_records(records)

        subject = f"Invitation: {updated_plan.title}"
        body = (
            f"You have been invited to contribute to an AI SciBuddy execution workspace.\n\n"
            f"Plan: {updated_plan.title}\n"
            f"Hypothesis: {updated_plan.hypothesis}\n\n"
            f"Open the shared workspace: {share_url}\n\n"
            f"{updated_plan.safety_notice}"
        )
        return InviteExecutorsResponse(
            invited_emails=executor_emails,
            share_url=share_url,
            email_subject=subject,
            email_body=body,
        )

    raise ExecutionPlanNotFoundError(plan_id)
