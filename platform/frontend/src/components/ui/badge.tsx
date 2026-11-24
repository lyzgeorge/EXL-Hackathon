import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        default: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]",
        secondary: "border-border bg-background text-muted-foreground",
        outline: "border-border bg-card text-foreground/80",
        pass: "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]",
        fail: "border-[#FECDD3] bg-[#FFF1F2] text-[#E11D48]",
        warn: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
        violet: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
