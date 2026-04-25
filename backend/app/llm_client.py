import logging
import os

import httpx


DEFAULT_DATABRICKS_BASE_URL = "https://7474660200307946.ai-gateway.cloud.databricks.com/mlflow/v1"
DEFAULT_DATABRICKS_MODEL = "databricks-qwen3-next-80b-a3b-instruct"

logger = logging.getLogger(__name__)


def _databricks_token() -> str | None:
    return (os.getenv("DATABRICKS_TOKEN") or os.getenv("DATABRICS_TOKEN") or "").strip() or None


def databricks_chat_completion(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 5000,
    temperature: float = 0.2,
    timeout: float = 120,
) -> str | None:
    token = _databricks_token()
    if not token:
        logger.info("Databricks LLM not configured; falling back to deterministic response.")
        return None

    base_url = (os.getenv("DATABRICKS_BASE_URL") or DEFAULT_DATABRICKS_BASE_URL).rstrip("/")
    model = os.getenv("DATABRICKS_MODEL") or DEFAULT_DATABRICKS_MODEL

    try:
        logger.info("Calling Databricks LLM model=%s endpoint=%s/chat/completions", model, base_url)
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        logger.info("Databricks LLM call succeeded model=%s", model)
        return content
    except Exception as exc:
        logger.warning("Databricks LLM call failed; falling back to deterministic response: %s", exc)
        return None


def databricks_prompt(
    prompt: str,
    *,
    max_tokens: int = 5000,
    temperature: float = 0.2,
    timeout: float = 120,
) -> str | None:
    return databricks_chat_completion(
        [{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
    )
