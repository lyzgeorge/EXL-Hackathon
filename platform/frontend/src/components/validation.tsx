import { useQuery } from "@tanstack/react-query";
import type * as React from "react";
import { ErrorText, Panel, RunLink } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type Check, type CheckStatus, type CoefficientRow, type Criterion, type Evidence, get, type Outcome, p, type ValidationBody, type Verdict } from "@/lib/api";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/** For a ratio |Δ| / (atol + rtol·|R|): pass within a tenth of the tolerance, near up to it, fail beyond it. */
export function closeness(ratio: number | null | undefined): "pass" | "near" | "fail" {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "fail";
  return ratio > 1 ? "fail" : ratio > 0.1 ? "near" : "pass";
}

const TONE = { pass: "text-pass font-medium", near: "text-warn-foreground font-medium", fail: "text-destructive font-semibold" };
const STATUS_BADGE = { passed: "pass", failed: "fail", unavailable: "secondary" } as const;

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const pow10 = (exp: number) => `10${String(exp).split("").map((c) => SUP[c] ?? c).join("")}`;

function expected(c: Check): string {
  if (c.kind === "count") return "0";
  if (c.kind === "flag") return "yes";
  if (c.kind === "minimum") return `≥ ${num(c.tolerance)}${c.total !== null ? ` of ${num(c.total)}` : ""}`;
  return `${num(c.atol)} + ${num(c.rtol)}·|R|`;
}

function observed(c: Check): string {
  if (c.status === "unavailable") return "—";
  if (c.kind === "flag") return c.value ? "yes" : "no";
  if (c.kind === "tolerance") return num(c.max_abs_diff);
  return num(c.value);
}

/** Map tolerance ratio (1.0 = limit) onto a 0..100% log scale where 80% is the tolerance limit. */
function logRatioPct(ratio: number | null): number {
  if (ratio === null || Number.isNaN(ratio)) return 0;
  if (!Number.isFinite(ratio)) return 100;
  if (ratio <= 0) return 5;
  const logR = Math.log10(ratio); // 0 is limit (80%), -8 is 0%, +2 is 100%
  const clamped = Math.max(-8, Math.min(2, logR));
  return Math.max(5, Math.round(((clamped + 8) / 10) * 100));
}

function shortCheckLabel(c: Check): string {
  const n = c.name.trim();
  const low = n.toLowerCase();
  if (low === "coefficients" || low === "coefficient estimates") return "Coef";
  if (low === "standard errors" || low === "std_errors" || low === "std errors") return "Std.Err";
  if (low.startsWith("predictions")) {
    const m = n.match(/\(([^)]+)\)/);
    return m ? `Pred (${m[1]})` : "Pred";
  }
  if (low.includes("deviance")) return "Deviance";
  if (low === "aic") return "AIC";
  if (low === "bic") return "BIC";
  if (low.includes("loglik") || low.includes("log_lik")) return "LogLik";
  return n.length > 14 ? `${n.slice(0, 13)}…` : n;
}

