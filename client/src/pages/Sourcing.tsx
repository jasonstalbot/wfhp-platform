import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ────────────────────────────────────────────────────────────────────
interface SourcingRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  deals_found: number;
  deals_qualified: number;
  status: "running" | "completed" | "failed";
  error_message: string | null;
}

interface SourcingResult {
  id: number;
  run_id: number;
  project_name: string;
  address: string;
  university: string;
  estimated_beds: number | null;
  estimated_price_m: string | null;
  distance_miles: string | null;
  passed_sieve: boolean;
  fail_reason: string | null;
  source_url: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusColor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (status === "failed") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Sourcing Results Drawer ───────────────────────────────────────────────────
function ResultsPanel({ runId }: { runId: number }) {
  const { data: results, isLoading } = useQuery<SourcingResult[]>({
    queryKey: ["/api/sourcing/runs", runId, "results"],
    queryFn: () => apiRequest("GET", `/api/sourcing/runs/${runId}/results`).then((r) => r.json()),
    refetchInterval: (data) => {
      // Keep polling if no data yet
      return !data ? 2000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="px-6 pb-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="px-6 pb-4 text-sm text-muted-foreground italic">
        No results recorded for this run.
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground">
              <th className="text-left px-3 py-2 font-medium">Project</th>
              <th className="text-left px-3 py-2 font-medium">University</th>
              <th className="text-right px-3 py-2 font-medium">Beds</th>
              <th className="text-right px-3 py-2 font-medium">Price (M)</th>
              <th className="text-right px-3 py-2 font-medium">Miles</th>
              <th className="text-left px-3 py-2 font-medium">Sieve</th>
              <th className="text-left px-3 py-2 font-medium">Fail Reason</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.id}
                className={
                  r.passed_sieve
                    ? "bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                    : "bg-red-500/5 hover:bg-red-500/10 transition-colors"
                }
              >
                <td className="px-3 py-2 text-foreground font-medium max-w-[180px] truncate">
                  {r.project_name || "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">
                  {r.university || "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.estimated_beds ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.estimated_price_m ? `$${parseFloat(r.estimated_price_m).toFixed(1)}M` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.distance_miles ? `${parseFloat(r.distance_miles).toFixed(1)}mi` : "—"}
                </td>
                <td className="px-3 py-2">
                  {r.passed_sieve ? (
                    <span className="text-emerald-400 font-semibold">PASS</span>
                  ) : (
                    <span className="text-red-400 font-semibold">FAIL</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                  {r.fail_reason || "—"}
                </td>
                <td className="px-3 py-2">
                  {r.source_url ? (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:underline truncate block max-w-[120px]"
                    >
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SourcingPage() {
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  const { data: runs, isLoading } = useQuery<SourcingRun[]>({
    queryKey: ["/api/sourcing/runs"],
    queryFn: () => apiRequest("GET", "/api/sourcing/runs").then((r) => r.json()),
    refetchInterval: (data) => {
      // Keep polling while any run is "running"
      const arr = data as SourcingRun[] | undefined;
      if (arr?.some((r) => r.status === "running")) return 3000;
      return false;
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sourcing/run").then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sourcing/runs"] });
    },
  });

  const isRunning = runs?.some((r) => r.status === "running") || triggerMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Deal Sourcing Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Autonomous search for PBSA development opportunities near top flagship universities
          </p>
        </div>
        <Button
          onClick={() => triggerMutation.mutate()}
          disabled={isRunning}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-medium text-sm px-4 py-2"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Running...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              Run Now
            </span>
          )}
        </Button>
      </div>

      {/* Stats summary */}
      {runs && runs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Runs",
              value: runs.length,
            },
            {
              label: "Deals Found",
              value: runs.reduce((s, r) => s + (r.deals_found ?? 0), 0),
            },
            {
              label: "Deals Qualified",
              value: runs.reduce((s, r) => s + (r.deals_qualified ?? 0), 0),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded px-4 py-3"
            >
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Runs table */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Recent Sourcing Runs</span>
          <span className="text-xs text-muted-foreground">Last 20 runs</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !runs || runs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-muted-foreground text-sm">No sourcing runs yet.</div>
            <div className="text-muted-foreground/60 text-xs mt-1">
              Click "Run Now" to start the first sourcing run, or wait for the daily 2am schedule.
            </div>
          </div>
        ) : (
          <div>
            {runs.map((run) => (
              <div key={run.id}>
                {/* Run row */}
                <div
                  className={`flex items-center px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors ${
                    selectedRunId === run.id ? "bg-muted/40" : ""
                  }`}
                  onClick={() =>
                    setSelectedRunId(selectedRunId === run.id ? null : run.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        #{run.id}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded border font-medium ${statusColor(
                          run.status
                        )}`}
                      >
                        {run.status === "running" ? (
                          <span className="flex items-center gap-1">
                            <svg
                              className="animate-spin h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            running
                          </span>
                        ) : (
                          run.status
                        )}
                      </span>
                      {run.error_message && (
                        <span
                          className="text-[11px] text-red-400 truncate max-w-[200px]"
                          title={run.error_message}
                        >
                          {run.error_message}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Started: {fmt(run.started_at)}
                      {run.completed_at && (
                        <span className="ml-3">Completed: {fmt(run.completed_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums text-foreground">
                        {run.deals_found ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">found</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums text-emerald-400">
                        {run.deals_qualified ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">qualified</div>
                    </div>
                    <svg
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        selectedRunId === run.id ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* Expanded results */}
                {selectedRunId === run.id && (
                  <div className="bg-muted/10 border-b border-border pt-3">
                    <ResultsPanel runId={run.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-card/60 border border-border/60 rounded px-4 py-3 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground text-sm mb-1">How it works</div>
        <div>
          The sourcing engine queries the Perplexity API for purpose-built student housing (PBSA)
          developments near the top 20 flagship universities nationwide.
        </div>
        <div>
          Each result is screened against your live Market Sieve config (min beds, max distance,
          max land basis). Qualifying deals are automatically inserted into the Pipeline as
          auto-sourced leads.
        </div>
        <div className="text-muted-foreground/60 pt-1">
          Scheduled daily at 2:00 AM. Requires PERPLEXITY_API_KEY environment variable.
        </div>
      </div>
    </div>
  );
}
