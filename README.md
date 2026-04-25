# AI SciBuddy

## Problem
Turning a high-level scientific hypothesis into a structured, PI-review-ready experiment plan is a slow and error-prone process. Scientists spend hours searching literature, identifying validated protocols, sourcing materials, and estimating budgets. Furthermore, institutional knowledge and past mistakes (e.g., "always add extra time for this assay") are rarely captured in a way that helps future planning.

## Solution
**AI SciBuddy** is an intelligent, agentic planning assistant that turns a scientific hypothesis into a grounded, structured experimental draft. It performs automated literature searches, runs novelty quality control (QC), drafts a comprehensive plan (including budget, timeline, and materials), and features a continuous scientist feedback loop that learns from expert corrections.

## Architecture
The application is built with a modern, intentional stack designed for speed and reliability:
*   **Frontend**: Next.js (React 19), styled with Tailwind CSS, providing a polished and responsive UI.
*   **Backend**: FastAPI (Python), serving robust endpoints for plan generation and feedback management.
*   **AI Models**: Uses local Ollama (Gemma 3) for deterministic, structured plan generation without relying on expensive cloud LLMs.

## How Tavily is Used
Tavily's search API is the backbone of AI SciBuddy's grounding mechanism. It is used to:
1.  Search for prior literature to power the Novelty QC signal.
2.  Find vetted protocols and validation methods.
3.  Identify material suppliers and estimated costs.
All generated claims in the experiment plan are directly traced back to Tavily evidence URLs, preventing hallucination.

## Stretch Goal: Scientist Feedback Loop
We implemented a powerful "Feedback Memory" stretch goal. When a Principal Investigator (PI) or senior scientist reviews a generated plan, they can submit structured corrections (e.g., "Timeline is too short. Add time for assay optimization"). 
1.  **Immediate Effect**: The plan is instantly regenerated, incorporating the correction, highlighting the changed section (e.g., Timeline), and logging the feedback in the source trace.
2.  **Long-term Memory**: The feedback is saved locally. Future hypotheses in the same domain automatically pull these past "expert lessons learned," ensuring the AI doesn't make the same mistake twice.

## How to Run Locally

### Environment Variables
Copy `.env.example` to `.env` at the repo root or export the variables in your shell:

```bash
TAVILY_API_KEY=your_tavily_key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```
*(Note: If `TAVILY_API_KEY` or Ollama is missing, the app gracefully falls back to deterministic mock data so the demo always works!)*

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## Demo Flow
1. **Enter Hypothesis**: Input a biological or chemical hypothesis.
2. **Novelty QC**: Run the literature QC to see if similar work exists.
3. **Generate Plan**: Create the initial draft.
4. **Review Details**: Explore the generated budget, timeline, materials, and source trace.
5. **Scientist Correction**: Use the review panel to correct an issue (e.g., timeline delays).
6. **Regenerate**: Watch the plan update, highlighting the changed timeline tab and appending the expert note.

## Limitations and Safety Note
**AI SciBuddy generates high-level planning drafts for review, NOT operational wet-lab instructions.**
Do not use this output as step-by-step biological, chemical, clinical, animal, or environmental release instructions. For regulated, hazardous, pathogenic, human-subject, animal-subject, gene-editing, or chemical-risk work, **PI and institutional approval is strictly required before execution**.