/** Compact 4-column ML telemetry KPI strip derived from recorded validation evidence. */
export function ValidationSummary({ v }: { v: ValidationBody }) {
  const required = v.checks.filter((c) => c.required);
  const passed = required.filter((c) => c.passed).length;
  const tolChecks = v.checks.filter((c) => c.kind === "tolerance" && c.status !== "unavailable");

  const coefCheck = tolChecks.find((c) => c.quantity === "coefficients" || /coef/i.test(c.name)) ?? tolChecks[0];
  const predCheck = tolChecks.find((c) => c.quantity === "predictions" || /pred/i.test(c.name));
  const fitness = v.evaluation?.business_fitness;

  const pctPassed = required.length ? Math.round((passed / required.length) * 100) : 0;
  const coefTone = coefCheck ? (coefCheck.status !== "passed" ? "fail" : closeness(coefCheck.value)) : "pass";
  const predTone = predCheck ? (predCheck.status !== "passed" ? "fail" : closeness(predCheck.value)) : "pass";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          <span>Parity checks</span>
          <Badge variant={v.passed ? "pass" : "fail"}>{v.passed ? "pass" : "fail"}</Badge>
        </div>
        <div className={cn("font-mono text-[21px] font-semibold tracking-[-0.03em] tabular-nums", v.passed ? "text-pass" : "text-destructive")}>
          {passed} / {required.length}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#EEF2F6]">
          <div className={cn("h-full rounded-full transition-all", v.passed ? "bg-pass" : "bg-destructive")} style={{ width: `${pctPassed}%` }} />
        </div>
        <div className="flex justify-between font-mono text-[10.5px] text-[#94A3B8]">
          <span>stage: {v.stage}</span>
          <span>{pctPassed}% passed</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          <span>{coefCheck ? shortCheckLabel(coefCheck) : "Coef"} max Δ</span>
          {coefCheck && <Badge variant={STATUS_BADGE[coefCheck.status]}>{coefCheck.status}</Badge>}
        </div>
        <div className={cn("font-mono text-[21px] font-semibold tracking-[-0.03em] tabular-nums", coefTone === "fail" ? "text-destructive" : coefTone === "near" ? "text-warn-foreground" : "text-pass")}>
          {coefCheck ? num(coefCheck.max_abs_diff) : "—"}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#EEF2F6]">
          <div
            className={cn("h-full rounded-full transition-all", coefTone === "fail" ? "bg-destructive" : coefTone === "near" ? "bg-warn" : "bg-pass")}
            style={{ width: `${coefCheck ? logRatioPct(coefCheck.value) : 0}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10.5px] text-[#94A3B8]">
          <span>{coefCheck?.rtol ? `rtol ${num(coefCheck.rtol)}` : "tolerance"}</span>
          <span>{coefCheck?.value !== null && coefCheck?.value !== undefined ? `ratio ${num(coefCheck.value)}` : "—"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          <span>Prediction max Δ</span>
          {predCheck && <Badge variant={predCheck.passed ? "default" : "fail"}>{predCheck.passed ? "exact" : "fail"}</Badge>}
        </div>
        <div className={cn("font-mono text-[21px] font-semibold tracking-[-0.03em] tabular-nums", predTone === "fail" ? "text-destructive" : predTone === "near" ? "text-warn-foreground" : "text-primary")}>
          {predCheck ? num(predCheck.max_abs_diff) : "—"}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#EEF2F6]">
          <div
            className={cn("h-full rounded-full transition-all", predTone === "fail" ? "bg-destructive" : predTone === "near" ? "bg-warn" : "bg-primary")}
            style={{ width: `${predCheck ? logRatioPct(predCheck.value) : 0}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10.5px] text-[#94A3B8]">
          <span>{predCheck?.compared ? `${num(predCheck.compared)} rows` : "response scale"}</span>
          <span>{predCheck?.missing_one_side ? `${predCheck.missing_one_side} miss` : "0 mismatch"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          <span>Business fitness</span>
          {fitness ? <Badge variant={VERDICT_BADGE[fitness.verdict] ?? "warn"}>{fitness.verdict}</Badge> : <Badge variant="secondary">pending</Badge>}
        </div>
        <div className="truncate py-0.5 text-[17px] font-bold tracking-[-0.02em] capitalize text-foreground">
          {fitness ? fitness.verdict : v.passed ? "Parity verified" : "Action needed"}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#EEF2F6]">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              fitness?.verdict === "criteria met" ? "w-full bg-pass" : fitness?.verdict === "criteria not met" ? "w-full bg-destructive" : "w-1/2 bg-warn",
            )}
          />
        </div>
        <div className="flex justify-between font-mono text-[10.5px] text-[#94A3B8]">
          <span>{v.evaluation?.checks ? `${Object.keys(v.evaluation.checks).length} checks` : "validation"}</span>
          <span>{v.evaluation?.missing_evidence?.length ? `${v.evaluation.missing_evidence.length} gaps` : "complete"}</span>
        </div>
      </div>
    </div>
  );
}

