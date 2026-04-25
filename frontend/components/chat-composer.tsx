import * as React from "react";
import { Button } from "@/components/ui";
import { SendHorizontal, Loader2 } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export function ChatComposer({ onSend, disabled, placeholder }: ChatComposerProps) {
  const [input, setInput] = React.useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Enter a hypothesis or ask a follow-up about the related work…"}
        className="min-h-[80px] w-full resize-none border-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
        disabled={disabled}
        aria-label="Chat input"
      />
      <div className="flex justify-between items-center px-2">
        <span className="text-[10px] text-muted-foreground/60 font-mono">
          Return to send, Shift+Return for newline
        </span>
        <Button
          type="submit"
          disabled={!input.trim() || disabled}
          className="h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 shadow-sm transition-all"
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Send
              <SendHorizontal className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
