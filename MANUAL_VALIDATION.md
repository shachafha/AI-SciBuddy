# AI SciBuddy - Manual Validation Checklist

This checklist verifies the end-to-end functionality of the chatbot-first scientific research workflow.

## 1. Setup & Launch

Start the backend:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Start the frontend:
```bash
cd frontend
npm run dev
```

## 2. Browser Verification

1. **Initial Load**: Open [localhost:3000](http://localhost:3000). The UI should display the AI SciBuddy Research Operations dashboard.
2. **First Input**: Enter an initial hypothesis (e.g., "Test whether low-dose senolytic priming reduces oxidative stress in aged fibroblasts.") in the chat composer and send it.
3. **Chat Response**: Confirm an assistant message appears acknowledging the hypothesis.
4. **Automated QC**: Confirm the Literature QC triggers automatically below the chat (you should see the "Searching related work and scoring novelty..." skeleton loader).
5. **Related Work Cards**: After QC completes, confirm the related work cards appear, fully styled with dynamic badges (e.g., SIMILAR PAPER) and rubric scores.
6. **Follow-up Question**: Ask the assistant: *"Which source overlaps most with my hypothesis?"*
7. **Context-Aware Answer**: Confirm the assistant accurately answers using the visible QC result.
8. **Hypothesis Refinement**: Ask: *"Rewrite this to focus more on oxidative stress."*
9. **Suggestion Card**: Confirm the highlighted suggested revision card appears above the chat messages (or in the Hypothesis Summary Card).
10. **Apply Revision**: Click "Apply Revision".
11. **QC Refresh**: Confirm the working hypothesis instantly updates, a system message states the QC is refreshing, and the Related Work section automatically updates with the new hypothesis context.
12. **Generate Plan**: Click "Generate Experiment Plan" (the button should disable and show a loading spinner).
13. **Plan View**: Confirm the full experiment plan viewer appears once generation completes.
14. **Literature Context**: Verify the "Literature Review" tab exists in the plan viewer and accurately shows the previous QC references.
15. **Context Restoration**: Click "Back to research chat". Confirm the previous chat transcript, current hypothesis, and related work remain perfectly intact.

## 3. Fallback Resilience Verification

1. **Tavily Fallback**: Run the backend without a valid `TAVILY_API_KEY`.
   - Confirm that mock related work still correctly appears (with amber `MOCK SEARCH RESULT` badges and a `Demo Mode Active` banner).
2. **LLM Fallback**: Run the backend with the Ollama service turned off.
   - Confirm that the deterministic fallback chat response kicks in and gracefully returns an answer without crashing the app.
