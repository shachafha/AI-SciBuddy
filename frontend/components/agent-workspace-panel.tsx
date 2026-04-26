"use client";

import { useEffect, useState } from "react";
import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { getFeedback } from "@/lib/api";
import type { ChatMessage, ExperimentPlan, FeedbackRecord, ScientistFeedback, LiteratureQC, LabNode } from "@/lib/types";
import { MessageCircle, History, Zap, Minimize2, Maximize2, CheckCircle2, Star, Send, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

// Context-aware prompt chips per destination
function getChips(activeDestination?: string, selectedLabNode?: LabNode | null): string[] {
  if (activeDestination === "literature_qc") return ["Summarize findings", "Identify gaps", "Find more sources"];
  if (activeDestination === "experiment_plan") return ["Improve clarity", "Suggest controls", "Regenerate section"];
  if (activeDestination === "lab_view") {
    return selectedLabNode
      ? ["Explain this node", "Alternative materials", "Review risks"]
      : ["Suggest workflow improvements", "Add control node", "Review safety"];
  }
  return ["Refine hypothesis", "Assess novelty", "What's next?"];
}

export function AgentWorkspacePanel({
  hypothesis,
  plan,
  qc,
  chatMessages,
  busy,
  onSendMessage,
  onPlanUpdated,
  onFeedbackApplied,
  activeDestination,
  activePlanSection,
  selectedLabNode,
  chatContext = "overview",
}: {
  hypothesis: string;
  plan: ExperimentPlan | null;
  qc: LiteratureQC | null;
  chatMessages: ChatMessage[];
  busy: "qc" | "chat" | "plan" | "launch" | "both" | null;
  onSendMessage: (msg: string) => void;
  onPlanUpdated: (plan: ExperimentPlan) => void;
  onFeedbackApplied?: (feedback: ScientistFeedback) => void;
  activeDestination?: string;
  activePlanSection?: string;
  selectedLabNode?: LabNode | null;
  chatContext?: "overview" | "plan";
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [isExpanded, setIsExpanded] = useState(false);
  const [historyItems, setHistoryItems] = useState<FeedbackRecord[]>([]);

  const isChatBusy = busy === "chat";
  const isGlobalBusy = busy !== null;
  const chips = getChips(activeDestination, selectedLabNode);

  // Sync to chat tab when context changes
  useEffect(() => {
    setActiveTab("chat");
  }, [activeDestination]);

  useEffect(() => {
    getFeedback().then(setHistoryItems).catch(() => setHistoryItems([]));

    const handleFlagNode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.node) {
        onSendMessage(`Flag node [${detail.node.label}]: `);
      }
    };
    window.addEventListener("flag-node", handleFlagNode);
    return () => window.removeEventListener("flag-node", handleFlagNode);
  }, []);

  // Derived context label for the inline strip
  let contextLabel = "Global Workspace";
  let contextSub = "";
  if (activeDestination === "literature_qc") {
    contextLabel = "Literature QC";
    contextSub = qc ? "Verified" : "Pending";
  } else if (activeDestination === "experiment_plan") {
    contextLabel = "Experiment Plan";
    contextSub = activePlanSection ? activePlanSection.charAt(0).toUpperCase() + activePlanSection.slice(1) : "Protocol";
  } else if (activeDestination === "lab_view") {
    contextLabel = "Lab View";
    contextSub = selectedLabNode ? selectedLabNode.label : "Workflow Graph";
  }

  const composerPlaceholder = chatContext === "plan"
    ? (activePlanSection ? `Ask about ${activePlanSection}, request regeneration...` : "Ask about this plan...")
    : (hypothesis ? "Refine hypothesis or ask about literature..." : "Enter a scientific hypothesis to begin...");

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-l border-border/40 shadow-[-4px_0_16px_-8px_rgba(0,0,0,0.08)] transition-all duration-300",
      isExpanded ? "w-[480px]" : "w-[340px]"
    )}>

      {/* ── Header: context pill + tabs + expand ── */}
      <div className="shrink-0 flex items-center gap-1.5 border-b border-border/40 bg-white px-3 py-2">
        
        {/* Mode pill */}
        <div className={cn(
          "shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border transition-all duration-200 mr-1",
          chatContext === "plan"
            ? "bg-primary/5 text-primary border-primary/15"
            : "bg-slate-100 text-slate-400 border-slate-200"
        )}>
          {chatContext === "plan"
            ? <><Zap className="h-2 w-2" /> Plan Agent</>
            : <><FlaskConical className="h-2 w-2" /> Research</>
          }
        </div>

        {/* Tab buttons */}
        <div className="flex flex-1 gap-0.5">
          {(["chat", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
                activeTab === tab
                  ? "bg-slate-100 text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab === "chat" ? <MessageCircle className="h-3 w-3" /> : <History className="h-3 w-3" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-slate-300 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Inline Context Strip (only when context exists) ── */}
      {activeDestination && activeDestination !== "overview" && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 border-b border-border/30">
          <div className="min-w-0 flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{contextLabel}</span>
            {contextSub && (
              <>
                <span className="text-slate-300 text-[10px]">·</span>
                <span className="text-[10px] font-semibold text-slate-600 truncate">{contextSub}</span>
              </>
            )}
          </div>
          {qc && (
            <div className="shrink-0 ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" /> QC
            </div>
          )}
        </div>
      )}

      {/* ── Chat Tab ── */}
      {activeTab === "chat" && (
        <div className="flex flex-col flex-1 min-h-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                {chatContext === "plan" ? (
                  <>
                    <Zap className="h-8 w-8 text-primary/20 mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Plan Agent ready</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[180px] leading-relaxed">Ask about any section, request controls, or trigger a regeneration.</p>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-8 w-8 text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No messages yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[180px] leading-relaxed">Type a hypothesis or ask a question to start.</p>
                  </>
                )}
              </div>
            ) : (
              <ChatMessageList
                messages={chatMessages}
                isTyping={isChatBusy}
                onPromptSelect={onSendMessage}
              />
            )}
          </div>

          {/* Chips */}
          <div className="shrink-0 px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => onSendMessage(chip)}
                disabled={isGlobalBusy}
                className="shrink-0 cursor-pointer rounded-full border border-border/50 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-border/40 p-3 bg-white">
            <ChatComposer
              onSend={onSendMessage}
              disabled={isGlobalBusy}
              placeholder={composerPlaceholder}
            />
          </div>
        </div>
      )}

      {/* ── History Tab ── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto p-4">
          {historyItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <History className="h-8 w-8 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No feedback history</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[180px] leading-relaxed">Saved expert notes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/50 bg-white p-3 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-primary/20" />
                  <div className="flex justify-between items-center text-[10px] font-mono font-semibold text-muted-foreground mb-2 pl-2">
                    <span className="bg-slate-50 border border-border/40 px-1.5 py-0.5 rounded text-primary uppercase">
                      {item.section}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center text-amber-500">
                        <Star className="h-2.5 w-2.5 fill-current mr-0.5" /> {item.rating}
                      </span>
                      <span className="text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 pl-2 line-clamp-4">{item.correction}</p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 pl-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-mono uppercase bg-slate-50 text-slate-500 border border-border/40 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
