import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border/80 bg-white shadow-sm overflow-hidden", className)} {...props} />;
}

export function Button({
  className,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]",
        className,
      )}
      {...props}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      {...props}
      className={cn("border border-border bg-white text-foreground hover:bg-muted/60 shadow-sm", props.className)}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 w-full resize-y rounded-md border border-border bg-white px-3 py-3 text-sm outline-none shadow-sm transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20",
        props.className,
      )}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none shadow-sm transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none shadow-sm transition focus:ring-2 focus:ring-primary/20",
        props.className,
      )}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-mono border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
}
