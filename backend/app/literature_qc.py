import json
import os
from json import JSONDecodeError
from typing import Any, Literal

import httpx

from .schemas import LiteratureQC, LiteratureReference
from .tavily_client import TavilySearchResult, search_literature, search_protocols

NoveltySignal = Literal["not_found", "similar_work_exists", "exact_match_found"]


def _dedupe_results(results: list[TavilySearchResult]) -> list[TavilySearchResult]:
    seen: set[str] = set()
    unique: list[TavilySearchResult] = []
    for result in sorted(results, key=lambda item: item["score"], reverse=True):
        key = result["url"] or result["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(result)
    return unique


def _to_reference(result: TavilySearchResult) -> LiteratureReference:
    evidence_type = "mock search result" if result["mock"] else f"{result['source_type']} search result"
    return LiteratureReference(
        title=result["title"],
        url=result["url"],
        source=result["source_type"],
        relevance_reason=result["snippet"] or result["content"],
        evidence_type=evidence_type,
    )


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


def _heuristic_classification(results: list[TavilySearchResult], mock: bool) -> tuple[NoveltySignal, float, str]:
    scores = [result["score"] for result in results]
    top_score = max(scores, default=0)
    strong_hits = sum(score >= 0.62 for score in scores)
    has_protocol_hit = any(result["source_type"] == "protocol" and result["score"] >= 0.55 for result in results)

    if mock:
        return (
            "similar_work_exists",
            0.62,
            "Demo mode is using mock Tavily results. Treat the result as an illustrative similar-work signal.",
        )

    if top_score >= 0.9 and strong_hits >= 2 and has_protocol_hit:
        return (
            "exact_match_found",
            0.82,
            "Top literature and protocol results are highly similar. Marked exact only because multiple strong hits suggest close overlap.",
        )

    if top_score >= 0.55 or strong_hits >= 1:
        return (
            "similar_work_exists",
            min(0.78, 0.5 + top_score / 3),
            "Search found adjacent papers or protocols. This is conservative similar-work evidence until intervention, system, outcome, and method are reviewed.",
        )

    return (
        "not_found",
        0.66,
        "Only broad topic-level overlap was found in the fast search pass.",
    )


def _llm_classification(hypothesis: str, results: list[TavilySearchResult]) -> tuple[NoveltySignal, float, str] | None:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "gemma3")
    compact_results = [
        {
            "title": result["title"],
            "url": result["url"],
            "snippet": result["snippet"],
            "score": result["score"],
            "source_type": result["source_type"],
        }
        for result in results[:5]
    ]
    prompt = f"""
Classify novelty for this scientific hypothesis using conservative rules.

Hypothesis:
{hypothesis}

Search results:
{json.dumps(compact_results)}

Allowed novelty_signal values:
- exact_match_found
- similar_work_exists
- not_found

Rules:
- exact_match_found only if intervention, organism/system, outcome, and method are all very close.
- similar_work_exists if 2-3 of those components match.
- not_found if only the broad topic matches.

Return only JSON:
{{"novelty_signal":"...", "confidence":0.0, "summary":"short explanation for a frontend panel"}}
""".strip()

    try:
        response = httpx.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1},
            },
            timeout=8,
        )
        response.raise_for_status()
        raw = response.json().get("response", "")
        parsed = _extract_json(raw)
        signal = parsed.get("novelty_signal")
        if signal not in {"not_found", "similar_work_exists", "exact_match_found"}:
            return None
        confidence = max(0, min(1, float(parsed.get("confidence", 0.6))))
        summary = str(parsed.get("summary") or "Novelty classified from literature and protocol search results.")
        return signal, confidence, summary
    except Exception:
        return None


def assess_literature_qc(
    hypothesis: str,
    domain: str | None = None,
    constraints: str | None = None,
) -> LiteratureQC:
    search_text = " ".join(part for part in [domain, hypothesis, constraints] if part)
    results = _dedupe_results(search_literature(search_text) + search_protocols(search_text))
    best_results = results[:3]
    mock = any(result["mock"] for result in best_results)

    classified = _llm_classification(hypothesis, best_results)
    if classified is None:
        classified = _heuristic_classification(best_results, mock)

    signal, confidence, summary = classified
    if mock and "mock" not in summary.lower():
        summary = f"{summary} Mock Tavily data is being used because live search is unavailable."

    return LiteratureQC(
        novelty_signal=signal,
        confidence=round(confidence, 2),
        summary=summary,
        references=[_to_reference(result) for result in best_results],
    )

