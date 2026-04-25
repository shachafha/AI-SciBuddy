# AI-SciBuddy — Project Reference

> **Last synced:** 2026-04-25 · commit `e800c72`
>
> A hackathon demo that turns a scientific hypothesis into a Tavily-backed literature QC report, a rubric-scored novelty signal, and a fully-grounded experiment plan — with a scientist feedback loop.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Repository Layout](#repository-layout)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [User-Facing Workflow](#user-facing-workflow)
7. [Backend Deep-Dive](#backend-deep-dive)
   - [main.py — API Routes](#mainpy--api-routes)
   - [schemas.py — Data Models](#schemaspy--data-models)
   - [tavily_client.py — Search Layer](#tavily_clientpy--search-layer)
   - [literature_qc.py — Novelty Classification](#literature_qcpy--novelty-classification)
   - [plan_generator.py — Experiment Plan Generation](#plan_generatorpy--experiment-plan-generation)
   - [feedback_store.py — Persistence](#feedback_storepy--persistence)
8. [Frontend Deep-Dive](#frontend-deep-dive)
   - [page.tsx — Main Orchestrator](#pagetsx--main-orchestrator)
   - [Components](#components)
   - [lib/ — Utilities & Types](#lib--utilities--types)
9. [Key Data Shapes](#key-data-shapes)
10. [Resilience & Fallback Strategy](#resilience--fallback-strategy)
11. [Safety Design](#safety-design)
12. [What Changed in the Latest Pull (ae6eb5d → e800c72)](#what-changed-in-the-latest-pull)

---

## Overview

AI-SciBuddy converts a **falsifiable scientific hypothesis** into:

| Output | Description |
|--------|-------------|
| **Literature QC** | Tavily search across 6 targeted query types; LLM or heuristic novelty classification |
| **Novelty signal** | `not_found` / `similar_work_exists` / `exact_match_found` with rubric scores (0–10) |
| **Experiment Plan** | Grounded JSON plan with 8 sections, each carrying `content`, `confidence`, `supporting_sources`, and `assumptions` |
| **Feedback loop** | Scientist submits structured corrections; plan can be regenerated with that feedback in context |

Everything degrades gracefully: no Tavily key → mock search results; no Databricks access → deterministic mock plan.

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.115.6 | REST API framework |
| `uvicorn[standard]` | 0.34.0 | ASGI server |
| `pydantic` | 2.10.4 | Schema validation (`extra="forbid"`, generics) |
| `tavily-python` | 0.5.0 | Web search SDK |
| `httpx` | 0.28.1 | Async-capable HTTP client (Databricks AI Gateway calls) |
| `python-dotenv` | 1.0.1 | `.env` loading |

**AI runtime:** Databricks AI Gateway chat completions using Qwen (`databricks-qwen3-next-80b-a3b-instruct`)

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.1.3 | React framework (App Router) |
| `react` / `react-dom` | 19.0.0 | UI |
| `typescript` | 5.7.2 | Type safety |
| `tailwindcss` | 3.4.17 | Styling |
| `lucide-react` | 0.468.0 | Icons |
| `@radix-ui/react-slot` | 1.1.1 | Accessible primitives |
| `class-variance-authority` + `clsx` + `tailwind-merge` | latest | Class utilities |

---

## Repository Layout

```
AI-SciBuddy/
├── .env.example                    # Environment template
├── README.md
├── PROJECT_REFERENCE.md            # ← this file
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app + routes
│       ├── schemas.py              # Pydantic models
│       ├── tavily_client.py        # Search layer (hypothesis parsing + 6-target search)
│       ├── literature_qc.py        # Novelty classification (LLM + heuristic rubric)
│       ├── plan_generator.py       # Experiment plan generation via Databricks/Qwen
│       └── feedback_store.py       # JSON file persistence
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                # Main page orchestrator
    │   └── globals.css
    └── components/
    │   ├── ui.tsx                  # Design system primitives (Button, Card, Badge…)
    │   ├── literature-qc-panel.tsx # Novelty signal + rubric display
    │   ├── experiment-plan-viewer.tsx # 8-tab grounded plan viewer
    │   ├── scientist-review-panel.tsx # Feedback form + history
    │   └── scientific-loader.tsx   # Domain-specific progress loader
    └── lib/
        ├── api.ts                  # Typed fetch wrappers
        ├── types.ts                # TypeScript mirrors of Pydantic schemas
        ├── demo-data.ts            # Offline fixture functions
        └── utils.ts               # cn() helper
```

---

## Environment Variables

```bash
# Copy .env.example → .env at repo root
TAVILY_API_KEY=          # Optional — mock results used if absent
DATABRICKS_HOST=https://dbc-xxxxxxxx-xxxx.cloud.databricks.com
DATABRICKS_TOKEN=
DATABRICKS_BASE_URL=https://7474660200307946.ai-gateway.cloud.databricks.com/mlflow/v1
DATABRICKS_MODEL=databricks-qwen3-next-80b-a3b-instruct
DATABRICKS_EXECUTION_STORE_PATH=/Shared/AI-SciBuddy/execution_plans.json
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:3000
```

## User-Facing Workflow

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1 — Hypothesis Intake                                    │
│  Enter hypothesis + domain + constraints (or pick a sample)    │
└────────────────────────────────┬───────────────────────────────┘
                                 │
                     [Run Literature QC]
                                 │
┌────────────────────────────────▼───────────────────────────────┐
│  Step 2 — Literature QC                                        │
│  • Hypothesis is parsed into components (intervention,         │
│    system, outcome, threshold, mechanism, control)             │
│  • 6 targeted Tavily queries are generated and run             │
│  • LLM (or heuristic) scores each result on a 0–10 rubric     │
│  • Novelty signal returned: not_found / similar_work_exists /  │
│    exact_match_found + confidence bar + references             │
└────────────────────────────────┬───────────────────────────────┘
                                 │
                   [Generate Experiment Plan]
                                 │
┌────────────────────────────────▼───────────────────────────────┐
│  Step 3 — Experiment Plan                                      │
│  • Additional Tavily searches for protocol, materials,         │
│    validation evidence                                         │
│  • Databricks/Qwen generates grounded ExperimentPlan JSON      │
│  • Every section has: content + confidence + sources +         │
│    assumptions (GroundedSection<T> wrapper)                    │
│  • Displayed in 8 tabbed sections                              │
└────────────────────────────────┬───────────────────────────────┘
                                 │
                   [Scientist Review Panel]
                                 │
┌────────────────────────────────▼───────────────────────────────┐
│  Step 4 — Feedback Loop                                        │
│  • PI submits: section, rating (1–5), correction, tags         │
│  • Saved to backend/data/feedback.json                         │
│  • "Regenerate" re-runs Databricks/Qwen with feedback          │
└────────────────────────────────────────────────────────────────┘
```

---

## Backend Deep-Dive

### `main.py` — API Routes

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| `GET` | `/api/health` | `health()` | Liveness check |
| `POST` | `/api/literature-qc` | `literature_qc()` | Parse hypothesis, run 6-target Tavily search, classify novelty |
| `POST` | `/api/generate-plan` | `create_plan()` | Generate `ExperimentPlan` via Databricks/Qwen (or mock) |
| `POST` | `/api/feedback` | `create_feedback()` | Persist `ScientistFeedback` |
| `GET` | `/api/feedback` | `get_feedback()` | List all feedback records |
| `POST` | `/api/regenerate-with-feedback` | `regenerate()` | Re-prompt Databricks/Qwen with current plan + scientist feedback |

**CORS:** `localhost:3000`, `127.0.0.1:3000` + regex pattern for any local port.

---

### `schemas.py` — Data Models

All models use `StrictModel(extra="forbid")` — extra fields are rejected at the API boundary.

#### Key types

```
HypothesisInput              hypothesis + domain? + constraints?
ParsedHypothesis             intervention, system, measurable_outcome,
                             threshold, mechanism, control_condition, domain
TavilyEvidence               title, url, content, snippet, score,
                             source_type, mock, query?
                             source_type ∈ {literature, exact_hypothesis,
                             similar_paper, protocol, materials,
                             validation, safety}
LiteratureReference          title, url, source, relevance_reason, evidence_type
ReferenceRubricScore         title, url, per-component scores (0–2 each),
                             total (0–10), rationale
LiteratureQC                 novelty_signal, confidence, summary,
                             references[], reference_scores[],
                             parsed_hypothesis?, search_results[]
GroundedSection<T>           content: T, confidence, supporting_sources[],
                             assumptions[]
MaterialItem                 item, purpose, supplier_hint, catalog_number,
                             estimated_cost, evidence_url
ExperimentPlan               title, hypothesis
                             executive_summary:  GroundedSection<str>
                             protocol_summary:   GroundedSection<str[]>
                             materials:          GroundedSection<MaterialItem[]>
                             budget:             GroundedSection<BudgetItem[]>
                             timeline:           GroundedSection<TimelineItem[]>
                             validation:         GroundedSection<ValidationItem[]>
                             risks_and_assumptions: GroundedSection<str[]>
                             safety_and_ethics_notes: GroundedSection<str[]>
                             source_trace:       SourceCitation[]
                             confidence_notes:   GroundedSection<str>
ScientistFeedback            plan_id, section, rating (1–5), correction, tags[]
FeedbackRecord               ScientistFeedback + id (UUID) + created_at (ISO)
RegenerateRequest            hypothesis, current_plan, feedback
```

**`GroundedSection<T>`** is the most important architectural change in the latest pull: every section of the plan now carries its own confidence score, list of source URLs, and a list of stated assumptions — enabling the frontend to render per-section provenance badges.

---

### `tavily_client.py` — Search Layer

#### Hypothesis parsing — `parse_hypothesis(hypothesis, domain?)`

Uses regex patterns to extract components from free-text hypothesis:

| Component | Extracted via |
|-----------|--------------|
| `intervention` | Pattern starting with "a/an/the … can/improves…" |
| `system` | "in/within/from … fibroblasts/cells/mice…" |
| `measurable_outcome` | "improves/increases/detects …" |
| `threshold` | Numeric patterns, units, "clinically relevant" |
| `mechanism` | "via/through/by/mediated by …" |
| `control_condition` | "compared with/versus/vs." |
| `domain` | Provided or inferred from keyword matching |

Returns `ParsedHypothesis`.

#### Query generation — `generate_tavily_queries(hypothesis, parsed)`

Generates **6 targeted queries** from parsed components:

| Query key | Description |
|-----------|-------------|
| `exact_hypothesis` | Quoted exact phrase search — looks for a direct duplicate |
| `similar_paper` | Combines intervention + system + outcome + mechanism |
| `protocol` | Scoped to protocols.io, bio-protocol.org, nature.com/nprot, jove.com, openwetware.org |
| `materials` | Targets ThermoFisher, Sigma, Promega, Qiagen, ATCC, Addgene, IDT |
| `validation` | Outcome + system + assay/endpoint/controls/reproducibility |
| `safety` | Intervention + system + safety/ethics/biosafety/institutional approval |

#### Main entry point — `search_all_targets(hypothesis, domain?)`

Runs all 6 searches in sequence, returns `(ParsedHypothesis, GeneratedQueries, list[TavilySearchResult])`.

#### Fallback — `MOCK_RESULTS`

If `TAVILY_API_KEY` is missing or a search throws, realistic mock results are returned for each source type (all marked `mock=True`).

---

### `literature_qc.py` — Novelty Classification

#### Entry point — `assess_literature_qc(hypothesis, domain?, constraints?)`

1. Calls `search_all_targets()` to get parsed hypothesis + all search results
2. Filters to literature-relevant types (`exact_hypothesis`, `similar_paper`, `literature`, `protocol`)
3. Dedupes by URL and takes top 3
4. Tries **LLM classification** first → falls back to **heuristic** if LLM fails
5. Returns full `LiteratureQC` (including `reference_scores`, `parsed_hypothesis`, and all `search_results`)

#### LLM Classification — `_llm_classification()`

- Posts to Databricks AI Gateway `/chat/completions` with 8s timeout
- Prompts Qwen to score each reference on the 5-dimension rubric and return JSON
- Validates the returned `novelty_signal` against `_signal_from_total(best_rubric_total)` — LLM can't override the rubric math

#### Heuristic Classification — `_heuristic_classification()`

- `_heuristic_rubric()` scores each result by counting keyword overlaps with each parsed component
- `_signal_from_total()` maps rubric total → signal:
  - `≥ 8` → `exact_match_found`
  - `4–7` → `similar_work_exists`
  - `0–3` → `not_found`
- Confidence = `min(0.9, 0.45 + best_total / 20)`

---

### `plan_generator.py` — Experiment Plan Generation

#### Entry point — `generate_plan(hypothesis, qc?, domain?, constraints?, ...evidence, prior_feedback?)`

1. Fetches any missing evidence (protocol, materials, validation) via Tavily
2. Dedupes all evidence
3. Builds a large Databricks/Qwen prompt including: hypothesis, domain, constraints, QC result, all evidence, prior feedback
4. Calls `_llm_generate()` → validates into `ExperimentPlan`
5. If Databricks fails → `_mock_plan()` (deterministic fallback)
6. Runs `_ground_plan()` to fix up invalid source URLs and enforce safety notes

#### `_section()` helper

Creates a `GroundedSection` dict with `content`, `confidence`, `supporting_sources`, and `assumptions`. Used in `_mock_plan()` to build all plan sections consistently.

#### Plan schema prompt — `_plan_schema_prompt()`

Instructs Qwen to return the full `GroundedSection`-shaped JSON. Critical constraints:
- **No wet-lab procedural detail** (no temperatures, doses, timings)
- **Never invent catalog numbers** — use `"not found in retrieved sources"` if not in Tavily results
- All `evidence_url` fields must be one of the provided Tavily source URLs

#### `_ground_plan(plan, qc, evidence)`

Post-processing step run after LLM generation:
- Rebuilds `source_trace` from QC references + evidence
- Replaces any material `evidence_url` not in the known source set with fallback
- Sets missing `catalog_number` → `"not found in retrieved sources"`
- Appends institutional approval note to safety section if missing

#### `regenerate_plan_with_feedback(hypothesis, current_plan, feedback)`

Re-prompts Databricks/Qwen with current plan JSON + scientist feedback JSON. If Databricks fails, applies the feedback note inline to `confidence_notes.content` and `risks_and_assumptions.content`.

---

### `feedback_store.py` — Persistence

- Stores feedback at `backend/data/feedback.json` (auto-created)
- `add_feedback()` — prepends new record with UUID + UTC timestamp
- `list_feedback()` — reads and deserializes all records
- No database required; simple JSON file suitable for hackathon scale

---

## Frontend Deep-Dive

### `page.tsx` — Main Orchestrator

Manages top-level state:

| State | Type | Description |
|-------|------|-------------|
| `hypothesis` | `string` | Current hypothesis text |
| `domain` | `string` | Optional domain/field |
| `constraints` | `string` | Optional constraints |
| `qc` | `LiteratureQC \| null` | QC result or null |
| `plan` | `ExperimentPlan \| null` | Generated plan or null |
| `demoMode` | `boolean` | True when using fixture data |
| `busy` | `"qc" \| "plan" \| "both" \| null` | Loading state |
| `error` | `string \| null` | Error message |

**Flow:**
- `runQc()` → calls `runLiteratureQC(input)` → on failure loads `demoLiteratureQC(hypothesis)` fixture
- `runPlanOnly()` → calls `generatePlan(input, qc)` → on failure loads `demoExperimentPlan(hypothesis, qc)` fixture
- `demoMode` check now uses `plan.confidence_notes.content` (not `confidence_notes` string directly) due to `GroundedSection` wrapping

**Layout:** Two-column grid `lg:grid-cols-[420px_1fr]` — left sidebar (hypothesis form + sticky 5-step scientific progress tracker) and scrollable main area (QC, plan, review). Incorporates `Bricolage Grotesque` and `JetBrains Mono` for a premium scientific aesthetic. Uses `ScientificLoader` for realistic agentic progress states.

---

### Components

#### `literature-qc-panel.tsx`

Displays:
- Novelty signal badge (color-coded: emerald/amber/purple)
- Confidence progress bar
- Summary text
- **Hypothesis decomposition** — parsed components as chips (new in latest pull)
- Search result count (new)
- References list with per-reference **RubricMini** widget showing 5-dimension scores

**`RubricMini`** — new component showing `intervention/system/outcome/method/threshold_control` scores (each 0–2) and the total `/10` for the best matching reference.

#### `experiment-plan-viewer.tsx`

High-density, 8-tab plan viewer using a side-rail layout.
Top section prominently displays the **Executive Summary** and QC status badges.
Each tab now shows a **`SectionMeta`** widget below the content.

**`SectionMeta`** — renders:
- `Confidence XX%` badge
- Clickable "Source" links for each `supporting_source` URL
- Assumptions text

Data is formatted for quick PI review (30s readability): Budget as a data table with total cost, Timeline as horizontal connected bubbles, Materials as dense cards with EST pricing and catalog hints, Validation as checklists with target thresholds, and Risks as warning boxes.

#### `scientist-review-panel.tsx`

- Target Section selector (dropdown).
- **Star Rating** component (1–5).
- **Quick Tags** — toggleable buttons (e.g., "unrealistic timeline", "missing control", "cost too low").
- Correction textarea for qualitative notes.
- **Save feedback** — `POST /api/feedback`
- **Regenerate with expert feedback** — `POST /api/regenerate-with-feedback`
- Shows feedback history inline with star ratings and assigned tags rendered as badges.

#### `scientific-loader.tsx`

Renders an interactive, domain-specific loading overlay while background agents work. Shows dynamic statuses like "Decomposing hypothesis", "Checking protocol repositories", and "Building validation plan" to increase system trust during long generations.

#### `ui.tsx`

Primitive design system: `Button`, `SecondaryButton`, `Card`, `Badge`, `Input`, `Textarea`, `Select`

---

### `lib/` — Utilities & Types

#### `api.ts`

Thin `fetch` wrapper. All functions throw on non-2xx.

| Function | Endpoint |
|----------|---------|
| `runLiteratureQC(payload)` | `POST /api/literature-qc` |
| `generatePlan(payload, qc)` | `POST /api/generate-plan` |
| `submitFeedback(payload)` | `POST /api/feedback` |
| `getFeedback()` | `GET /api/feedback` |
| `regenerateWithFeedback(hypothesis, plan, feedback)` | `POST /api/regenerate-with-feedback` |

Base URL from `process.env.NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`).

#### `types.ts`

TypeScript mirrors of all Pydantic schemas. Key new types in latest pull:

- `ParsedHypothesis` — 7 optional fields for parsed components
- `ReferenceRubricScore` — 5-dimension rubric with `total`
- `TavilyEvidence` — source_type now includes `exact_hypothesis`, `similar_paper`, `safety`
- `GroundedSection<T>` — generic wrapper: `content: T`, `confidence`, `supporting_sources`, `assumptions`
- `ExperimentPlan` — all major fields are now `GroundedSection<T>` instead of plain types
- `MaterialItem` — new `catalog_number` field

#### `demo-data.ts`

Produces realistic fixture objects for offline use. `demoExperimentPlan()` must produce the new `GroundedSection`-shaped objects matching the updated schema.

---

## Key Data Shapes

### `LiteratureQC` (full, latest version)

```json
{
  "novelty_signal": "similar_work_exists",
  "confidence": 0.72,
  "summary": "...",
  "references": [
    {
      "title": "...",
      "url": "https://...",
      "source": "similar_paper",
      "relevance_reason": "...",
      "evidence_type": "similar_paper search result"
    }
  ],
  "reference_scores": [
    {
      "title": "...",
      "url": "https://...",
      "intervention_match": 2,
      "system_match": 1,
      "outcome_match": 2,
      "method_protocol_match": 1,
      "threshold_control_match": 0,
      "total": 6,
      "rationale": "..."
    }
  ],
  "parsed_hypothesis": {
    "intervention": "low-dose senolytic pretreatment",
    "system": "aged fibroblasts",
    "measurable_outcome": "mitochondrial recovery",
    "threshold": null,
    "mechanism": "oxidative stress",
    "control_condition": null,
    "domain": "life sciences"
  },
  "search_results": [...]
}
```

### `ExperimentPlan` (GroundedSection shape, latest version)

```json
{
  "title": "...",
  "hypothesis": "...",
  "executive_summary": {
    "content": "...",
    "confidence": 0.74,
    "supporting_sources": ["https://..."],
    "assumptions": ["Source-grounded planning claim; requires PI review."]
  },
  "materials": {
    "content": [
      {
        "item": "...",
        "purpose": "...",
        "supplier_hint": "...",
        "catalog_number": "not found in retrieved sources",
        "estimated_cost": 400.0,
        "evidence_url": "https://..."
      }
    ],
    "confidence": 0.66,
    "supporting_sources": ["https://..."],
    "assumptions": ["Catalog numbers were not present in retrieved sources."]
  },
  "source_trace": [
    { "title": "...", "url": "https://...", "source": "protocol" }
  ]
}
```

---

## Resilience & Fallback Strategy

| Missing | Effect |
|---------|--------|
| `TAVILY_API_KEY` | `MOCK_RESULTS` per source type returned (all `mock=true`) |
| Tavily network error | Same mock fallback; warning logged |
| Databricks unavailable (QC) | `_heuristic_classification()` used instead |
| Databricks unavailable (plan) | `_mock_plan()` returns deterministic structured plan |
| Backend API error (frontend) | `demoLiteratureQC()` or `demoExperimentPlan()` fixtures; amber "Demo data" badge shown |

---

## Safety Design

These constraints are enforced in **both** the LLM prompt and the deterministic fallback:

1. **No wet-lab operational detail** — no temperatures, doses, timings, recipes, or step-by-step procedures
2. **No invented catalog numbers** — always `"not found in retrieved sources"` unless explicitly present in a retrieved source
3. **PI review gate** — every plan section states that PI review is required before execution
4. **Institutional approval note** — `_ground_plan()` enforces it if missing
5. **Source grounding** — all `evidence_url` and `supporting_sources` values must be real Tavily URLs; `_ground_plan()` replaces anything that isn't in the known source set

---

## What Changed in the Latest Pull

**Commit range:** `ae6eb5d → e800c72` (18 objects, ~763 additions / 255 deletions)

### Backend

#### `tavily_client.py` (+260 lines net)
- **`parse_hypothesis()`** — new regex-based hypothesis decomposition returning `ParsedHypothesis`
- **`generate_tavily_queries()`** — generates 6 structured queries from parsed components instead of 4 generic ones
- **`search_all_targets()`** — main entry point that runs all 6 searches and returns parsed + queries + results
- **New source types:** `exact_hypothesis`, `similar_paper`, `safety` added to `SourceType` literal
- **`query` field** added to `TavilySearchResult` — tracks which query produced each result
- Added `logger` throughout for observability

#### `schemas.py` (+77 lines net)
- **`ParsedHypothesis`** — new model for hypothesis components
- **`ReferenceRubricScore`** — new model for 5-dimension rubric scoring (0–2 per dimension, 0–10 total)
- **`LiteratureQC`** — new fields: `reference_scores`, `parsed_hypothesis`, `search_results`
- **`GroundedSection[T]`** — new generic model wrapping content with `confidence`, `supporting_sources`, `assumptions`
- **`ExperimentPlan`** — all major sections now `GroundedSection[T]` instead of plain lists/strings
- **`MaterialItem`** — new `catalog_number` field
- **`TavilyEvidence`** — `source_type` expanded, `query` field added

#### `literature_qc.py` (+167 lines net)
- **Rubric scoring** — `_heuristic_rubric()` scores each result on 5 dimensions via keyword overlap with parsed components
- **`_llm_classification()`** — now passes `parsed_hypothesis` to LLM and requests `reference_scores[]` in JSON response
- **Signal consistency check** — LLM `novelty_signal` is overridden to match `_signal_from_total(best_rubric_total)`
- `assess_literature_qc()` now returns `parsed_hypothesis` and all `search_results` in the `LiteratureQC` response

#### `plan_generator.py` (+203 lines net)
- **`_section()` helper** — creates `GroundedSection` dict consistently
- **All mock plan sections** now use `_section()` with per-section confidence values and assumption notes
- **`_ground_plan()`** — handles new `GroundedSection` access patterns (`.content`, `.safety_and_ethics_notes.content`, etc.)
- **`catalog_number`** — set to `"not found in retrieved sources"` if missing in `_ground_plan()`
- Prompt updated to require `GroundedSection` shape for every section

#### `main.py` (+3 lines)
- Minor: imports `models.py` (if added) or route-level fixes

### Frontend

#### `page.tsx`
- Refactored to a sticky 5-step progress stepper on the left rail, with context-aware scrollable panels on the right.
- `demoMode` check updated to use `confidence_notes.content` due to schema change.
- Fixed TS narrowing bugs related to conditional component rendering and `busy` states.

#### `scientific-loader.tsx` (NEW)
- Provides fake-progress, domain-specific loading states ("Searching prior work", "Estimating materials") during agentic workflows to increase user trust.

#### `experiment-plan-viewer.tsx`
- Complete UI refactor: Side-rail tab navigation instead of top horizontal tabs.
- Executive summary surfaced to the top level alongside title and novelty badges.
- Tab-specific upgrades: Budget rendered as a table with calculated total cost, Timeline as horizontal phases, Materials as styled cards, Validation as a checklist.
- **`SectionMeta`** component added to render confidence %, source links, and assumptions per section.

#### `scientist-review-panel.tsx`
- Complete UI refactor: Replaced manual input tags with toggleable **Quick Tags** buttons.
- Replaced standard number input with clickable **Star Rating** icons.
- Feedback history upgraded to show targeted section, stars, and tags as distinct badges.
- Updated terminology: "Regenerate with expert feedback".

#### `literature-qc-panel.tsx`
- **`RubricMini`** component — 5-cell grid showing per-dimension scores + total
- **Hypothesis decomposition** section — displays `parsed_hypothesis` chips
- Visual styling upgraded to fit the new "cleanroom" design aesthetic.

#### Styling & Fonts
- Integrated `Bricolage Grotesque` for dynamic headings and `JetBrains Mono` for scientific data points and IDs.
- Applied gradient backgrounds and `shadow-soft` variables across components for a premium product feel.
- Added dynamic radar/grid background using raw CSS variables mapping to mouse position in globals.css.

#### `frontend/lib/demo-data.ts`
- Fixtures updated to produce `GroundedSection`-shaped objects

---

*This document is the canonical reference for the current state of the AI-SciBuddy project.*
