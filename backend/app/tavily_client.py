import os
from typing import Any, Literal, TypedDict

from tavily import TavilyClient


SourceType = Literal["literature", "protocol", "materials", "validation"]


class TavilySearchResult(TypedDict):
    title: str
    url: str
    content: str
    snippet: str
    score: float
    source_type: SourceType
    mock: bool


MOCK_RESULTS: dict[SourceType, list[TavilySearchResult]] = {
    "literature": [
        {
            "title": "Mitochondrial recovery after stress in aged fibroblast models",
            "url": "https://example.org/aged-fibroblast-mitochondria",
            "content": "Mock literature result describing adjacent work on mitochondrial stress recovery, senescence markers, and fibroblast aging models.",
            "snippet": "Adjacent paper-style result for novelty comparison in aged fibroblast stress recovery.",
            "score": 0.78,
            "source_type": "literature",
            "mock": True,
        },
        {
            "title": "Senolytic priming and cellular stress response review",
            "url": "https://example.org/senolytic-stress-review",
            "content": "Mock review result connecting senolytic pretreatment, cellular resilience, and mechanistic endpoint selection.",
            "snippet": "Review-style result for similar mechanisms and endpoint selection.",
            "score": 0.67,
            "source_type": "literature",
            "mock": True,
        },
    ],
    "protocol": [
        {
            "title": "High-level oxidative stress assay protocol overview",
            "url": "https://www.bio-protocol.org/example-oxidative-stress-overview",
            "content": "Mock protocol result summarizing safe, high-level design considerations for oxidative stress experiments and controls.",
            "snippet": "Protocol-style result with controls, replicates, and readout planning.",
            "score": 0.73,
            "source_type": "protocol",
            "mock": True,
        },
        {
            "title": "Cellular senescence workflow overview",
            "url": "https://www.protocols.io/example-senescence-workflow",
            "content": "Mock protocols.io-style workflow result for senescence marker planning without operational detail.",
            "snippet": "Workflow result for senescence marker and QC planning.",
            "score": 0.64,
            "source_type": "protocol",
            "mock": True,
        },
    ],
    "materials": [
        {
            "title": "Commercial assay and reagent sourcing overview",
            "url": "https://www.thermofisher.com/example-mitochondrial-assay",
            "content": "Mock supplier result for selecting validated assay kits, controls, and sample preparation materials.",
            "snippet": "Supplier-style result for assay kit and reagent budgeting.",
            "score": 0.71,
            "source_type": "materials",
            "mock": True,
        },
        {
            "title": "Reference cell model sourcing page",
            "url": "https://www.atcc.org/example-fibroblast-model",
            "content": "Mock ATCC-style source result for matched biological model procurement considerations.",
            "snippet": "Supplier-style result for sourcing matched experimental models.",
            "score": 0.63,
            "source_type": "materials",
            "mock": True,
        },
    ],
    "validation": [
        {
            "title": "Orthogonal validation methods for mitochondrial function",
            "url": "https://example.org/mitochondrial-validation-methods",
            "content": "Mock validation result describing endpoint triangulation with primary, orthogonal, and QC measurements.",
            "snippet": "Validation-method result for triangulating mitochondrial recovery endpoints.",
            "score": 0.76,
            "source_type": "validation",
            "mock": True,
        },
        {
            "title": "Replicate-level analysis and assay quality controls",
            "url": "https://example.org/assay-quality-controls",
            "content": "Mock validation result focused on replicate consistency, control performance, and predefined success thresholds.",
            "snippet": "Validation result for replicate consistency and QC thresholds.",
            "score": 0.66,
            "source_type": "validation",
            "mock": True,
        },
    ],
}


def _client() -> TavilyClient | None:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return None
    return TavilyClient(api_key=api_key)


def _normalize_result(item: dict[str, Any], source_type: SourceType, mock: bool = False) -> TavilySearchResult:
    content = item.get("content") or item.get("snippet") or "No snippet returned."
    return {
        "title": item.get("title") or "Untitled result",
        "url": item.get("url") or "#",
        "content": content,
        "snippet": content[:280],
        "score": float(item.get("score") or 0),
        "source_type": source_type,
        "mock": mock,
    }


def _run_search(query: str, source_type: SourceType, max_results: int = 6) -> list[TavilySearchResult]:
    client = _client()
    if client is None:
        return MOCK_RESULTS[source_type]

    try:
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=False,
            include_raw_content=False,
        )
        results = [_normalize_result(item, source_type) for item in response.get("results", [])]
        return results or MOCK_RESULTS[source_type]
    except Exception:
        return MOCK_RESULTS[source_type]


def search_literature(hypothesis: str) -> list[TavilySearchResult]:
    query = f'"{hypothesis}" OR similar scientific paper hypothesis mechanism novelty'
    return _run_search(query, "literature")


def search_protocols(hypothesis: str) -> list[TavilySearchResult]:
    query = (
        f'{hypothesis} protocol site:protocols.io OR site:bio-protocol.org '
        "OR site:nature.com/nprot OR site:jove.com OR site:openwetware.org"
    )
    return _run_search(query, "protocol")


def search_materials(hypothesis: str) -> list[TavilySearchResult]:
    query = (
        f'{hypothesis} materials reagents supplier Thermo Fisher Sigma Aldrich Promega '
        "Qiagen ATCC Addgene IDT"
    )
    return _run_search(query, "materials")


def search_validation_methods(hypothesis: str) -> list[TavilySearchResult]:
    query = f"{hypothesis} validation method assay endpoint measurement controls reproducibility"
    return _run_search(query, "validation")

