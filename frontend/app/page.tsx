"use client";

import { CSSProperties, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge, Card, Button, SecondaryButton } from "@/components/ui";
import { ExperimentPlanViewer } from "@/components/experiment-plan-viewer";
import { HypothesisSummaryCard } from "@/components/hypothesis-summary-card";
import { RelatedWorkSection } from "@/components/related-work-section";
import { AgentWorkspacePanel } from "@/components/agent-workspace-panel";
import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { chatAboutLiterature, generatePlan, launchExecutionPlan, runLiteratureQC, regenerateFromChat } from "@/lib/api";
import { demoExperimentPlan, demoLiteratureQC } from "@/lib/demo-data";
import type { ChatMessage, ExecutionPlan, ExperimentPlan, LiteratureQC, ScientistFeedback, LabNode } from "@/lib/types";
import { PlanContextSection } from "@/components/experiment-plan-viewer";
import { ReviewLogViewer } from "@/components/review-log-viewer";
import { CheckCircle2, ClipboardList, FlaskConical, Loader2, Network, Radar, SendHorizontal, ExternalLink, Link2, Rocket, BrainCircuit, History } from "lucide-react";

type AppDestination = "overview" | "literature_qc" | "experiment_plan" | "lab_view" | "review_log";
type WorkflowPhase = "pre_plan" | "post_plan";

const prePlanNav: { id: AppDestination; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "literature_qc", label: "Literature QC" },
];

const postPlanNav: { id: AppDestination; label: string }[] = [
  { id: "experiment_plan", label: "Experiment Plan" },
  { id: "lab_view", label: "Lab View" },
  { id: "review_log", label: "Review Log" },
];

function navIcon(destination: AppDestination) {
  switch (destination) {
    case "literature_qc": return Radar;
    case "experiment_plan": return ClipboardList;
    case "lab_view": return Network;
    case "review_log": return History;
    default: return FlaskConical;
  }
}

