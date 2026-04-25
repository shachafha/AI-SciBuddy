import logging
import os
import re
from typing import Any, Literal, TypedDict

from tavily import TavilyClient

from .schemas import ParsedHypothesis


logger = logging.getLogger("ai_scibuddy.tavily")

SourceType = Literal[
    "literature",
    "exact_hypothesis",
    "similar_paper",
    "protocol",
    "materials",
    "validation",
    "safety",
]


class TavilySearchResult(TypedDict):
    title: str
    url: str
    content: str
    snippet: str
    score: float
    source_type: SourceType
    mock: bool
    query: str


class GeneratedQueries(TypedDict):
    exact_hypothesis: str
    similar_paper: str
    protocol: str
    materials: str
    validation: str
    safety: str


SUPPLIER_TERMS = "Thermo Fisher Sigma Aldrich Promega Qiagen ATCC Addgene IDT"
PROTOCOL_SITES = "site:protocols.io OR site:bio-protocol.org OR site:nature.com/nprot OR site:jove.com OR site:openwetware.org"


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
            "query": "mock literature query",
        },
    ],
    "exact_hypothesis": [
        {
            "title": "Exact phrase search returned no direct duplicate",
            "url": "https://example.org/exact-hypothesis-search",
            "content": "Mock exact-query result showing no direct title-level duplicate, but enough adjacent terminology for review.",
            "snippet": "No direct duplicate found in demo mode; adjacent terminology requires PI review.",
            "score": 0.52,
            "source_type": "exact_hypothesis",
            "mock": True,
            "query": "mock exact hypothesis query",
        },
    ],
    "similar_paper": [
        {
            "title": "Senolytic priming and cellular stress response review",
            "url": "https://example.org/senolytic-stress-review",
            "content": "Mock similar-paper result connecting intervention, cellular system, mechanism, and endpoint selection.",
            "snippet": "Similar paper-style result for overlap across intervention, system, mechanism, and outcome.",
            "score": 0.74,
            "source_type": "similar_paper",
            "mock": True,
            "query": "mock similar paper query",
        },
    ],
    "protocol": [
        {
            "title": "High-level oxidative stress assay protocol overview",
            "url": "https://www.bio-protocol.org/example-oxidative-stress-overview",
            "content": "Mock protocol result summarizing safe, high-level design considerations for controls, replicates, and readout planning.",
            "snippet": "Protocol-style result with controls, replicates, and readout planning.",
            "score": 0.73,
            "source_type": "protocol",
            "mock": True,
            "query": "mock protocol repository query",
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
            "query": "mock supplier material query",
        },
    ],
    "validation": [
        {
            "title": "Orthogonal validation methods for mitochondrial function",
            "url": "https://example.org/mitochondrial-validation-methods",
            "content": "Mock validation result describing endpoint triangulation with primary, orthogonal, and QC measurements.",
            "snippet": "Validation-method result for triangulating endpoint recovery.",
            "score": 0.76,
            "source_type": "validation",
            "mock": True,
            "query": "mock validation assay query",
        },
    ],
    "safety": [
        {
            "title": "Institutional safety and ethics review considerations",
            "url": "https://example.org/safety-ethics-review",
            "content": "Mock safety result describing institutional approval, biosafety, chemical safety, procurement, and human/animal subject review gates.",
            "snippet": "Safety and ethics review gates for PI approval before experimental execution.",
            "score": 0.69,
            "source_type": "safety",
            "mock": True,
            "query": "mock safety ethics regulatory query",
        },
    ],
}


def _first_match(patterns: list[str], text: str) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip(" .,;:")
    return None


def _infer_domain(text: str, provided_domain: str | None = None) -> str | None:
    if provided_domain:
        return provided_domain
    lowered = text.lower()
    if any(term in lowered for term in ["cell", "hela", "fibroblast", "protein", "serum", "biosensor", "crp"]):
        return "life sciences"
    if any(term in lowered for term in ["solar", "photovoltaic", "chalcogenide", "absorber", "thin-film"]):
        return "materials science"
    if any(term in lowered for term in ["battery", "catalyst", "polymer", "nanoparticle"]):
        return "chemistry and materials"
    return "general science"


def parse_hypothesis(hypothesis: str, domain: str | None = None) -> ParsedHypothesis:
    text = hypothesis.strip()
    intervention = _first_match(
        [
            r"^(?:a|an|the)?\s*(.+?)\s+(?:can|could|will|would|improves?|improve|reduces?|reduce|increases?|increase|enhances?|enhance|detects?|detect)\b",
            r"(?:using|with|via|through)\s+(.+?)\s+(?:can|could|will|would|to|for)\b",
        ],
        text,
    )
    system = _first_match(
        [
            r"\b(?:in|within|from|for)\s+(.+?)\s+(?:compared|versus|vs\.?|by|through|while|can|could|will|would|to)\b",
            r"\b((?:HeLa cells?|cells?|mice|rats|zebrafish|serum samples?|solar cells?|materials?|fibroblasts?)\b[^.]*)",
        ],
        text,
    )
    outcome = _first_match(
        [
            r"\b(?:improves?|increase|increases|reduce|reduces|enhance|enhances|detect|detects|preserving|preserve)\s+(.+?)(?:\s+compared|\s+versus|\s+via|\s+by|\s+through|\.|$)",
            r"\b(?:outcome|endpoint|readout)\s+(?:is|of)?\s*(.+?)(?:\.|$)",
        ],
        text,
    )
    threshold = _first_match(
        [
            r"\b(\d+(?:\.\d+)?\s*(?:%|fold|x|mg/L|ng/mL|uM|µM|mM|hours?|days?|clinically relevant [^.]+))",
            r"\b(clinically relevant [^.]+)",
        ],
        text,
    )
    mechanism = _first_match(
        [
            r"\b(?:via|through|by|because of|mediated by)\s+(.+?)(?:\.|$)",
            r"\b(?:mechanism|pathway)\s+(?:of|is|involves)?\s*(.+?)(?:\.|$)",
        ],
        text,
    )
    control = _first_match(
        [
            r"\b(?:compared with|compared to|versus|vs\.?)\s+(.+?)(?:\.|$)",
            r"\b(?:control condition|control)\s+(?:is|of)?\s*(.+?)(?:\.|$)",
        ],
        text,
    )
    parsed = ParsedHypothesis(
        intervention=intervention,
        system=system,
        measurable_outcome=outcome,
        threshold=threshold,
        mechanism=mechanism,
        control_condition=control,
        domain=_infer_domain(text, domain),
    )
    logger.info("Parsed hypothesis components: %s", parsed.model_dump())
    return parsed


