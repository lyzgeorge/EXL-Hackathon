import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { ActionBar, Code, Details, ErrorText, Fields, Mono, Muted, Panel, RunLink } from "@/components/common";
import { Checks, Coefficients, EvaluationMetrics, Log10DeviationChart, ModelValidation, ValidationSummary } from "@/components/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { type Bindings, get, p, post, type SpecVersion } from "@/lib/api";
import { type Attempt, useAttempts } from "@/lib/attempts";
import { short } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StepProps } from "@/pages/Project";

export function useSpec(pid: string, version: number | null) {
  return useQuery({
    queryKey: ["spec", pid, version],
    queryFn: () => get<SpecVersion>(p(pid, `/specs/${version}`)),
    enabled: version !== null,
    staleTime: Infinity,
  });
}

export function AttemptTabs({ attempts, picked, onPick }: { attempts: Attempt[]; picked: number; onPick: (i: number) => void }) {
  if (attempts.length < 2) return null;
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-background p-0.5">
      {attempts.map((a, i) => (
        <button
          key={a.candidate.id}
          onClick={() => onPick(i)}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            i === picked ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              !a.validation ? "bg-[#CBD5E1]" : a.validation.body.passed ? "bg-pass" : "bg-destructive",
            )}
          />
          Attempt {a.candidate.body.attempt}
        </button>
      ))}
    </div>
  );
}

export function Translation({ project, rev }: StepProps) {
  const s = project.state;
  const { attempts, loading } = useAttempts(project, rev);
  const spec = useSpec(project.id, s.spec_version);
  const [picked, setPicked] = useState<number>();
  if (!attempts.length) return loading || s.status === "working" ? null : <Muted>No Python migration under the current model specification yet.</Muted>;
  const i = picked !== undefined && picked < attempts.length ? picked : attempts.length - 1;
  const a = attempts[i];
  const v = a.validation;
  const reviewing = s.step === 4 && s.reason === "candidate_passed" && v?.id === s.validation_id;
  const hasTolChart = Boolean(v?.body.checks.some((c) => c.kind === "tolerance" && c.status !== "unavailable" && c.value !== null));

  return (
    <>
      {(spec.data || attempts.length > 1) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex min-w-0 flex-col gap-1.5">
            {spec.data && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">
                    {spec.data.spec.r_function} → {spec.data.spec.python_implementation}
                  </Badge>
                  {spec.data.spec.family && (
                    <Badge variant="secondary">
                      {spec.data.spec.family}{spec.data.spec.link ? ` (${spec.data.spec.link})` : ""}
                    </Badge>
                  )}
                </div>
                {spec.data.spec.formula && (
                  <div className="inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-[5px] border border-border bg-background px-2.5 py-1 font-mono text-[11.5px]">
                    <span className="shrink-0 text-muted-foreground">formula</span>
                    <strong className="font-semibold text-primary">{spec.data.spec.formula}</strong>
                  </div>
                )}
              </>
            )}
          </div>
          <AttemptTabs attempts={attempts} picked={i} onPick={setPicked} />
        </div>
      )}

      {v && <ValidationSummary v={v.body} />}

      {v && (
        <div className={cn("grid gap-4", hasTolChart && "xl:grid-cols-[1.35fr_1fr] xl:items-start")}>
          <Checks v={v.body} actions={<RunLink pid={project.id} runId={v.body.mlflow_run_id} evidenceId={v.id} />} />
          {hasTolChart && <Log10DeviationChart v={v.body} />}
        </div>
      )}

      <Panel
        title={
          <span className="flex items-center gap-2">
            Python migration · attempt {a.candidate.body.attempt}
            <Badge variant="secondary">{short(a.candidate.body.hash, 8)}</Badge>
          </span>
        }
        actions={<RunLink pid={project.id} runId={a.candidate.body.mlflow_run_id} evidenceId={a.candidate.id} />}
      >
        <div className="flex flex-col gap-4">
          <Fields rows={[
            ["Python implementation", spec.data && <Mono>{spec.data.spec.python_implementation}</Mono>],
            ["Code generated by", <>{a.candidate.body.model} <span className="text-muted-foreground">(LLM)</span></>],
            ["Changes", a.candidate.body.changes || null],
          ]} />
          {a.candidate.body.notes.length > 0 && <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-muted-foreground">{a.candidate.body.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          {(a.candidate.body.limitations ?? []).length > 0 && (
            <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-warn-foreground">
              <ul className="list-disc space-y-1 pl-4">{a.candidate.body.limitations!.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="min-w-0">
              {spec.data && <Code code={spec.data.spec.baseline_r} filename="baseline.R" meta="R reference" />}
            </div>
            <div className="min-w-0">
              <Code code={a.candidate.body.module} filename="model.py" meta={`Attempt ${a.candidate.body.attempt} · ${short(a.candidate.body.hash, 8)}`} />
            </div>
          </div>
          <Details rows={[
            ["Candidate", a.candidate.id],
            ["Code hash", <Mono>{short(a.candidate.body.hash)}</Mono>],
            ["Validation", v?.id ?? null],
          ]} />
        </div>
      </Panel>

      {v?.body.stage === "parity" && (
        <>
          <EvaluationMetrics v={v.body} />
          <ModelValidation pid={project.id} v={v} />
          <Coefficients pid={project.id} evidenceId={v.id} />
        </>
      )}
      {!v && s.status !== "working" && <Muted>This attempt did not run.</Muted>}
      {reviewing && <Review project={project} rev={rev} />}
    </>
  );
}

function Review({ project }: StepProps) {
  const qc = useQueryClient();
  const s = project.state;
  const bindings: Bindings = { spec_version: s.spec_version!, baseline_id: s.baseline_id!, candidate_hash: s.candidate_hash!, validation_id: s.validation_id! };
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const done = () => qc.invalidateQueries({ queryKey: ["project", project.id] });
  const approve = useMutation({ mutationFn: () => post(p(project.id, "/approve"), bindings), onSuccess: done });
  const reject = useMutation({ mutationFn: () => post(p(project.id, "/reject"), { bindings, comment }), onSuccess: done });
  return (
    <ActionBar tone="pass">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CircleCheck className="size-4 text-pass" />
            <span className="text-[13px] font-semibold">Parity checks passed</span>
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-[10.5px] text-muted-foreground">
            <span className="rounded border border-border bg-card/80 px-1.5 py-0.5">spec: v{bindings.spec_version}</span>
            <span className="rounded border border-border bg-card/80 px-1.5 py-0.5">candidate: {short(bindings.candidate_hash, 8)}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {!rejecting && <Button variant="outline" onClick={() => setRejecting(true)}>Reject</Button>}
          <Button variant="pass" disabled={approve.isPending} onClick={() => approve.mutate()}>Accept Migration</Button>
        </div>
      </div>
      {rejecting && (
        <div className="flex flex-col gap-2">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What is wrong with it?" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!comment.trim() || reject.isPending} onClick={() => reject.mutate()}>Reject & Diagnose</Button>
          </div>
        </div>
      )}
      <ErrorText error={approve.error || reject.error} />
    </ActionBar>
  );
}