function TopAppNav({
  activeDestination,
  onChange,
  workflowPhase,
  hasQc,
  hasPlan,
  demoMode,
  busy,
  onGeneratePlan,
}: {
  activeDestination: AppDestination;
  onChange: (destination: AppDestination) => void;
  workflowPhase: WorkflowPhase;
  hasQc: boolean;
  hasPlan: boolean;
  demoMode: boolean;
  busy: "qc" | "chat" | "plan" | "launch" | "both" | null;
  onGeneratePlan: () => void;
}) {
  const generatingPlan = busy === "plan";
  const statusLabel = busy === "qc" ? "QC running" : busy === "chat" ? "Chat active" : busy === "plan" ? "Planning" : busy === "launch" ? "Launching" : "Ready";

  return (
    <div className="sticky top-4 z-40 mb-8 rounded-2xl border border-border/60 bg-white/90 p-2 shadow-soft backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        {/* Logo + Phase Badge */}
        <div className="flex min-w-0 items-center gap-3 px-2">
          <div className="relative h-[44px] w-[44px] shrink-0 sm:h-[52px] sm:w-[52px]">
            <Image src="/logo.png" alt="AI SciBuddy teddy bear scientist logo" fill className="object-contain" priority />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black tracking-tight text-slate-900">AI SciBuddy</div>
            <div className={[
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-300",
              workflowPhase === "post_plan"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            ].join(" ")}>
              {workflowPhase === "post_plan" ? (
                <><CheckCircle2 className="h-2.5 w-2.5" /> Plan Workspace</>
              ) : (
                <><Radar className="h-2.5 w-2.5" /> Research Phase</>
              )}
            </div>
          </div>
        </div>

        {/* Two-Phase Nav */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-border/40 bg-slate-50/70 p-1" aria-label="AI SciBuddy navigation">
          
          {/* Phase 1: Research (Only shown pre-plan) */}
          {workflowPhase === "pre_plan" && (
            <>
              {prePlanNav.map((item) => {
                const Icon = navIcon(item.id);
                const isActive = activeDestination === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 sm:px-4",
                      isActive
                        ? "bg-white text-primary shadow-sm ring-1 ring-border/60"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}

              {/* Phase Divider */}
              <div className="mx-1 h-6 w-px shrink-0 bg-border/60" aria-hidden />
              <div className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-slate-300 px-0.5 hidden sm:block">Plan</div>
              <div className="mx-1 h-6 w-px shrink-0 bg-border/60 hidden sm:block" aria-hidden />
            </>
          )}

          {/* Phase 2: Plan Workspace */}
          {postPlanNav.map((item) => {
            const Icon = navIcon(item.id);
            const isEnabled = hasPlan;
            const isActive = activeDestination === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { if (isEnabled) onChange(item.id); }}
                disabled={!isEnabled}
                title={!isEnabled ? "Generate a plan first" : undefined}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 sm:px-4",
                  isActive
                    ? "bg-white text-primary shadow-sm ring-1 ring-border/60"
                    : isEnabled
                    ? "cursor-pointer text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    : "cursor-not-allowed text-slate-300",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Status Badges + CTA */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-2">
          <Badge className="border-slate-200 bg-slate-50 text-slate-700 font-mono">
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />}
            {statusLabel}
          </Badge>
          {hasQc ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-900 font-mono">QC_READY</Badge> : null}
          {hasPlan ? <Badge className="border-primary/20 bg-primary/10 text-primary font-mono">PLAN_READY</Badge> : null}
          {demoMode ? <Badge className="border-amber-200 bg-amber-50 text-amber-900 font-mono">DEMO</Badge> : null}
          {hasQc && !hasPlan ? (
            <Button
              onClick={onGeneratePlan}
              disabled={generatingPlan}
              className="h-8 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-primary/90"
            >
              {generatingPlan ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="mr-1.5 h-3.5 w-3.5" />}
              Generate Plan
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
  const [overviewChat, setOverviewChat] = useState<ChatMessage[]>([]);
  const [planChat, setPlanChat] = useState<ChatMessage[]>([]);
  const [suggestedHypothesis, setSuggestedHypothesis] = useState<string | null>(null);
  const [refreshQcPending, setRefreshQcPending] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState<"qc" | "chat" | "plan" | "launch" | "both" | null>(null);
  const [activeDestination, setActiveDestination] = useState<AppDestination>("overview");
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<ScientistFeedback | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [activePlanSection, setActivePlanSection] = useState<PlanContextSection>("protocol");
  const [selectedLabNode, setSelectedLabNode] = useState<LabNode | null>(null);

  const workflowPhase: WorkflowPhase = plan ? "post_plan" : "pre_plan";
  const chatContext: "overview" | "plan" = (activeDestination === "experiment_plan" || activeDestination === "lab_view" || activeDestination === "review_log") && plan ? "plan" : "overview";
  const activeChatMessages = chatContext === "plan" ? planChat : overviewChat;
  const input = { hypothesis, domain: domain || undefined, constraints: constraints || undefined };
  const isBusy = busy !== null;
  const hasStarted = overviewChat.length > 0;

  async function performQC(hyp: string) {
    setBusy("qc");
    try {
      const response = await runLiteratureQC({ hypothesis: hyp, domain: domain || undefined, constraints: constraints || undefined });
      setQc(response);
      setDemoMode(false);
      setActiveDestination("literature_qc");
      return response;
    } catch {
      const fallback = demoLiteratureQC(hyp);
      setQc(fallback);
      setDemoMode(true);
      setActiveDestination("literature_qc");
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
    setPlanChat([]);
    setExecutionPlan(null);
    setAppliedFeedback(null);
    setLaunchError(null);
    setOverviewChat([{ role: "assistant", content: "Analyzing your hypothesis and searching for related work..." }]);

    const newQc = await performQC(activeHypothesis);

    let signalText = "I found some similar work.";
    if (newQc.novelty_signal === "not_found") signalText = "I didn't find any exact matches for this.";
    else if (newQc.novelty_signal === "exact_match_found") signalText = "I found an exact match or extremely similar work in the literature.";

    setOverviewChat((prev) => [
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
    const newMessages = [...overviewChat, newUserMsg];
    setOverviewChat(newMessages);
    setBusy("chat");

    try {
      const response = await chatAboutLiterature({
        messages: newMessages,
        hypothesis,
        domain: domain || undefined,
        constraints: constraints || undefined,
        qc,
      });

      setOverviewChat((prev) => [...prev, response.message]);
      if (response.suggested_hypothesis) {
        setSuggestedHypothesis(response.suggested_hypothesis);
      }
      if (response.should_refresh_qc) {
        setRefreshQcPending(true);
      }
    } catch {
      setOverviewChat((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the chat endpoint, but you can still inspect the related work below or generate a plan." },
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function handlePlanMessage(messageText: string) {
    if (!plan) return;
    const newUserMsg: ChatMessage = { role: "user", content: messageText };
    const newMessages = [...planChat, newUserMsg];
    setPlanChat(newMessages);
    setBusy("chat");

    // Inject plan context as a system-level prefix in the message list
    const contextualMessages: ChatMessage[] = [
      {
        role: "assistant",
        content: `[Plan context: "${plan.title}" | Section: ${activePlanSection} | QC: ${qc ? "verified" : "pending"}${selectedLabNode ? ` | Node: ${selectedLabNode.label}` : ""}]`,
      },
      ...newMessages,
    ];

    try {
      const response = await chatAboutLiterature({
        messages: contextualMessages,
        hypothesis,
        domain: domain || undefined,
        constraints: constraints || undefined,
        qc,
      });
      setPlanChat((prev) => [...prev, response.message]);
    } catch {
      setPlanChat((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the chat endpoint. Review the plan sections directly or use the Actions tab to regenerate." },
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function handleRegenerateFromChat() {
    if (!plan || planChat.length === 0) return;
    setBusy("plan");
    try {
      const response = await regenerateFromChat({
        hypothesis,
        current_plan: plan,
        messages: planChat,
        active_section: activePlanSection,
      });
      setPlan(response);
      setDemoMode(response.confidence_notes.content.toLowerCase().includes("demo"));
      setExecutionPlan(null);
      // Let the user know the chat context was applied
      setPlanChat((prev) => [
        ...prev,
        { role: "assistant", content: "I've regenerated the plan based on our conversation. The updated plan is now loaded." }
      ]);
    } catch {
      setPlanChat((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to regenerate the plan. Please try again or use manual feedback." }
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
    setPlanChat([]);
    setExecutionPlan(null);
    setAppliedFeedback(null);
    setLaunchError(null);
    setActiveDestination("literature_qc");

    setOverviewChat((prev) => [
      ...prev,
      { role: "assistant", content: "Updated the working hypothesis. I'll refresh the related-work review for the revised hypothesis." },
    ]);

    setBusy("qc");
    try {
      const response = await runLiteratureQC({ hypothesis: newHyp, domain: domain || undefined, constraints: constraints || undefined });
      setQc(response);
      setDemoMode(false);
      setActiveDestination("literature_qc");
      
      let signalText = "I found some similar work.";
      if (response.novelty_signal === "not_found") signalText = "I didn't find any exact matches for this.";
      else if (response.novelty_signal === "exact_match_found") signalText = "I found an exact match or extremely similar work in the literature.";

      setOverviewChat((prev) => [...prev, { role: "assistant", content: `QC refresh complete. ${signalText} The related work below is now updated.` }]);
    } catch {
      setOverviewChat((prev) => [
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
      setActiveDestination("experiment_plan");
      setDemoMode(false);
      setPlanChat([{ role: "assistant", content: `Plan generated: **${response.title}**\n\nI'm ready to help you refine sections, suggest controls, explain methodology, or regenerate based on your feedback. What would you like to explore?` }]);
    } catch {
      const demo = demoExperimentPlan(hypothesis, qc);
      setPlan(demo);
      setExecutionPlan(null);
      setAppliedFeedback(null);
      setActiveDestination("experiment_plan");
      setDemoMode(true);
      setPlanChat([{ role: "assistant", content: `Demo plan loaded: **${demo.title}**\n\nThis is mock data. Ask me about the protocol, materials, timeline, or regeneration options.` }]);
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
      className="relative min-h-screen bg-background text-foreground"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMouse({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <LabBackground mouse={mouse} />


      {!hasStarted ? (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center py-12">
          <div className="flex flex-col items-center gap-0 mb-4">
            <div className="relative h-[115px] w-[115px] sm:h-[155px] sm:w-[155px] lg:h-[195px] lg:w-[195px] drop-shadow-[0_0_20px_rgba(20,150,180,0.15)] z-10">
              <Image src="/logo.png" alt="AI SciBuddy teddy bear scientist logo" fill className="object-contain" priority />
            </div>
            <h1 className="-mt-2 sm:-mt-6 lg:-mt-8 text-4xl font-black tracking-tight text-slate-900 sm:text-6xl relative z-20">AI SciBuddy</h1>
          </div>
          <p className="mb-8 max-w-2xl px-4 text-center text-lg leading-relaxed text-slate-600">
            A modern AI science workspace. Provide a hypothesis to trigger literature QC, automated planning, and structured scientific review.
          </p>

          <Card className="mx-4 w-full max-w-[900px] rounded-2xl border-border/60 bg-white/80 p-2 shadow-xl backdrop-blur-md">
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Start with a scientific hypothesis..."
              className="min-h-[80px] w-full resize-none bg-transparent p-4 text-lg outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
              disabled={isBusy}
            />
            <div className="mt-2 flex justify-end rounded-xl border-t border-border/40 bg-white/50 p-2">
              <Button
                onClick={() => void handleInitialize()}
                disabled={isBusy || !hypothesis.trim()}
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
        </div>
      ) : (
        <div className="relative z-10 flex h-screen w-full flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex h-full w-full max-w-[1600px] mx-auto gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Left/Main Content Area */}
            <div className="flex flex-1 flex-col min-w-0 overflow-y-auto pr-2 custom-scrollbar">
              <TopAppNav
                activeDestination={activeDestination}
                onChange={setActiveDestination}
                workflowPhase={workflowPhase}
                hasQc={!!qc}
                hasPlan={!!plan}
                demoMode={demoMode}
                busy={busy}
                onGeneratePlan={runPlanOnly}
              />

              {activeDestination === "overview" && (
                <div className="mx-auto w-full max-w-4xl flex flex-col gap-6 pb-24">
                  {plan && (
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 text-sm font-medium">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        You have an active experiment plan for the current hypothesis.
                      </div>
                      <Button
                        onClick={() => setActiveDestination("experiment_plan")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm shadow-sm"
                      >
                        View Plan
                        <ClipboardList className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

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
                    <div className="h-[400px] flex flex-col">
                      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
                        <ChatMessageList
                          messages={overviewChat}
                          isTyping={busy === "chat"}
                          onPromptSelect={(prompt) => handleSendMessage(prompt)}
                        />
                      </div>
                      <div className="shrink-0 border-t border-border/40 pt-3">
                        <ChatComposer
                          onSend={handleSendMessage}
                          disabled={busy === "chat" || busy === "qc" || busy === "plan"}
                          placeholder={hypothesis ? "Ask a follow up or tell me to refine the hypothesis..." : "Enter your scientific hypothesis here..."}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeDestination === "literature_qc" && (
                <div className="mx-auto w-full max-w-5xl pb-24">
                  <RelatedWorkSection
                    qc={qc}
                    loadingQC={busy === "qc"}
                    demo={demoMode}
                    onGeneratePlan={runPlanOnly}
                    generatingPlan={busy === "plan"}
                  />
                </div>
              )}

              {activeDestination === "experiment_plan" && plan && (
                <div className="pb-24 grid gap-6">
                  <ExperimentPlanViewer
                    plan={plan}
                    loading={false}
                    mock={demoMode || plan.confidence_notes.content.toLowerCase().includes("demo")}
                    qc={qc}
                    mode="experiment_plan"
                    activePlanSection={activePlanSection}
                    onActivePlanSectionChange={setActivePlanSection}
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
                </div>
              )}

              {activeDestination === "lab_view" && plan && (
                <div className="pb-24">
                  <ExperimentPlanViewer
                    plan={plan}
                    loading={false}
                    mock={demoMode || plan.confidence_notes.content.toLowerCase().includes("demo")}
                    qc={qc}
                    mode="lab_view"
                    onRegenerate={(updated) => {
                      setPlan(updated);
                      setDemoMode(updated.confidence_notes.content.toLowerCase().includes("demo"));
                    }}
                    onNodeSelect={setSelectedLabNode}
                  />
                </div>
              )}

              {activeDestination === "review_log" && (
                <div className="pb-24">
                  <ReviewLogViewer />
                </div>
              )}
            </div>

            {/* Right Side: Persistent Agent Workspace Panel (Only Post-Plan) */}
            {workflowPhase === "post_plan" && (
              <div className="flex-shrink-0 relative z-20 h-full rounded-2xl overflow-hidden border border-border/60 shadow-xl hidden lg:block">
                <AgentWorkspacePanel
                  hypothesis={hypothesis}
                  plan={plan}
                  qc={qc}
                  chatMessages={activeChatMessages}
                  chatContext={chatContext}
                  busy={busy}
                  onSendMessage={chatContext === "plan" ? handlePlanMessage : handleSendMessage}
                  onRegeneratePlan={chatContext === "plan" ? handleRegenerateFromChat : undefined}
                  onPlanUpdated={(updated) => {
                    setPlan(updated);
                    setDemoMode(updated.confidence_notes.content.toLowerCase().includes("demo"));
                  }}
                  onFeedbackApplied={(feedback) => {
                    setAppliedFeedback(feedback);
                    setExecutionPlan(null);
                  }}
                  activeDestination={activeDestination}
                  activePlanSection={activePlanSection}
                  selectedLabNode={selectedLabNode}
                />
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