def generate_tavily_queries(hypothesis: str, parsed: ParsedHypothesis) -> GeneratedQueries:
    intervention = parsed.intervention or hypothesis
    system = parsed.system or parsed.domain or hypothesis
    outcome = parsed.measurable_outcome or "measurable outcome"
    mechanism = parsed.mechanism or "mechanism"
    control = parsed.control_condition or "control"
    domain = parsed.domain or "science"
    threshold = f" {parsed.threshold}" if parsed.threshold else ""

    queries: GeneratedQueries = {
        "exact_hypothesis": f'"{hypothesis}" exact scientific paper protocol{threshold}',
        "similar_paper": f'{domain} "{intervention}" "{system}" "{outcome}" "{mechanism}" similar paper prior work',
        "protocol": f'{domain} "{intervention}" "{system}" "{outcome}" protocol {PROTOCOL_SITES}',
        "materials": f'{domain} "{intervention}" "{system}" materials reagents supplier {SUPPLIER_TERMS}',
        "validation": f'{domain} "{outcome}" "{system}" validation assay method measurement "{control}"',
        "safety": f'{domain} "{intervention}" "{system}" safety ethics regulatory biosafety chemical safety institutional approval',
    }
    logger.info("Generated Tavily queries: %s", queries)
    return queries


def _client() -> TavilyClient | None:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        logger.info("TAVILY_API_KEY missing; using mock Tavily results.")
        return None
    return TavilyClient(api_key=api_key)


def _normalize_result(item: dict[str, Any], source_type: SourceType, query: str, mock: bool = False) -> TavilySearchResult:
    content = item.get("content") or item.get("snippet") or "No snippet returned."
    return {
        "title": item.get("title") or "Untitled result",
        "url": item.get("url") or "#",
        "content": content,
        "snippet": content[:280],
        "score": float(item.get("score") or 0),
        "source_type": source_type,
        "mock": mock,
        "query": query,
    }


def _mock_results(source_type: SourceType, query: str) -> list[TavilySearchResult]:
    return [{**result, "query": query} for result in MOCK_RESULTS[source_type]]


def _run_search(query: str, source_type: SourceType, max_results: int = 5) -> list[TavilySearchResult]:
    logger.info("Running Tavily search [%s]: %s", source_type, query)
    client = _client()
    if client is None:
        return _mock_results(source_type, query)

    try:
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=False,
            include_raw_content=False,
        )
        results = [_normalize_result(item, source_type, query) for item in response.get("results", [])]
        return results or _mock_results(source_type, query)
    except Exception as exc:
        logger.warning("Tavily search failed for [%s]; using mock data. Error: %s", source_type, exc)
        return _mock_results(source_type, query)


def search_all_targets(hypothesis: str, domain: str | None = None) -> tuple[ParsedHypothesis, GeneratedQueries, list[TavilySearchResult]]:
    parsed = parse_hypothesis(hypothesis, domain)
    queries = generate_tavily_queries(hypothesis, parsed)
    results: list[TavilySearchResult] = []
    results.extend(_run_search(queries["exact_hypothesis"], "exact_hypothesis", max_results=3))
    results.extend(_run_search(queries["similar_paper"], "similar_paper", max_results=4))
    results.extend(_run_search(queries["protocol"], "protocol", max_results=4))
    results.extend(_run_search(queries["materials"], "materials", max_results=4))
    results.extend(_run_search(queries["validation"], "validation", max_results=4))
    results.extend(_run_search(queries["safety"], "safety", max_results=3))
    logger.info("Tavily targeted search returned %s normalized results.", len(results))
    return parsed, queries, results


def search_literature(hypothesis: str) -> list[TavilySearchResult]:
    parsed = parse_hypothesis(hypothesis)
    queries = generate_tavily_queries(hypothesis, parsed)
    return _run_search(queries["exact_hypothesis"], "exact_hypothesis") + _run_search(queries["similar_paper"], "similar_paper")


def search_protocols(hypothesis: str) -> list[TavilySearchResult]:
    parsed = parse_hypothesis(hypothesis)
    queries = generate_tavily_queries(hypothesis, parsed)
    return _run_search(queries["protocol"], "protocol")


def search_materials(hypothesis: str) -> list[TavilySearchResult]:
    parsed = parse_hypothesis(hypothesis)
    queries = generate_tavily_queries(hypothesis, parsed)
    return _run_search(queries["materials"], "materials")


def search_validation_methods(hypothesis: str) -> list[TavilySearchResult]:
    parsed = parse_hypothesis(hypothesis)
    queries = generate_tavily_queries(hypothesis, parsed)
    return _run_search(queries["validation"], "validation")


def search_safety_ethics(hypothesis: str) -> list[TavilySearchResult]:
    parsed = parse_hypothesis(hypothesis)
    queries = generate_tavily_queries(hypothesis, parsed)
    return _run_search(queries["safety"], "safety")