/** Intuitive Log10 Relative Deviation bar chart with amber tolerance threshold line. */
export function Log10DeviationChart({ v }: { v: ValidationBody }) {
  const rows = v.checks.filter((c) => c.kind === "tolerance" && c.status !== "unavailable" && c.value !== null);
  if (!rows.length) return null;

  const rtols = rows.map((c) => c.rtol).filter((x): x is number => typeof x === "number" && x > 0);
  const refTol = rtols.length ? rtols[0] : 1e-6;
  const tolExp = Math.round(Math.log10(refTol));
  const minExp = tolExp - 8;

  const labelW = 92;
  const trackW = 224;
  const valueW = 68;
  const viewW = labelW + trackW + valueW + 16;
  const rowH = 30;
  const topPad = 14;
  const chartH = rows.length * rowH;
  const viewH = topPad + chartH + 30;
  const tolX = labelW + trackW * 0.8;

  const tickAt = (offsetExp: number) => labelW + trackW * ((offsetExp - minExp) / 10);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Log10 Relative Deviation</CardTitle>
        <Badge variant="warn">limit {pow10(tolExp)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <svg viewBox={`0 0 ${viewW} ${viewH}`} className="block w-full" role="img" aria-label="Log10 relative deviation against tolerance limit">
          {/* Vertical subtle reference grid */}
          <g stroke="#E2E8F0" strokeWidth="1">
            <line x1={labelW} y1={topPad} x2={labelW} y2={topPad + chartH} />
            <line x1={tickAt(minExp + 3)} y1={topPad} x2={tickAt(minExp + 3)} y2={topPad + chartH} strokeDasharray="2 2" />
            <line x1={tickAt(minExp + 6)} y1={topPad} x2={tickAt(minExp + 6)} y2={topPad + chartH} strokeDasharray="2 2" />
            <line x1={labelW + trackW} y1={topPad} x2={labelW + trackW} y2={topPad + chartH} strokeDasharray="2 2" />
          </g>

          {/* Bars */}
          {rows.map((c, i) => {
            const y = topPad + i * rowH + 5;
            const pct = logRatioPct(c.value);
            const barW = Math.max(8, Math.round((trackW * pct) / 100));
            const isPred = c.quantity === "predictions" || /pred/i.test(c.name);
            const tone = c.status !== "passed" ? "fail" : closeness(c.value);
            const fill =
              tone === "fail" ? "#E11D48" : tone === "near" ? "#D97706" : isPred ? "#2563EB" : "#059669";

            return (
              <g key={c.name}>
                <title>{`${c.name}: |Py − R| = ${num(c.max_abs_diff)}, ratio = ${num(c.value)} (allowed ${expected(c)})`}</title>
                <text
                  x={labelW - 10}
                  y={y + 13}
                  textAnchor="end"
                  fill="#475569"
                  fontFamily="var(--font-mono)"
                  fontSize="10.5"
                  fontWeight="500"
                >
                  {shortCheckLabel(c)}
                </text>
                <rect x={labelW} y={y} width={trackW} height={18} rx="4" fill="#F1F5F9" />
                <rect x={labelW} y={y} width={barW} height={18} rx="4" fill={fill} />
                <text
                  x={labelW + trackW + 8}
                  y={y + 13}
                  fill={fill}
                  fontFamily="var(--font-mono)"
                  fontSize="10"
                  fontWeight="600"
                >
                  {num(c.max_abs_diff)}
                </text>
              </g>
            );
          })}

          {/* Amber dashed tolerance line */}
          <line x1={tolX} y1={topPad - 4} x2={tolX} y2={topPad + chartH + 4} stroke="#D97706" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Clean non-overlapping axis labels */}
          <text x={labelW} y={topPad + chartH + 20} textAnchor="middle" fill="#94A3B8" fontFamily="var(--font-mono)" fontSize="9.5">
            {pow10(minExp)}
          </text>
          <text x={tickAt(minExp + 3)} y={topPad + chartH + 20} textAnchor="middle" fill="#94A3B8" fontFamily="var(--font-mono)" fontSize="9.5">
            {pow10(minExp + 3)}
          </text>
          <text x={tickAt(minExp + 6)} y={topPad + chartH + 20} textAnchor="middle" fill="#94A3B8" fontFamily="var(--font-mono)" fontSize="9.5">
            {pow10(minExp + 6)}
          </text>
          <text x={tolX + 4} y={topPad + chartH + 20} textAnchor="start" fill="#B45309" fontFamily="var(--font-mono)" fontSize="9.5" fontWeight="600">
            {pow10(tolExp)} tol
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}

