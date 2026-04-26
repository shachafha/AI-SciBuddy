import json
from json import JSONDecodeError
from typing import Any, Literal

from .llm_client import databricks_prompt
from .schemas import LiteratureQC, LiteratureReference, ParsedHypothesis, ReferenceRubricScore, TavilyEvidence
from .tavily_client import TavilySearchResult, search_all_targets

NoveltySignal = Literal["not_found", "similar_work_exists", "exact_match_found"]
Classification = tuple[NoveltySignal, float, str, list[ReferenceRubricScore]]


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


def _component_score(value: str | None, result: TavilySearchResult) -> int:
    if not value:
        return 0
    haystack = f"{result['title']} {result['content']} {result['snippet']}".lower()
    terms = [term for term in re_split_terms(value) if len(term) > 3]
    if not terms:
        return 0
    hits = sum(1 for term in terms if term in haystack)
    if hits >= max(2, len(terms) // 2):
        return 2
    if hits:
        return 1
    return 0


def re_split_terms(value: str) -> list[str]:
    return [term.strip().lower() for term in value.replace("-", " ").replace("/", " ").split() if term.strip()]


def _heuristic_rubric(results: list[TavilySearchResult], parsed: ParsedHypothesis) -> list[ReferenceRubricScore]:
    scores: list[ReferenceRubricScore] = []
    for result in results:
        intervention = _component_score(parsed.intervention, result)
        system = _component_score(parsed.system, result)
        outcome = _component_score(parsed.measurable_outcome, result)
        method = 2 if result["source_type"] == "protocol" else _component_score(parsed.mechanism, result)
        if method == 0 and result["source_type"] in {"exact_hypothesis", "similar_paper"}:
            method = 1
        threshold_control = max(
            _component_score(parsed.threshold, result),
            _component_score(parsed.control_condition, result),
        )
        total = intervention + system + outcome + method + threshold_control
        scores.append(
            ReferenceRubricScore(
                title=result["title"],
                url=result["url"],
                intervention_match=intervention,
                system_match=system,
                outcome_match=outcome,
                method_protocol_match=method,
                threshold_control_match=threshold_control,
                total=total,
                rationale="Heuristic fallback score based on overlap with parsed hypothesis components.",
            )
        )
    return scores


def _signal_from_total(best_total: int) -> NoveltySignal:
    if best_total >= 8:
        return "exact_match_found"
    if best_total >= 4:
        return "similar_work_exists"
    return "not_found"


def _heuristic_classification(results: list[TavilySearchResult], parsed: ParsedHypothesis, mock: bool) -> Classification:
    rubric = _heuristic_rubric(results, parsed)
    best_total = max((score.total for score in rubric), default=0)
    signal = _signal_from_total(best_total)
    confidence = min(0.9, 0.45 + best_total / 20)

    if mock:
        return (
            signal,
            max(confidence, 0.62),
            f"Demo mode is using mock Tavily results. Best rubric score is {best_total}/10.",
            rubric,
        )

    return (
        signal,
        confidence,
        f"Best reference scored {best_total}/10 using the intervention/system/outcome/method/threshold-control rubric.",
        rubric,
    )


def _llm_classification(hypothesis: str, parsed_hypothesis: ParsedHypothesis, results: list[TavilySearchResult]) -> Classification | None:
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

Parsed hypothesis:
{parsed_hypothesis.model_dump_json()}

Search results:
{json.dumps(compact_results)}

Allowed novelty_signal values:
- exact_match_found
- similar_work_exists
- not_found

Score each top reference with this rubric:
- intervention_match: 0-2
- system_match: 0-2
- outcome_match: 0-2
- method_protocol_match: 0-2
- threshold_control_match: 0-2

Total score rules:
- 8-10 = exact_match_found
- 4-7 = similar_work_exists
- 0-3 = not_found

Conservative rule:
- exact_match_found only if intervention, system/model/material, outcome, and method/protocol are all very close.

Return only JSON:
{{
  "novelty_signal":"...",
  "confidence":0.0,
  "summary":"short explanation for a frontend panel",
  "reference_scores":[
    {{
      "title":"must match a search result title",
      "url":"must match a search result url",
      "intervention_match":0,
      "system_match":0,
      "outcome_match":0,
      "method_protocol_match":0,
      "threshold_control_match":0,
      "total":0,
      "rationale":"brief reason for this score"
    }}
  ]
}}
""".strip()

    try:
        raw = databricks_prompt(prompt, temperature=0.1, timeout=8)
        if raw is None:
            return None
        parsed = _extract_json(raw)
        signal = parsed.get("novelty_signal")
        if signal not in {"not_found", "similar_work_exists", "exact_match_found"}:
            return None
        confidence = max(0, min(1, float(parsed.get("confidence", 0.6))))
        summary = str(parsed.get("summary") or "Novelty classified from literature and protocol search results.")
        reference_scores = [ReferenceRubricScore(**item) for item in parsed.get("reference_scores", [])]
        if not reference_scores:
            return None
        best_total = max(score.total for score in reference_scores)
        expected_signal = _signal_from_total(best_total)
        if signal != expected_signal:
            signal = expected_signal
        return signal, confidence, summary, reference_scores
    except Exception:
        return None


def assess_literature_qc(
    hypothesis: str,
    domain: str | None = None,
    constraints: str | None = None,
) -> LiteratureQC:
    parsed, _queries, results = search_all_targets(hypothesis, domain)
    literature_results = [
        result
        for result in results
        if result["source_type"] in {"exact_hypothesis", "similar_paper", "literature", "protocol"}
    ]
    best_results = _dedupe_results(literature_results)[:3]
    mock = any(result["mock"] for result in best_results)

    classified = _llm_classification(hypothesis, parsed, best_results)
    if classified is None:
        classified = _heuristic_classification(best_results, parsed, mock)

    signal, confidence, summary, reference_scores = classified
    if mock and "mock" not in summary.lower():
        summary = f"{summary} Mock Tavily data is being used because live search is unavailable."

    scored_urls = {score.url for score in reference_scores}
    scored_titles = {score.title for score in reference_scores}

    for result in _dedupe_results(results):
        if result["url"] not in scored_urls and result["title"] not in scored_titles:
            fallback_score = _heuristic_rubric([result], parsed)[0]
            reference_scores.append(fallback_score)
            scored_urls.add(fallback_score.url)
            scored_titles.add(fallback_score.title)

    return LiteratureQC(
        novelty_signal=signal,
        confidence=round(confidence, 2),
        summary=summary,
        references=[_to_reference(result) for result in best_results],
        reference_scores=reference_scores,
        parsed_hypothesis=parsed,
        search_results=[TavilyEvidence(**result) for result in _dedupe_results(results)],
    )
