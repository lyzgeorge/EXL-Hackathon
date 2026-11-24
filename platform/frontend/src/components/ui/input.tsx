import type * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full min-w-0 rounded-md border border-[#CBD5E1] bg-card px-2.5 py-1 text-[13px] shadow-[0_1px_2px_rgba(15,23,42,0.02)] outline-none placeholder:text-[#94A3B8] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/10 disabled:opacity-50";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        field,
        "h-8.5 file:mr-3 file:-ml-1 file:h-6.5 file:rounded file:border file:border-border file:bg-surface file:px-2.5 file:text-xs file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-16 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(field, "h-8.5", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("flex flex-col gap-1.5 text-xs font-semibold text-foreground/90", className)} {...props} />;
}
