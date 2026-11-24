import type * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-[12.5px]", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-surface [&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

export function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-[#F1F5F9] transition-colors hover:bg-[#F8FAFC]", className)} {...props} />;
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-9 px-3 text-left align-middle font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap text-[#94A3B8]",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}
