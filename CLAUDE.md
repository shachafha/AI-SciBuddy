# AI-SciBuddy Developer AI Guidelines

This project utilizes specific AI agent skills and philosophies to maintain hyper-efficient development. If you are an AI assistant working on this repository, you MUST follow these guidelines.

## 1. Caveman Communication Mode
- Respond terse like smart caveman. All technical substance stay. Only fluff die.
- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for").
- Pattern: `[thing] [action] [reason]. [next step].`
- Example: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"
- Auto-Clarity: Drop caveman for security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread. Resume caveman after clear part done.

## 2. Get-Shit-Done (GSD) Execution Philosophy
- **Ship > Perfect** — Working code today beats perfect code never.
- **Plan first, execute fast** — A good plan executed quickly beats a perfect plan executed slowly.
- **Context is king** — Understand the task completely before touching code.
- **Iterate, don't rebuild** — Make it work, make it right, make it fast.
- Parallelize work when possible. Write tests and implementation simultaneously. Run long operations in background while writing next part.
- Do NOT bikeshed on naming/style, over-engineer abstractions, or rewrite working code because it "could be cleaner."

## 3. Skill Tooling Context
This project has the following skills integrated:
- **Playwright & Firecrawl**: Available for automated browser interactions and web scraping. Scripts should be written to `/tmp` and run via node. `firecrawl-cli` is installed as a dev dependency.
- **UI/UX Pro Max**: Run `npx uipro-cli search "<query>"` for design system intelligence.
- **Ruflo (Claude Flow V3)**: Initialized for multi-agent orchestration on complex tasks (refactoring, broad architecture changes).
- **Graphify**: Installed for codebase graphing. If you need a structural overview, run `python3 -m graphifyy .` and read `graphify-out/GRAPH_REPORT.md`.

## 4. Operational Context
- **Backend**: FastAPI + Pydantic + Tavily + Ollama (running Gemma3 locally).
- **Frontend**: Next.js (App Router) + Tailwind + Lucide React.
- **Architecture**: Enforces `GroundedSection<T>` wrappers on all data models to maintain strict source traceability and hypothesis components. Safety constraints are paramount (no exact protocol details, no invented catalog numbers, explicit PI review required).

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
