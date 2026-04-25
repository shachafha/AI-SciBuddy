"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { Button, Card, Input, SecondaryButton, Textarea } from "@/components/ui";
import { ExperimentPlanViewer } from "@/components/experiment-plan-viewer";
import { LiteratureQCPanel } from "@/components/literature-qc-panel";
import { ScientistReviewPanel } from "@/components/scientist-review-panel";
import { generatePlan, runLiteratureQC } from "@/lib/api";
import { demoExperimentPlan, demoLiteratureQC } from "@/lib/demo-data";
import type { ExperimentPlan, LiteratureQC } from "@/lib/types";
import { ArrowRight, FlaskConical, Loader2, Search, Send, Sparkles } from "lucide-react";

function LabBackground({ mouse }: { mouse: { x: number; y: number } }) {
  const style = {
    "--mx": `${mouse.x}%`,
    "--my": `${mouse.y}%`,
  } as CSSProperties;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={style}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,92,82,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(13,92,82,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(20,184,166,0.22),transparent_28rem)]" />
      <div className="absolute left-[-10%] top-1/4 h-px w-[120%] rotate-[-8deg] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
      <div className="absolute bottom-1/4 left-[-10%] h-px w-[120%] rotate-[11deg] bg-gradient-to-r from-transparent via-orange-400/35 to-transparent" />
      <div className="absolute left-[8%] top-[18%] hidden rounded-md border border-teal-800/15 bg-white/45 px-3 py-2 text-xs font-semibold text-teal-950/60 shadow-soft backdrop-blur md:block">
        CRP + immunosensor
      </div>
      <div className="absolute right-[11%] top-[24%] hidden rounded-md border border-teal-800/15 bg-white/45 px-3 py-2 text-xs font-semibold text-teal-950/60 shadow-soft backdrop-blur lg:block">
        novelty score 7/10
      </div>
      <div className="absolute bottom-[18%] left-[17%] hidden rounded-md border border-teal-800/15 bg-white/45 px-3 py-2 text-xs font-semibold text-teal-950/60 shadow-soft backdrop-blur md:block">
        source trace locked
      </div>
      <div className="absolute bottom-[28%] right-[18%] hidden rounded-md border border-teal-800/15 bg-white/45 px-3 py-2 text-xs font-semibold text-teal-950/60 shadow-soft backdrop-blur lg:block">
        PI review draft
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
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState<"qc" | "plan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = { hypothesis, domain: domain || undefined, constraints: constraints || undefined };
  const isBusy = busy !== null;

  async function runQc(event?: FormEvent) {
    event?.preventDefault();
    if (hypothesis.length < 8) return;
    setError(null);
    setPlan(null);
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
        className="relative min-h-screen overflow-hidden bg-[#f8fbf7] px-4 py-6 text-foreground sm:px-6 lg:px-8"
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-900/15 bg-white/70 px-4 py-2 text-sm font-semibold text-primary shadow-soft backdrop-blur">
            <FlaskConical className="h-4 w-4" />
            Literature QC to PI-review plan
          </div>
          <h1 className="text-center text-6xl font-black tracking-normal text-slate-950 sm:text-7xl lg:text-8xl">
            AI SciBuddy
          </h1>
          <p className="mt-5 max-w-2xl text-center text-base leading-7 text-muted-foreground">
            State a hypothesis. Get novelty signals, source-grounded planning, and scientist review in one workspace.
          </p>

          <form onSubmit={runQc} className="mt-10 w-full max-w-3xl">
            <div className="rounded-xl border border-border bg-white/82 p-2 shadow-soft backdrop-blur">
              <Textarea
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                placeholder="Start with a scientific hypothesis..."
                className="min-h-28 border-0 bg-transparent text-base shadow-none focus:ring-0"
              />
              <div className="flex flex-col gap-2 border-t border-border px-2 pb-2 pt-3 sm:flex-row sm:items-center">
                <Input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="Optional domain"
                  className="border-0 bg-muted/70 focus:ring-0"
                />
                <Button disabled={hypothesis.length < 8} type="submit" className="h-11 shrink-0 px-5">
                  <Send className="h-4 w-4" />
                  Begin
                </Button>
              </div>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setStage("start")}
              className="flex items-center gap-2 text-sm font-bold text-primary"
            >
              <FlaskConical className="h-5 w-5" />
              AI SciBuddy
            </button>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-normal sm:text-4xl">
              Research planning dashboard
            </h1>
          </div>
          {demoMode ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-soft">
              Demo data
            </div>
          ) : null}
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-white/90 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Hypothesis
                </div>
              </div>
              <form onSubmit={runQc} className="space-y-4 p-5">
                <Textarea
                  value={hypothesis}
                  onChange={(event) => {
                    setHypothesis(event.target.value);
                    setQc(null);
                    setPlan(null);
                  }}
                  placeholder="Edit the hypothesis..."
                />
                <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="Domain" />
                <Input value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Constraints" />
                {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isBusy || hypothesis.length < 8} type="submit" className="min-w-44">
                    {busy === "qc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Run Literature QC
                  </Button>
                  <SecondaryButton disabled={isBusy || !qc || hypothesis.length < 8} type="button" onClick={runPlanOnly} className="min-w-52">
                    {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Generate experiment plan
                  </SecondaryButton>
                </div>
              </form>
            </Card>

            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
              <div className="rounded-md border border-border bg-white px-3 py-2 text-primary">1. Hypothesis</div>
              <div className={qc ? "rounded-md border border-border bg-white px-3 py-2 text-primary" : "rounded-md border border-border bg-white/60 px-3 py-2"}>2. Literature QC</div>
              <div className={plan ? "rounded-md border border-border bg-white px-3 py-2 text-primary" : "rounded-md border border-border bg-white/60 px-3 py-2"}>3. Plan Review</div>
            </div>

            <LiteratureQCPanel qc={qc} loading={busy === "qc"} demo={demoMode} />
            <ScientistReviewPanel
              hypothesis={hypothesis}
              plan={plan}
              onPlanUpdated={(updated) => {
                setPlan(updated);
                setDemoMode(updated.confidence_notes.content.toLowerCase().includes("demo"));
              }}
            />
          </section>

          <section>
            <ExperimentPlanViewer
              plan={plan}
              loading={busy === "plan"}
              mock={demoMode || plan?.confidence_notes.content.toLowerCase().includes("demo")}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

