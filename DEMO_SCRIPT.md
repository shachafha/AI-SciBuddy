# AI SciBuddy - Hackathon Demo Script
**Target Duration:** 2 Minutes

### 1. The Setup & Hypothesis (0:00 - 0:20)
*   **Action:** Open the web app on `localhost:3000`.
*   **Speaker:** "Turning a scientific hypothesis into a structured, PI-approved experiment plan is slow and error-prone. Meet AI SciBuddy. We start by entering a hypothesis: *'A low-dose senolytic pretreatment improves mitochondrial recovery after oxidative stress in aged fibroblasts.'*"
*   **Action:** Paste the hypothesis into the input field and select the domain "Cell Biology".

### 2. Novelty QC & References (0:20 - 0:40)
*   **Action:** Click **"Run Literature QC"**.
*   **Speaker:** "Before we plan, we need to know if this has been done. AI SciBuddy uses Tavily to instantly search the literature. It gives us a novelty signal, a confidence score, and real source URLs. Looks like similar work exists, but our specific angle might be novel enough to proceed."
*   **Action:** Briefly point to the returned Tavily references on the screen.

### 3. Generate Plan & Explore Details (0:40 - 1:10)
*   **Action:** Click **"Generate PI-Review Draft"**. Wait for the plan to render.
*   **Speaker:** "Now we generate the plan. Behind the scenes, Tavily is searching for protocols, materials, and validation methods to ground our AI. Here is our structured draft."
*   **Action:** Click through the **Materials**, **Budget**, and **Timeline** tabs.
*   **Speaker:** "Notice how it breaks down estimated costs, supplier hints, and timelines. Every major claim is tied to a real source, preventing hallucination."

### 4. Scientist Feedback & Correction (1:10 - 1:40)
*   **Action:** Scroll down to the **Scientist Review** panel. Select **"Timeline"** from the dropdown. Set rating to 3/5.
*   **Speaker:** "But AI isn't perfect. A senior PI reviewing this realizes a mistake. I'll enter: *'Timeline is too short. Add 2 weeks for assay optimization and ordering delays.'*"
*   **Action:** Type the feedback and click **"Regenerate"**.

### 5. Regeneration Effect & Conclusion (1:40 - 2:00)
*   **Action:** The plan regenerates. Click the now-highlighted (amber pulsing dot) **Timeline** tab. Click the **Summary** or **Sources** tab to show the appended notes.
*   **Speaker:** "The plan instantly regenerates. The Timeline tab is visually highlighted so we see exactly what changed. The timeline is extended, and it explicitly notes 'Updated based on expert feedback'."
*   **Speaker:** "Most importantly, this feedback is saved to local memory. Next time someone plans a similar cell biology experiment, SciBuddy will automatically pull this in as an *Expert Lesson Learned*."
*   **Action:** Briefly reference the expanded agentic capabilities (if visible on an architecture slide or repo).
*   **Speaker:** "And this is just the beginning. AI SciBuddy is supercharged with installed agentic tools like Firecrawl, Playwright, Code Review Graph, and UI/UX Pro Max, enabling it to autonomously scrape supplier sites, design intuitive interfaces, and orchestrate complex multi-agent workflows under the hood. AI SciBuddy turns expert corrections into reusable, executable memory. Thank you!"
