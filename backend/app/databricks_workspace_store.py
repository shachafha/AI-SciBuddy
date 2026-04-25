import base64
import json
import logging
import os
from pathlib import PurePosixPath
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_EXECUTION_STORE_PATH = "/Shared/AI-SciBuddy/execution_plans.json"


class DatabricksWorkspaceStoreError(RuntimeError):
    pass


def _token() -> str | None:
    return (os.getenv("DATABRICKS_TOKEN") or os.getenv("DATABRICS_TOKEN") or "").strip() or None


def _host() -> str | None:
    return (os.getenv("DATABRICKS_HOST") or "").strip().rstrip("/") or None


def _headers() -> dict[str, str]:
    token = _token()
    if not token:
        raise DatabricksWorkspaceStoreError("DATABRICKS_TOKEN is not configured")
    return {"Authorization": f"Bearer {token}"}


def configured() -> bool:
    return bool(_host() and _token())


def execution_store_path() -> str:
    return os.getenv("DATABRICKS_EXECUTION_STORE_PATH") or DEFAULT_EXECUTION_STORE_PATH


def _api_url(path: str) -> str:
    host = _host()
    if not host:
        raise DatabricksWorkspaceStoreError("DATABRICKS_HOST is not configured")
    return f"{host}{path}"


def _mkdirs(path: str) -> None:
    parent = str(PurePosixPath(path).parent)
    response = httpx.post(
        _api_url("/api/2.0/workspace/mkdirs"),
        headers=_headers(),
        json={"path": parent},
        timeout=20,
    )
    response.raise_for_status()


def read_json(default: Any) -> Any:
    path = execution_store_path()
    response = httpx.get(
        _api_url("/api/2.0/workspace/export"),
        headers=_headers(),
        params={"path": path, "format": "AUTO"},
        timeout=30,
    )
    if response.status_code == 404 or "RESOURCE_DOES_NOT_EXIST" in response.text:
        return default
    response.raise_for_status()

    payload = response.json()
    raw_content = base64.b64decode(payload.get("content", "")).decode("utf-8")
    if not raw_content.strip():
        return default
    return json.loads(raw_content)


def write_json(payload: Any) -> None:
    path = execution_store_path()
    _mkdirs(path)
    content = json.dumps(payload, indent=2)
    response = httpx.post(
        _api_url("/api/2.0/workspace/import"),
        headers={**_headers(), "Content-Type": "application/json"},
        json={
            "path": path,
            "format": "AUTO",
            "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "overwrite": True,
        },
        timeout=30,
    )
    response.raise_for_status()


def warn_remote_failure(action: str, exc: Exception) -> None:
    logger.warning("Databricks execution plan store %s failed; using local fallback: %s", action, exc)
