# AI SciBuddy

AI SciBuddy is a polished hackathon demo for turning a scientific hypothesis into:

- a Tavily-backed literature/protocol search
- a novelty QC signal
- a structured experiment planning draft
- a lightweight scientist feedback loop

The app is intentionally simple: Next.js frontend, FastAPI backend, Tavily for search, local Ollama/Gemma for structured plan generation, and local JSON feedback storage. If Tavily or Ollama are unavailable, the backend returns clear mock data so the demo still works.

## Project Structure

```text
/frontend
  /app
  /components
  /lib
/backend
  /app
    main.py
    models.py
    tavily_client.py
    literature_qc.py
    plan_generator.py
    feedback_store.py
    schemas.py
  requirements.txt
README.md
.env.example
```

## Environment

Copy `.env.example` to `.env` at the repo root or export the variables in your shell:

```bash
TAVILY_API_KEY=your_tavily_key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

`TAVILY_API_KEY` is optional for local demo mode. Ollama is optional too: if the backend cannot reach your configured Gemma model, it returns a deterministic mock plan.

To use Gemma locally, make sure Ollama is running and pull the model you want:

```bash
ollama pull gemma3
```

## Run Locally

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## API

- `GET /api/health`
- `POST /api/literature-qc`
- `POST /api/generate-plan`
- `POST /api/feedback`
- `GET /api/feedback`
- `POST /api/regenerate-with-feedback`

Example request:

```bash
curl -X POST http://localhost:8000/api/literature-qc \
  -H "Content-Type: application/json" \
  -d '{"hypothesis":"A low-dose senolytic pretreatment improves mitochondrial recovery after oxidative stress in aged fibroblasts.","domain":"cell biology","constraints":"Use safe, high-level protocol detail only."}'
```

## Demo Notes

- Missing `TAVILY_API_KEY`: Tavily search helpers return realistic mock results with `mock=true`.
- Missing or unavailable Ollama/Gemma: returns a deterministic structured experiment plan and marks it as a mock plan.
- Feedback is stored at `backend/data/feedback.json`.
