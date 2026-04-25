"use client";

import { CSSProperties, useState } from "react";
import { Card, SecondaryButton, Button } from "@/components/ui";
import { ExperimentPlanViewer } from "@/components/experiment-plan-viewer";
import { ScientistReviewPanel } from "@/components/scientist-review-panel";
import { ScientificLoader } from "@/components/scientific-loader";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatComposer } from "@/components/chat-composer";
import { HypothesisSummaryCard } from "@/components/hypothesis-summary-card";
import { RelatedWorkSection } from "@/components/related-work-section";
import { chatAboutLiterature, generatePlan, runLiteratureQC } from "@/lib/api";
import { demoExperimentPlan, demoLiteratureQC } from "@/lib/demo-data";
import type { ChatMessage, ExperimentPlan, LiteratureQC } from "@/lib/types";
import { FlaskConical, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

function LabBackground({ mouse }: { mouse: { x: number; y: number } }) {
  const style = {
    "--mx": `${mouse.x}%`,
    "--my": `${mouse.y}%`,
  } as CSSProperties;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={style}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,150,180,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,150,180,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(20,150,180,0.12),transparent_32rem)]" />
      <div className="absolute left-[8%] top-[18%] hidden rounded-md border border-border/40 bg-white/45 px-3 py-2 font-mono text-xs font-semibold text-primary/60 shadow-sm backdrop-blur md:block">
        SYS.READY
      </div>
      <div className="absolute right-[11%] top-[24%] hidden rounded-md border border-border/40 bg-white/45 px-3 py-2 font-mono text-xs font-semibold text-primary/60 shadow-sm backdrop-blur lg:block">
        NOVELTY_IDX: OPTIMAL
      </div>
    </div>
  );
}

