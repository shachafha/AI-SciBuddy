"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, Card, Select, SecondaryButton, Textarea } from "@/components/ui";
import { inviteExecutors, updateExecutionTask } from "@/lib/api";
import type { ExecutionPlan, ExecutionTask, ExecutionTaskSection, ExecutionTaskStatus, InviteExecutorsResponse } from "@/lib/types";
import { AlertCircle, CheckCircle2, Clipboard, ClipboardCheck, Clock3, FlaskConical, Mail, PauseCircle, Send, SendToBack, ShieldAlert, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const statusOptions: { value: ExecutionTaskStatus; label: string; className: string }[] = [
  { value: "not_started", label: "Not started", className: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "in_progress", label: "In progress", className: "bg-sky-50 text-sky-800 border-sky-200" },
  { value: "blocked", label: "Blocked", className: "bg-rose-50 text-rose-800 border-rose-200" },
  { value: "done", label: "Done", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { value: "needs_review", label: "Needs review", className: "bg-amber-50 text-amber-800 border-amber-200" },
];

const statusIcons: Record<ExecutionTaskStatus, typeof Clock3> = {
  not_started: Clock3,
  in_progress: SendToBack,
  blocked: AlertCircle,
  done: CheckCircle2,
  needs_review: PauseCircle,
};

const sectionOrder: ExecutionTaskSection[] = [
  "Preparation",
  "Design Review",
  "Materials and Logistics",
  "Execution Tracking",
  "Validation and Analysis",
  "Safety and Compliance",
  "Final Review",
];

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusStyle(status: ExecutionTaskStatus) {
  return statusOptions.find((option) => option.value === status)?.className ?? statusOptions[0].className;
}

function parseEmails(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;\s]+/)
        .map((email) => email.trim())
        .filter(Boolean),
    ),
  );
}

function buildMailtoLink(invite: InviteExecutorsResponse) {
  const recipients = encodeURIComponent(invite.invited_emails.join(","));
  const subject = encodeURIComponent(invite.email_subject);
  const body = encodeURIComponent(`${invite.email_body}\n\nPlan link: ${invite.share_url}`);
  return `mailto:${recipients}?subject=${subject}&body=${body}`;
}

function deriveProgress(plan: ExecutionPlan) {
  const allTasks = sectionOrder.flatMap((section) => plan.tasks[section] ?? []);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((task) => task.status === "done").length;
  const blockedTasks = allTasks.filter((task) => task.status === "blocked").length;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const counts = statusOptions.reduce<Record<ExecutionTaskStatus, number>>((acc, option) => {
    acc[option.value] = allTasks.filter((task) => task.status === option.value).length;
    return acc;
  }, {} as Record<ExecutionTaskStatus, number>);

  return { allTasks, totalTasks, completedTasks, blockedTasks, progressPercent, counts };
}

function TaskCard({
  task,
  planId,
  onUpdated,
}: {
  task: ExecutionTask;
  planId: string;
  onUpdated: (plan: ExecutionPlan) => void;
}) {
  const [notes, setNotes] = useState(task.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const StatusIcon = statusIcons[task.status];

  async function patchTask(payload: { status?: ExecutionTaskStatus; notes?: string }) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateExecutionTask(planId, task.task_id, payload);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm transition-colors",
        task.status === "blocked" && "border-rose-200 bg-rose-50/70",
        task.status === "done" && "border-emerald-200 bg-emerald-50/60",
        task.status !== "blocked" && task.status !== "done" && "border-border/70 bg-white/90",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={cn("gap-1", statusStyle(task.status))}>
                <StatusIcon className="h-3 w-3" />
                {statusOptions.find((option) => option.value === task.status)?.label}
              </Badge>
              {saving ? <span className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">Saving</span> : null}
            </div>
            <h3 className={cn("text-base font-black tracking-tight text-slate-900", task.status === "done" && "text-slate-600 line-through")}>
              {task.title}
            </h3>
            <p className={cn("mt-2 text-sm leading-relaxed text-slate-600", task.status === "done" && "text-slate-500")}>
              {task.description}
            </p>
          </div>
          <Select
            value={task.status}
            onChange={(event) => patchTask({ status: event.target.value as ExecutionTaskStatus })}
            className={cn("w-full lg:w-44", task.status === "blocked" && "border-rose-200 bg-rose-50")}
            aria-label={`Set status for ${task.title}`}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              {task.assignee || "Unassigned"}
            </span>
          </div>
          <span className="font-mono uppercase tracking-wide">Updated {formatTimestamp(task.updated_at)}</span>
        </div>

        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => {
            if (notes !== task.notes) {
              patchTask({ notes });
            }
          }}
          placeholder="Executor notes, blockers, reviewer handoffs..."
          className="min-h-24 bg-white/80"
        />
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      </div>
    </div>
  );
}