export function Checks({ v, actions }: { v: ValidationBody; actions?: React.ReactNode }) {
  const required = v.checks.filter((c) => c.required);
  const passed = required.filter((c) => c.passed).length;
  const unavailable = v.checks.filter((c) => c.status === "unavailable").length;
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Parity checks
          <Badge variant={v.passed ? "pass" : "fail"}>{passed} of {required.length} passed</Badge>
          {unavailable > 0 && <Badge variant="secondary">{unavailable} unavailable</Badge>}
        </span>
      }
      actions={actions}
      contentClassName="p-0"
    >
      {v.error && (
        <div className="m-4 rounded-md border border-[#FECDD3] bg-[#FFF1F2] p-3 text-sm">
          <p className="font-semibold text-destructive">The Python code failed at {String(v.error.stage)}: {String(v.error.type)}</p>
          <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-foreground/80">{String(v.error.message ?? "")}</pre>
        </div>
      )}
      {v.checks.length > 0 && (
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Check</TH>
              <TH className="text-right">|Python − R|</TH>
              <TH className="text-right">Allowed</TH>
              <TH className="text-right">Ratio</TH>
              <TH className="text-right">Status</TH>
            </TR>
          </THead>
          <TBody>
            {v.checks.map((c) => {
              const tone = c.status !== "passed" ? "fail" : c.kind === "tolerance" ? closeness(c.value) : "pass";
              const pct = c.kind === "tolerance" && c.status !== "unavailable" ? logRatioPct(c.value) : null;
              return (
                <TR key={c.name} className={cn(!c.required && "text-muted-foreground")}>
                  <TD title={c.reason || undefined}>
                    <span className="font-medium">{c.name}</span>
                    {c.reason && <span className="ml-2 text-xs text-muted-foreground">{c.reason}</span>}
                  </TD>
                  <TD className={cn("text-right font-mono text-xs tabular-nums", c.status !== "unavailable" && TONE[tone])}>{observed(c)}</TD>
                  <TD className="text-right font-mono text-xs tabular-nums text-muted-foreground">{expected(c)}</TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {pct !== null ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="relative inline-block h-1.5 w-16 rounded-full bg-[#E2E8F0]">
                          <span className="absolute -top-0.5 -bottom-0.5 left-[80%] w-[1.5px] bg-warn" />
                          <span
                            className={cn("block h-full rounded-full", tone === "fail" ? "bg-destructive" : tone === "near" ? "bg-warn" : "bg-pass")}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="w-16 text-right">{num(c.value)}</span>
                      </span>
                    ) : (
                      ""
                    )}
                  </TD>
                  <TD className="w-24 text-right"><Badge variant={STATUS_BADGE[c.status]}>{c.status}</Badge></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
      {v.notes.length > 0 && (
        <ul className="border-t border-border bg-surface px-7 py-3 list-disc text-xs text-muted-foreground">{v.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}
    </Panel>
  );
}

export function EvaluationMetrics({ v }: { v: ValidationBody }) {
  const rows = Object.entries(v.metrics ?? {}).flatMap(([set, ks]) =>
    Object.entries(ks).filter(([, x]) => x.r !== null || x.python !== null).map(([k, x]) => ({ set, k, ...x })));
  if (!rows.length) return null;
  return (
    <Panel title="Evaluation metrics" contentClassName="p-0">
      <Table>
        <THead>
          <TR className="hover:bg-transparent"><TH>Metric</TH><TH>Set</TH><TH className="text-right">R</TH><TH className="text-right">Python</TH></TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={`${r.set}-${r.k}`}>
              <TD className="font-medium capitalize">{r.k.replaceAll("_", " ")}</TD>
              <TD><Badge variant="secondary">{r.set}</Badge></TD>
              <TD className="text-right font-mono text-xs tabular-nums">{num(r.r)}</TD>
              <TD className="text-right font-mono text-xs tabular-nums font-medium text-foreground">{num(r.python)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Panel>
  );
}

const CHECKS = [
  ["baseline_comparison", "Baseline comparison"], ["calibration", "Calibration"],
  ["subgroup_performance", "Subgroup performance"], ["stability", "Stability"], ["sensitivity", "Sensitivity"],
  ["assumptions", "Model assumptions"], ["sample_suitability", "Sample suitability"],
  ["decision_performance", "Decision performance"],
] as const;
const CHECK_BADGE: Record<CheckStatus, "default" | "warn" | "secondary"> = {
  executed: "default", "partially executed": "warn", "not executed": "warn", "not planned": "secondary", "not applicable": "secondary",
};
const OUTCOME_BADGE: Record<Outcome, "pass" | "fail" | "warn"> = { met: "pass", "not met": "fail", "no criterion": "warn", "not judged": "warn" };
const VERDICT_BADGE: Record<Verdict, "pass" | "fail" | "warn"> = { "criteria met": "pass", "criteria not met": "fail", "not established": "warn" };

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

function CriterionLine({ c }: { c: Criterion }) {
  const values = Object.entries(c.value ?? {}).filter(([, x]) => x !== null);
  return (
    <div className="mt-auto flex flex-col gap-1.5 border-t border-border/70 pt-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={OUTCOME_BADGE[c.outcome] ?? "warn"}>{c.outcome}</Badge>
        {c.rule && <span className="font-mono text-[11px] text-muted-foreground">{c.rule.replaceAll(">=", "≥").replaceAll("<=", "≤")}</span>}
      </div>
      {values.length > 0 && (
        <dl className="grid grid-cols-[1fr_max-content] gap-x-3 gap-y-0.5">
          {values.map(([k, x]) => (
            <div key={k} className="contents">
              <dt className="truncate text-[11px] text-muted-foreground">{k.replaceAll("_", " ")}{c.judged_on?.length ? ` · ${c.judged_on.join(", ")}` : ""}</dt>
              <dd className="text-right font-mono text-[11.5px] font-semibold tabular-nums text-foreground">{num(x)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Every model validation check: how far it ran, its criterion's outcome, its plots, and the business fitness verdict. */
export function ModelValidation({ pid, v }: { pid: string; v: Evidence<ValidationBody> }) {
  const ev = v.body.evaluation;
  if (!ev?.checks) return null;
  const plots = (v.body.plots ?? []).filter((x) => x.section.startsWith("validation."));
  const fitness = ev.business_fitness;
  const missing = ev.missing_evidence ?? [];
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Model validation
          {fitness && <Badge variant={VERDICT_BADGE[fitness.verdict] ?? "warn"}>Business fitness: {fitness.verdict}</Badge>}
        </span>
      }
      actions={<RunLink pid={pid} runId={v.body.mlflow_run_id} evidenceId={v.id} />}
    >
      <div className="flex flex-col gap-5">
        {fitness && fitness.basis.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">{fitness.basis.map((b) => <li key={b}>{b}</li>)}</ul>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CHECKS.map(([k, title]) => {
            const c = ev.checks[k];
            if (!c) return null;
            const needs = c.needs ?? [];
            return (
              <div key={k} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{title}</span>
                  <Badge variant={CHECK_BADGE[c.status] ?? "secondary"}>{capital(c.status)}</Badge>
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">{c.rationale}</p>
                {c.criterion && <CriterionLine c={c.criterion} />}
                {needs.length > 0 && <p className="font-mono text-[11px] text-warn-foreground">Needs {needs.join("; ")}.</p>}
              </div>
            );
          })}
        </div>
        {plots.length > 0 && (
          <div className="grid gap-4 xl:grid-cols-2">
            {plots.map((x) => (
              <figure key={x.name} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
                <img src={p(pid, `/evidence/${v.id}/plots/${x.name}`)} alt={x.title} className="w-full" loading="lazy" />
              </figure>
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-sm">
            <p className="mb-1 text-xs font-semibold text-warn-foreground">Missing evidence</p>
            <ul className="list-disc pl-5 text-xs text-warn-foreground/90">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function Coefficients({ pid, evidenceId }: { pid: string; evidenceId: string }) {
  const q = useQuery({
    queryKey: ["coefficients", pid, evidenceId],
    queryFn: () => get<{ python: boolean; terms: CoefficientRow[] }>(p(pid, `/evidence/${evidenceId}/coefficients`)),
    staleTime: Infinity,
  });
  if (!q.data) return <ErrorText error={q.error} />;
  if (!q.data.terms.length) return null;
  const py = q.data.python;
  const ratio = (row: CoefficientRow, key: "estimate_ratio" | "std_error_ratio") => {
    const both = row.r_estimate !== undefined && row.python_estimate !== undefined;
    const value = row[key];
    return (
      <TD className={cn("text-right font-mono text-xs tabular-nums", TONE[both ? closeness(value ?? Infinity) : "fail"])}>
        {!both ? "missing" : value === null ? "∞" : num(value)}
      </TD>
    );
  };
  return (
    <Panel title="Coefficients" contentClassName="p-0">
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Term</TH>
            <TH className="text-right">R estimate</TH>
            {py && <TH className="text-right">Python estimate</TH>}
            {py && <TH className="text-right">Ratio</TH>}
            <TH className="text-right">R std error</TH>
            {py && <TH className="text-right">Python std error</TH>}
            {py && <TH className="text-right">Ratio</TH>}
          </TR>
        </THead>
        <TBody>
          {q.data.terms.map((t) => (
            <TR key={t.term}>
              <TD className="font-mono text-xs font-medium">{t.term}</TD>
              <TD className="text-right font-mono text-xs tabular-nums">{num(t.r_estimate)}</TD>
              {py && <TD className="text-right font-mono text-xs tabular-nums">{num(t.python_estimate)}</TD>}
              {py && ratio(t, "estimate_ratio")}
              <TD className="text-right font-mono text-xs tabular-nums">{num(t.r_std_error)}</TD>
              {py && <TD className="text-right font-mono text-xs tabular-nums">{num(t.python_std_error)}</TD>}
              {py && ratio(t, "std_error_ratio")}
            </TR>
          ))}
        </TBody>
      </Table>
    </Panel>
  );
}