export default function Home() {
  const [mouse, setMouse] = useState({ x: 50, y: 42 });
  const [hypothesis, setHypothesis] = useState("");
  const [domain, setDomain] = useState("");
  const [constraints, setConstraints] = useState("Use safe, high-level protocol detail only.");
  const [qc, setQc] = useState<LiteratureQC | null>(null);
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [suggestedHypothesis, setSuggestedHypothesis] = useState<string | null>(null);
  const [refreshQcPending, setRefreshQcPending] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState<"qc" | "chat" | "plan" | "both" | null>(null);
  const [viewMode, setViewMode] = useState<"chat" | "plan">("chat");

  const input = { hypothesis, domain: domain || undefined, constraints: constraints || undefined };
  const isBusy = busy !== null;

  async function performQC(hyp: string) {
    setBusy("qc");
    try {
      const response = await runLiteratureQC({ hypothesis: hyp, domain: domain || undefined, constraints: constraints || undefined });
      setQc(response);
      setDemoMode(false);
      return response;
    } catch {
      const fallback = demoLiteratureQC(hyp);
      setQc(fallback);
      setDemoMode(true);
      return fallback;
    } finally {
      setBusy(null);
    }
  }

  async function handleSendMessage(messageText: string) {
    const newUserMsg: ChatMessage = { role: "user", content: messageText };
    let currentHypothesis = hypothesis;

    if (!hypothesis) {
      // First message -> Treat as hypothesis
      currentHypothesis = messageText;
      setHypothesis(messageText);
      setChatMessages([newUserMsg]);
      
      const newQc = await performQC(messageText);
      
      let signalText = "I found some similar work.";
      if (newQc.novelty_signal === "not_found") signalText = "I didn't find any exact matches for this.";
      else if (newQc.novelty_signal === "exact_match_found") signalText = "I found an exact match or extremely similar work in the literature.";
      
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've analyzed your hypothesis. ${signalText} The literature QC results and related work are now displayed below.\n\nTake a look, and let me know if you want to refine the hypothesis or if you're ready to generate the experiment plan.`,
        },
      ]);
      return;
    }

    // Follow-up message
    const newMessages = [...chatMessages, newUserMsg];
    setChatMessages(newMessages);
    setBusy("chat");

    try {
      const response = await chatAboutLiterature({
        messages: newMessages,
        hypothesis: currentHypothesis,
        domain: domain || undefined,
        constraints: constraints || undefined,
        qc: qc,
      });

      setChatMessages((prev) => [...prev, response.message]);
      if (response.suggested_hypothesis) {
        setSuggestedHypothesis(response.suggested_hypothesis);
      }
      if (response.should_refresh_qc) {
        setRefreshQcPending(true);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the chat endpoint, but you can still inspect the related work below or generate a plan." }
      ]);
    } finally {
      setBusy(null);
    }
  }

  function dismissSuggestedHypothesis() {
    setSuggestedHypothesis(null);
  }

  async function applySuggestedHypothesis() {
    if (!suggestedHypothesis) return;
    const newHyp = suggestedHypothesis;
    setHypothesis(newHyp);
    setSuggestedHypothesis(null);
    setRefreshQcPending(false);
    setPlan(null); // Clear the stale plan

    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Updated the working hypothesis. I’ll refresh the related-work review for the revised hypothesis." }
    ]);

    setBusy("qc");
    try {
      const response = await runLiteratureQC({ hypothesis: newHyp, domain: domain || undefined, constraints: constraints || undefined });
      setQc(response);
      setDemoMode(false);
      
      let signalText = "I found some similar work.";
      if (response.novelty_signal === "not_found") signalText = "I didn't find any exact matches for this.";
      else if (response.novelty_signal === "exact_match_found") signalText = "I found an exact match or extremely similar work in the literature.";
      
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `QC refresh complete. ${signalText} The related work below is now updated.` }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I encountered an error while refreshing the related-work review. The previous literature QC results have been retained." }
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function runPlanOnly() {
    setBusy("plan");
    try {
      const response = await generatePlan(input, qc);
      setPlan(response);
      setViewMode("plan");
      setDemoMode(false);
    } catch {
      setPlan(demoExperimentPlan(hypothesis, qc));
      setViewMode("plan");
      setDemoMode(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-background text-foreground"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMouse({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <LabBackground mouse={mouse} />
      <div className="relative z-10 mx-auto max-w-[1400px]">
        
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <FlaskConical className="h-5 w-5" />
              AI SciBuddy Workspace
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Research Operations
            </h1>
          </div>
          {demoMode ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-amber-800 shadow-sm">
              Demo Mode Active
            </div>
          ) : null}
        </header>

        {/* PLAN PHASE */}
        {viewMode === "plan" && plan ? (
          <div className="flex flex-col gap-6">
            <div className="flex justify-start">
              <SecondaryButton onClick={() => setViewMode("chat")} className="shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to research chat
              </SecondaryButton>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr]">
              <ExperimentPlanViewer
                plan={plan}
                loading={false}
                mock={demoMode || plan?.confidence_notes.content.toLowerCase().includes("demo")}
                qc={qc}
              />
              <ScientistReviewPanel
                hypothesis={hypothesis}
                plan={plan}
                onPlanUpdated={(updated) => {
                  setPlan(updated);
                  setDemoMode(updated.confidence_notes.content.toLowerCase().includes("demo"));
                }}
              />
            </div>
          </div>
        ) : (
          /* RESEARCH PHASE (CHAT) */
          <div className="mx-auto max-w-4xl flex flex-col gap-6 pb-24">
            {plan && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm mb-2">
                <div className="flex items-center gap-2 text-emerald-900 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  You have an active experiment plan for the current hypothesis.
                </div>
                <Button onClick={() => setViewMode("plan")} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm shadow-sm">
                  View Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            
            <div className="text-center mb-4">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Chat with AI-SciBuddy about your hypothesis, inspect related work, then generate a grounded experiment plan.
              </p>
            </div>

            <HypothesisSummaryCard
              hypothesis={hypothesis}
              domain={domain}
              constraints={constraints}
              parsedHypothesis={qc?.parsed_hypothesis}
              suggestedHypothesis={suggestedHypothesis}
              hasPlan={!!plan}
              onApplySuggested={applySuggestedHypothesis}
              onDismissSuggested={dismissSuggestedHypothesis}
            />

            <Card className="p-4 bg-white/70 shadow-soft border-border/60">
              <ChatMessageList 
                messages={chatMessages} 
                isTyping={busy === "chat"} 
                onPromptSelect={(prompt) => handleSendMessage(prompt)} 
              />
              <ChatComposer
                onSend={handleSendMessage}
                disabled={busy === "chat" || busy === "qc" || busy === "plan"}
                placeholder={hypothesis ? "Ask a follow up or tell me to refine the hypothesis..." : "Enter your scientific hypothesis here..."}
              />
            </Card>

            <RelatedWorkSection
              qc={qc}
              loadingQC={busy === "qc"}
              demo={demoMode}
              onGeneratePlan={runPlanOnly}
              generatingPlan={busy === "plan"}
            />
          </div>
        )}
      </div>
    </main>
  );
}