function InviteExecutorsPanel({
  plan,
  onPlanUpdated,
}: {
  plan: ExecutionPlan;
  onPlanUpdated: (plan: ExecutionPlan) => void;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [inviteResult, setInviteResult] = useState<InviteExecutorsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"link" | "message" | null>(null);

  const parsedEmails = parseEmails(emailInput);

  async function copyText(kind: "link" | "message", value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(kind);
    window.setTimeout(() => setCopiedField(null), 1800);
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (!parsedEmails.length) {
      setError("Add at least one email address to create an invite.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await inviteExecutors(plan.plan_id, { executor_emails: parsedEmails });
      const normalizedResult = {
        ...result,
        share_url: typeof window === "undefined" ? result.share_url : `${window.location.origin}/plan/${plan.plan_id}`,
      };
      setInviteResult(normalizedResult);
      setEmailInput("");
      onPlanUpdated({
        ...plan,
        executor_emails: Array.from(new Set([...plan.executor_emails, ...normalizedResult.invited_emails])),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate invite details");
    } finally {
      setBusy(false);
    }
  }

  const inviteMessage = inviteResult ? `${inviteResult.email_subject}\n\n${inviteResult.email_body}\n\nPlan link: ${inviteResult.share_url}` : "";
  const mailtoHref = inviteResult ? buildMailtoLink(inviteResult) : "";

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
        <Mail className="h-4 w-4 text-accent" />
        Invite Executors
      </div>
      <p className="text-sm leading-6 text-slate-700">
        Anyone with this local demo link can view and update the plan.
      </p>

      <form className="mt-4 space-y-4" onSubmit={submitInvite}>
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Executor Emails
          </label>
          <Textarea
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder="alex@example.com, sam@example.com"
            className="min-h-24 bg-white/80"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Enter one or more emails separated by commas, spaces, or new lines.
          </p>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button disabled={busy || !parsedEmails.length} type="submit" className="w-full sm:w-auto">
            {busy ? <Clock3 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Generate Invite
          </Button>
          {parsedEmails.length ? (
            <span className="text-xs font-medium text-muted-foreground">{parsedEmails.length} recipient{parsedEmails.length === 1 ? "" : "s"} ready</span>
          ) : null}
        </div>
      </form>

      {inviteResult ? (
        <div className="mt-5 space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Invited Emails</div>
            <div className="flex flex-wrap gap-2">
              {inviteResult.invited_emails.map((email) => (
                <Badge key={email} className="border-border/60 bg-white/80 px-3 py-1 text-[11px] text-foreground">
                  {email}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shareable Plan Link</div>
            <div className="rounded-md border border-border/60 bg-white/80 px-3 py-2 text-sm text-slate-700 break-all">
              {inviteResult.share_url}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Subject</div>
            <div className="rounded-md border border-border/60 bg-white/80 px-3 py-2 text-sm text-slate-700">
              {inviteResult.email_subject}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Body</div>
            <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-white/80 px-3 py-3 text-sm leading-6 text-slate-700">
              {inviteResult.email_body}
            </pre>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <SecondaryButton type="button" onClick={() => void copyText("link", inviteResult.share_url)} className="w-full sm:w-auto">
              {copiedField === "link" ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedField === "link" ? "Link Copied" : "Copy Link"}
            </SecondaryButton>
            <SecondaryButton type="button" onClick={() => void copyText("message", inviteMessage)} className="w-full sm:w-auto">
              {copiedField === "message" ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedField === "message" ? "Message Copied" : "Copy Invite Message"}
            </SecondaryButton>
            <Button asChild className="w-full sm:w-auto">
              <a href={mailtoHref}>
                <Mail className="h-4 w-4" />
                Open Mailto Link
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function ExecutionWorkspace({ initialPlan }: { initialPlan: ExecutionPlan }) {
  const [plan, setPlan] = useState(initialPlan);
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;

  const progress = useMemo(() => deriveProgress(plan), [plan]);

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="relative min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 border-b border-border/60 pb-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <FlaskConical className="h-5 w-5" />
                AI SciBuddy Execution Workspace
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{plan.title}</h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">{plan.hypothesis}</p>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">
                This living workspace lets a scientist hand off a reviewed plan to an executor and track what is done, blocked, or ready for review.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Badge className="justify-center border-primary/20 bg-primary/10 px-3 py-1 text-primary">{plan.status.replaceAll("_", " ")}</Badge>
              <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
                {copied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Link copied" : "Copy share link"}
              </Button>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-primary">Progress</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {progress.completedTasks} / {progress.totalTasks} tasks completed
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-3xl font-black text-primary">{progress.progressPercent}%</div>
                {progress.blockedTasks > 0 ? (
                  <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                    {progress.blockedTasks} blocked
                  </div>
                ) : null}
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.progressPercent}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {statusOptions.map((option) => {
                const Icon = statusIcons[option.value];
                return (
                  <div key={option.value} className="rounded-lg border border-border/60 bg-white/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-lg font-black text-slate-900">{progress.counts[option.value]}</div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{option.label}</div>
                      </div>
                      <div className={cn("rounded-md border p-2", option.className)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="p-5">
              <div className="text-sm font-bold uppercase tracking-wider text-primary">Workspace Health</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-white/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Created</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{formatTimestamp(plan.created_at)}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-white/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Update</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{formatTimestamp(plan.updated_at)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-bold uppercase tracking-wider text-primary">Executors</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.executor_emails.length ? (
                  plan.executor_emails.map((email) => (
                    <Badge key={email} className="border-border/60 bg-muted/30 px-3 py-1 text-[11px] text-foreground">
                      {email}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No executors assigned yet.</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                <ShieldAlert className="h-4 w-4 text-accent" />
                Safety Notice
              </div>
              <p className="text-sm leading-6 text-slate-700">{plan.safety_notice}</p>
            </Card>

            <InviteExecutorsPanel plan={plan} onPlanUpdated={setPlan} />
          </div>
        </section>

        <Card className="mb-6 p-5">
          <div className="text-sm font-bold uppercase tracking-wider text-primary">Plan Summary</div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{plan.source_plan_summary}</p>
        </Card>

        <div className="space-y-6">
          {sectionOrder.map((section) => {
            const tasks = plan.tasks[section] ?? [];
            return (
              <Card key={section} className="p-5">
                <div className="mb-4 flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">{section}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{tasks.length} tasks in this section</p>
                  </div>
                  <Badge className="w-fit border-border/60 bg-white/70">{tasks.filter((task) => task.status === "done").length} done</Badge>
                </div>

                {tasks.length ? (
                  <div className="grid gap-4">
                    {tasks.map((task) => (
                      <TaskCard key={task.task_id} task={task} planId={plan.plan_id} onUpdated={setPlan} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
                    No tasks were generated for this section.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
