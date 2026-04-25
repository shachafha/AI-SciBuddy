"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { Button, Card, Input, SecondaryButton, Textarea } from "@/components/ui";
import { ExperimentPlanViewer } from "@/components/experiment-plan-viewer";
import { LiteratureQCPanel } from "@/components/literature-qc-panel";
import { ScientistReviewPanel } from "@/components/scientist-review-panel";
import { ScientificLoader } from "@/components/scientific-loader";
import { generatePlan, runLiteratureQC } from "@/lib/api";
import { demoExperimentPlan, demoLiteratureQC } from "@/lib/demo-data";
import type { ExperimentPlan, LiteratureQC } from "@/lib/types";
import { ArrowRight, Check, FlaskConical, Loader2, Search, Send, Sparkles } from "lucide-react";

function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = [
    "Hypothesis Setup",
    "Literature QC",
    "Plan Generation",
    "Expert Review",
    "Improved Plan"
  ];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-white/60 p-5 shadow-sm backdrop-blur">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Pipeline Status</div>
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isDone = idx < currentStep;
        return (
          <div key={step} className="flex items-center gap-3">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${isDone ? 'bg-primary text-white' : isActive ? 'border-2 border-primary text-primary' : 'border-2 border-muted-foreground/30 text-muted-foreground'}`}>
              {isDone ? <Check className="h-3 w-3" /> : <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-primary' : 'bg-transparent'}`} />}
            </div>
            <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
          </div>
        );
      })}
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
  const [stage, setStage] = useState<"start" | "dashboard">("start");
  const [mouse, setMouse] = useState({ x: 50, y: 42 });
  const [hypothesis, setHypothesis] = useState("");
  const [domain, setDomain] = useState("");
  const [constraints, setConstraints] = useState("Use safe, high-level protocol detail only.");
  const [qc, setQc] = useState<LiteratureQC | null>(null);
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [hasImprovedPlan, setHasImprovedPlan] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState<"qc" | "plan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const input = { hypothesis, domain: domain || undefined, constraints: constraints || undefined };
  const isBusy = busy !== null;

  let currentStep = 0;
  if (busy === "qc") currentStep = 1;
  else if (qc && !plan && busy !== "plan") currentStep = 1;
  else if (busy === "plan") currentStep = 2;
  else if (plan && !hasImprovedPlan) currentStep = 3;
  else if (hasImprovedPlan) currentStep = 4;

  async function runQc(event?: FormEvent) {
    event?.preventDefault();
    if (hypothesis.length < 8) return;
    setError(null);
    setPlan(null);
    setHasImprovedPlan(false);
    setBusy("qc");
    setStage("dashboard");
    try {
      const response = await runLiteratureQC(input);
      setQc(response);
      setDemoMode(false);
    } catch {
      setQc(demoLiteratureQC(hypothesis));
      setDemoMode(true);
      setError(null);
    } finally {
      setBusy(null);
    }
  }

  async function runPlanOnly() {
    setError(null);
    setBusy("plan");
    try {
      const response = await generatePlan(input, qc);
      setPlan(response);
      setDemoMode(false);
    } catch {
      setPlan(demoExperimentPlan(hypothesis, qc));
      setDemoMode(true);
      setError(null);
    } finally {
      setBusy(null);
    }
  }

  if (stage === "start") {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setMouse({
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          });
        }}
      >
        <LabBackground mouse={mouse} />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col items-center justify-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary shadow-sm backdrop-blur">
            <FlaskConical className="h-4 w-4" />
            SciBuddy Architecture v2.0
          </div>
          <h1 className="text-center text-6xl font-black tracking-tight text-slate-950 sm:text-7xl lg:text-8xl">
            AI SciBuddy
          </h1>
          <p className="mt-5 max-w-2xl text-center text-base leading-7 text-muted-foreground">
            A modern AI science workspace. Provide a hypothesis to trigger literature QC, automated planning, and structured scientific review.
          </p>

          <form onSubmit={runQc} className="mt-10 w-full max-w-3xl">
            <div className="rounded-2xl border border-border/80 bg-white/80 p-2 shadow-sm backdrop-blur transition-all focus-within:ring-4 focus-within:ring-primary/10">
              <Textarea
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                placeholder="Start with a scientific hypothesis..."
                className="min-h-28 border-0 bg-transparent text-base shadow-none focus:ring-0"
              />
              <div className="flex flex-col gap-2 border-t border-border/60 px-2 pb-2 pt-3 sm:flex-row sm:items-center">
                <Input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="Optional domain"
                  className="border-0 bg-muted/50 shadow-none focus:ring-0"
                />
                <Button disabled={hypothesis.length < 8} type="submit" className="h-11 shrink-0 px-6">
                  <Send className="h-4 w-4" />
                  Initialize
                </Button>
              </div>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main 
      className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8"
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
        <header className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setStage("start")}
              className="flex items-center gap-2 text-sm font-bold text-primary transition-opacity hover:opacity-80"
            >
              <FlaskConical className="h-5 w-5" />
              AI SciBuddy Workspace
            </button>
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

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] items-start">
          {/* LEFT COLUMN: STICKY */}
          <section className="sticky top-6 flex flex-col gap-6">
            <ProgressStepper currentStep={currentStep} />
            
            <Card>
              <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Hypothesis Parameters
                </div>
              </div>
              <form onSubmit={runQc} className="space-y-4 p-5">
                <Textarea
                  value={hypothesis}
                  onChange={(event) => {
                    setHypothesis(event.target.value);
                    setQc(null);
                    setPlan(null);
                    setHasImprovedPlan(false);
                  }}
                  placeholder="Edit the hypothesis..."
                  className="font-medium"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="Domain" className="font-mono text-xs" />
                  <Input value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Constraints" className="font-mono text-xs" />
                </div>
                {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
                <div className="flex flex-col gap-2 pt-2">
                  <Button disabled={isBusy || hypothesis.length < 8} type="submit" className="w-full">
                    {busy === "qc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Run Literature QC
                  </Button>
                  <SecondaryButton disabled={isBusy || !qc || hypothesis.length < 8} type="button" onClick={runPlanOnly} className="w-full">
                    {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Generate Experiment Plan
                  </SecondaryButton>
                </div>
              </form>
            </Card>

            {busy === "qc" ? (
              <Card className="bg-white/60 shadow-soft">
                <ScientificLoader type="qc" />
              </Card>
            ) : qc ? (
              <LiteratureQCPanel qc={qc} loading={false} demo={demoMode} />
            ) : null}
          </section>

          {/* RIGHT COLUMN: SCROLLABLE */}
          <section className="flex flex-col gap-6">
            {busy === "plan" ? (
              <Card className="min-h-[400px] flex items-center justify-center bg-white/60">
                <ScientificLoader type="plan" />
              </Card>
            ) : plan ? (
              <>
                <ExperimentPlanViewer
                  plan={plan}
                  loading={false}
                  mock={demoMode || plan?.confidence_notes.content.toLowerCase().includes("demo")}
                />
                <ScientistReviewPanel
                  hypothesis={hypothesis}
                  plan={plan}
                  onPlanUpdated={(updated) => {
                    setPlan(updated);
                    setHasImprovedPlan(true);
                    setDemoMode(updated.confidence_notes.content.toLowerCase().includes("demo"));
                  }}
                />
              </>
            ) : (
              <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-white/40 backdrop-blur">
                <div className="text-center">
                  <FlaskConical className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-muted-foreground">Experiment plan will appear here</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

