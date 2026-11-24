import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(37,99,235,0.2)] hover:bg-[#1D4ED8]",
        pass: "bg-pass text-white shadow-[0_1px_2px_rgba(5,150,105,0.2)] hover:bg-[#047857]",
        destructive: "bg-destructive text-white shadow-xs hover:bg-[#BE123C]",
        outline: "border border-[#CBD5E1] bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:bg-background",
        secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-[#E2E8F0]/70",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: { default: "h-8 px-3.5 py-1.5", sm: "h-7 px-2.5 text-xs", lg: "h-9 px-5 text-sm", icon: "size-8" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({ className, variant, size, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export function LinkButton({ className, variant, size, ...props }: React.ComponentProps<"a"> & VariantProps<typeof buttonVariants>) {
  return <a className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
