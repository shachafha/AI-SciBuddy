import * as React from "react";
import type { ChatMessage } from "@/lib/types";
import { User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white/50 border border-dashed border-border/80 rounded-xl mt-4">
        <Sparkles className="w-8 h-8 text-primary/40 mb-3" />
        <p className="text-sm font-medium text-slate-700">No messages yet.</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Enter a hypothesis below to begin, ask about the novelty of your idea, or generate an experiment plan after reviewing related work.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4 max-h-[60vh] bg-slate-50/50 rounded-xl border border-border/40 mt-4">
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={index}
            className={cn(
              "flex w-full gap-3 max-w-[85%]",
              isUser ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className="flex-shrink-0 mt-1">
              {isUser ? (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>

            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                isUser
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-white border border-border/60 text-slate-800 rounded-tl-sm"
              )}
            >
              {msg.content.split("\n").map((paragraph, i) => (
                <p key={i} className={cn(i > 0 && "mt-2")}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-1 shrink-0" />
    </div>
  );
}
