import { diffLines } from "diff";
import { Check, ChevronDown, Copy, ExternalLink } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMlflow, useTrackingRun } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className={className}>
      {(title || actions) && (
        <CardHeader className={cn(!open && "border-b-0")}>
          <CardTitle>
            <button className="flex cursor-pointer items-center gap-2 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
              <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
              {title}
            </button>
          </CardTitle>
          {open && actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      {open && <CardContent className={contentClassName}>{children}</CardContent>}
    </Card>
  );
}

export function Fields({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[12.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-mono text-[11px] font-medium text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words text-foreground">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn("rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11.5px] text-foreground", className)}>
      {children}
    </code>
  );
}

export function Code({
  code,
  filename,
  meta,
  className,
}: {
  code: string;
  filename?: string;
  meta?: string;
  className?: string;
}) {
  const lines = code.replace(/\n$/, "").split("\n");
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(code).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  });
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-[#FAFBFC]">
      {filename && (
        <div className="flex items-center justify-between border-b border-border bg-[#F1F5F9] px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <strong className="font-semibold text-foreground">{filename}</strong>
          <span>{meta ?? `${lines.length} lines`}</span>
        </div>
      )}
      <button
        aria-label="Copy"
        onClick={copy}
        className={cn(
          "absolute right-2 z-10 grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-card text-muted-foreground opacity-0 shadow-xs transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100",
          filename ? "top-10" : "top-2",
        )}
      >
        {copied ? <Check className="size-3.5 text-pass" /> : <Copy className="size-3.5" />}
      </button>
      <pre className={cn("max-h-[34rem] overflow-auto py-2.5 font-mono text-[11.5px] leading-[1.65] text-foreground", className)}>
        {lines.map((l, i) => (
          <div key={i} className="flex hover:bg-[#F1F5F9]/70">
            <span className="w-10 shrink-0 select-none pr-3 text-right text-[#94A3B8]">{i + 1}</span>
            <span className="whitespace-pre pr-4">{l || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/** The decision a step is waiting on, kept in view at the bottom of the step while its evidence scrolls. */
export function ActionBar({ tone, children }: { tone?: "pass" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "sticky -bottom-5 z-10 flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-[0_6px_20px_rgba(15,23,42,0.08)]",
        tone === "pass" && "border-[#A7F3D0] border-l-[3px] border-l-pass bg-gradient-to-r from-[#ECFDF5] via-card to-card",
        tone === "warn" && "border-[#FDE68A] border-l-[3px] border-l-warn bg-gradient-to-r from-[#FFFBEB] via-card to-card",
        !tone && "border-l-[3px] border-l-primary",
      )}
    >
      {children}
    </div>
  );
}

export function Diff({ before, after }: { before: string; after: string }) {
  const parts = diffLines(before, after);
  return (
    <pre className="max-h-[34rem] overflow-auto rounded-lg border border-border bg-[#FAFBFC] py-2 font-mono text-[11.5px] leading-[1.65]">
      {parts.flatMap((part, i) =>
        part.value.replace(/\n$/, "").split("\n").map((l, j) => (
          <div
            key={`${i}-${j}`}
            className={cn(
              "whitespace-pre px-3",
              part.added && "bg-[#ECFDF5] text-[#065F46]",
              part.removed && "bg-[#FFF1F2] text-[#9F1239]",
            )}
          >
            {part.added ? "+ " : part.removed ? "- " : "  "}
            {l}
          </div>
        )),
      )}
    </pre>
  );
}

/** Markdown; relative image paths resolve against `assets`, the URL the document's files are served from. */
export function Prose({ markdown, assets }: { markdown: string; assets?: string }) {
  return (
    <div
      className={cn(
        "max-w-none text-[13px] leading-6 break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_h1]:mb-4 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-[15px] [&_h2]:font-semibold",
        "[&_p]:my-2.5 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-[#FAFBFC] [&_pre]:p-3 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-mono [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:text-muted-foreground [&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-xs [&_th]:border-b [&_th]:bg-surface [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10.5px] [&_th]:uppercase [&_th]:text-muted-foreground [&_td]:border-b [&_td]:border-[#F1F5F9] [&_td]:px-2.5 [&_td]:py-1.5",
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            <img src={assets && typeof src === "string" && !/^[a-z]+:|^\//i.test(src) ? `${assets}/${src}` : src} alt={alt} className="my-3 w-full max-w-3xl rounded-lg border border-border bg-card" loading="lazy" />
          ),
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:text-[#1D4ED8]">{children}</a>,
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}

/** The project's experiment or a run, whose ID may become available after the evidence was loaded. */
export function RunLink({ pid, runId, evidenceId, children = "MLflow" }: {
  pid: string; runId?: string | null; evidenceId?: string; children?: React.ReactNode;
}) {
  const tracked = useTrackingRun(pid, runId ? undefined : evidenceId);
  const resolved = runId ?? tracked;
  const ready = Boolean(resolved) || (runId === undefined && !evidenceId);
  const m = useMlflow(pid, ready);
  if (!m.data || !ready) return null;
  const url = `${m.data.url}/#/experiments/${m.data.experiment_id}${resolved ? `/runs/${resolved}` : ""}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-[5px] border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6D28D9] transition-colors hover:bg-[#EDE9FE]"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

/** Technical ids and hashes, folded away under the content they identify. */
export function Details({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <details className="rounded-md border border-border bg-surface/70 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-mono text-[11px] font-medium text-muted-foreground select-none hover:text-foreground">
        Details
      </summary>
      <div className="mt-2.5 border-t border-border pt-2.5"><Fields rows={rows} /></div>
    </details>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="text-xs font-medium text-destructive">{error instanceof Error ? error.message : String(error)}</p>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-muted-foreground">{children}</p>;
}
