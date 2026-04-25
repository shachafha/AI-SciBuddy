"use client";

import { CSSProperties, useState } from "react";
import Link from "next/link";
import { Button, Card, SecondaryButton } from "@/components/ui";
import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { ExperimentPlanViewer } from "@/components/experiment-plan-viewer";
import { HypothesisSummaryCard } from "@/components/hypothesis-summary-card";
import { RelatedWorkSection } from "@/components/related-work-section";
import { ScientistReviewPanel } from "@/components/scientist-review-panel";
import { chatAboutLiterature, generatePlan, launchExecutionPlan, runLiteratureQC } from "@/lib/api";
import { demoExperimentPlan, demoLiteratureQC } from "@/lib/demo-data";
import type { ChatMessage, ExecutionPlan, ExperimentPlan, LiteratureQC, ScientistFeedback } from "@/lib/types";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Link2, Rocket, SendHorizontal } from "lucide-react";

function LabBackground({ mouse }: { mouse: { x: number; y: number } }) {
  const style = {
    "--mx": `${mouse.x}%`,
    "--my": `${mouse.y}%`,
  } as CSSProperties;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={style}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,150,180,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,150,180,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(20,150,180,0.12),transparent_32rem)]" />
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
  const [busy, setBusy] = useState<"qc" | "chat" | "plan" | "launch" | null>(null);
  const [viewMode, setViewMode] = useState<"chat" | "plan">("chat");
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<ScientistFeedback | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const input = { hypothesis, domain: domain || undefined, constraints: constraints || undefined };
  const isBusy = busy !== null;
  const hasStarted = chatMessages.length > 0;

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

  async function handleInitialize(nextHypothesis?: string) {
    const activeHypothesis = (nextHypothesis ?? hypothesis).trim();
    if (!activeHypothesis) return;

    setHypothesis(activeHypothesis);
    setPlan(null);
    setExecutionPlan(null);
    setAppliedFeedback(null);
    setLaunchError(null);
    setChatMessages([{ role: "assistant", content: "Analyzing your hypothesis and searching for related work..." }]);

    const newQc = await performQC(activeHypothesis);

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
  }

  async function handleSendMessage(messageText: string) {
    if (!hasStarted) {
      await handleInitialize(messageText);
      return;
    }

    const newUserMsg: ChatMessage = { role: "user", content: messageText };
    const newMessages = [...chatMessages, newUserMsg];
    setChatMessages(newMessages);
    setBusy("chat");

    try {
      const response = await chatAboutLiterature({
        messages: newMessages,
        hypothesis,
        domain: domain || undefined,
        constraints: constraints || undefined,
        qc,
      });

      setChatMessages((prev) => [...prev, response.message]);
      if (response.suggested_hypothesis) {
        setSuggestedHypothesis(response.suggested_hypothesis);
      }
      if (response.should_refresh_qc) {
        setRefreshQcPending(true);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the chat endpoint, but you can still inspect the related work below or generate a plan." },
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
    setPlan(null);
    setExecutionPlan(null);
    setAppliedFeedback(null);
    setLaunchError(null);

    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Updated the working hypothesis. I’ll refresh the related-work review for the revised hypothesis." },
    ]);

    setBusy("qc");
    try {
      const response = await runLiteratureQC({ hypothesis: newHyp, domain: domain || undefined, constraints: constraints || undefined });
      setQc(response);
      setDemoMode(false);

      let signalText = "I found some similar work.";
      if (response.novelty_signal === "not_found") signalText = "I didn't find any exact matches for this.";
      else if (response.novelty_signal === "exact_match_found") signalText = "I found an exact match or extremely similar work in the literature.";

      setChatMessages((prev) => [...prev, { role: "assistant", content: `QC refresh complete. ${signalText} The related work below is now updated.` }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I encountered an error while refreshing the related-work review. The previous literature QC results have been retained." },
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function runPlanOnly() {
    setBusy("plan");
    setLaunchError(null);
    try {
      const response = await generatePlan(input, qc);
      setPlan(response);
      setExecutionPlan(null);
      setAppliedFeedback(null);
      setViewMode("plan");
      setDemoMode(false);
    } catch {
      setPlan(demoExperimentPlan(hypothesis, qc));
      setExecutionPlan(null);
      setAppliedFeedback(null);
      setViewMode("plan");
      setDemoMode(true);
    } finally {
      setBusy(null);
    }
  }

  async function launchWorkspace() {
    if (!plan) return;
    setBusy("launch");
    setLaunchError(null);
    try {
      const response = await launchExecutionPlan(plan);
      setExecutionPlan(response);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Unable to launch execution workspace.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      className="relative min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
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
        {demoMode ? (
          <div className="absolute right-0 top-0 z-50 m-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-amber-800 shadow-sm">
            Demo Mode Active
          </div>
        ) : null}

        <div className={`flex flex-col items-center justify-center transition-all duration-700 ${hasStarted ? "pb-4 pt-8" : "min-h-[80vh] py-12"}`}>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">AI SciBuddy</h1>
          {viewMode === "chat" && !hasStarted ? (
            <>
              <p className="mb-8 max-w-2xl px-4 text-center text-lg leading-relaxed text-slate-600">
                A modern AI science workspace. Provide a hypothesis to trigger literature QC, automated planning, and structured scientific review.
              </p>

              <Card className="mx-4 w-full max-w-[900px] rounded-2xl border-border/60 bg-white/80 p-2 shadow-xl backdrop-blur-md">
                <textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="Start with a scientific hypothesis..."
                  className="min-h-[80px] w-full resize-none bg-transparent p-4 text-lg outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
                  disabled={hasStarted || isBusy}
                />
                <div className="mt-2 flex justify-end rounded-xl border-t border-border/40 bg-white/50 p-2">
                  <Button
                    onClick={() => void handleInitialize()}
                    disabled={hasStarted || isBusy || !hypothesis.trim()}
                    className="h-10 w-full rounded-lg bg-primary px-6 font-medium text-white shadow-md transition-all sm:w-auto"
                  >
                    Initialize
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </Card>

              <div className="mt-10 flex max-w-3xl flex-wrap justify-center gap-3 px-4 opacity-80">
                {[
                  "Test whether low-dose senolytic priming reduces oxidative stress in aged fibroblasts.",
                  "Can CRISPR-Cas9 be used to treat cystic fibrosis via aerosol delivery?",
                  "Evaluate if high-intensity interval training improves neuroplasticity in early-stage Alzheimer's.",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setHypothesis(example)}
                    className="rounded-full border border-border/50 bg-white/60 px-4 py-2 text-xs text-slate-600 shadow-sm transition-all hover:border-primary/40 hover:bg-white"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {hasStarted ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {viewMode === "plan" && plan ? (
              <div className="flex flex-col gap-6">
                <div className="flex justify-start">
                  <SecondaryButton onClick={() => setViewMode("chat")} className="shadow-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to research chat
                  </SecondaryButton>
                </div>

                <div className="grid gap-6">
                  <ExperimentPlanViewer
                    plan={plan}
                    loading={false}
                    mock={demoMode || plan.confidence_notes.content.toLowerCase().includes("demo")}
                    qc={qc}
                  />

                  <Card className="overflow-hidden border-primary/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(20,150,180,0.08))] shadow-soft">
                    <div className="border-b border-border/50 px-5 py-5 md:px-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                            Ready For Hand-off
                          </div>
                          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
                            <Rocket className="h-4 w-4 text-accent" />
                            Launch Execution Plan
                          </div>
                          <p className="max-w-2xl text-sm leading-6 text-slate-700">
                            Create a live checklist workspace that an executor can follow, update, and mark as complete.
                          </p>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            This living workspace lets a scientist hand off a reviewed plan to an executor and track what is done, blocked, or ready for review.
                          </p>
                          {appliedFeedback ? (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              Includes the latest applied feedback for <span className="font-mono uppercase">{appliedFeedback.section}</span>.
                            </p>
                          ) : null}
                        </div>
                        <Button
                          disabled={isBusy || !plan}
                          type="button"
                          onClick={() => void launchWorkspace()}
                          className="h-12 w-full shrink-0 bg-primary px-5 text-sm shadow-lg shadow-primary/15 sm:w-auto"
                        >
                          <Rocket className="h-4 w-4" />
                          {busy === "launch" ? "Launching..." : executionPlan ? "Launch Updated Workspace" : "Launch Execution Plan"}
                        </Button>
                      </div>
                    </div>

                    <div className="px-5 py-5 md:px-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/60 bg-white/80 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hypothesis</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{hypothesis ? "Ready" : "Missing"}</div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-white/80 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reviewed Plan</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{appliedFeedback ? "Regenerated with feedback" : "Generated draft"}</div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-white/80 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Workspace Link</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{executionPlan ? "Created" : "Not created yet"}</div>
                        </div>
                      </div>

                      {launchError ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
                          {launchError}
                        </div>
                      ) : null}

                      {executionPlan ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                                <CheckCircle2 className="h-4 w-4" />
                                Execution workspace created
                              </div>
                              <p className="mt-1 text-sm text-emerald-900">Your shareable execution workspace is ready.</p>
                              <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
                                <Link2 className="h-4 w-4 shrink-0 text-emerald-700" />
                                <span className="truncate">{`${typeof window !== "undefined" ? window.location.origin : ""}/plan/${executionPlan.plan_id}`}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                              <SecondaryButton
                                type="button"
                                onClick={() => {
                                  if (typeof window !== "undefined") {
                                    void navigator.clipboard.writeText(`${window.location.origin}/plan/${executionPlan.plan_id}`);
                                  }
                                }}
                                className="w-full sm:w-auto"
                              >
                                <Link2 className="h-4 w-4" />
                                Copy Link
                              </SecondaryButton>
                              <Button asChild className="w-full sm:w-auto">
                                <Link href={`/plan/${executionPlan.plan_id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                  Open Workspace
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Card>

                  <ScientistReviewPanel
                    hypothesis={hypothesis}
                    plan={plan}
                    onPlanUpdated={(updated) => {
                      setPlan(updated);
                      setExecutionPlan(null);
                      setLaunchError(null);
                      setDemoMode(updated.confidence_notes.content.toLowerCase().includes("demo"));
                    }}
                    onFeedbackApplied={(feedback) => {
                      setAppliedFeedback(feedback);
                      setExecutionPlan(null);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-24">
                {plan ? (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      You have an active experiment plan for the current hypothesis.
                    </div>
                    <Button onClick={() => setViewMode("plan")} className="h-9 bg-emerald-600 px-4 text-sm text-white shadow-sm hover:bg-emerald-700">
                      View Plan
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                <div className="mb-4 text-center">
                  <p className="text-lg leading-relaxed text-muted-foreground">
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

                <Card className="border-border/60 bg-white/70 p-4 shadow-soft">
                  <ChatMessageList
                    messages={chatMessages}
                    isTyping={busy === "chat"}
                    onPromptSelect={(prompt) => void handleSendMessage(prompt)}
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
        ) : null}
      </div>
    </main>
  );
}
