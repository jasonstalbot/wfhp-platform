import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";

interface DashboardStats {
  total: number;
  newCount: number;
  inScreen: number;
  goldValidation: number;
  loi: number;
  rejected: number;
  goDeals: number;
  totalPar: number;
}

interface ActivityItem {
  id: number;
  action: string;
  detail: string | null;
  timestamp: string;
}

function fmt$(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="panel">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className={`font-mono text-2xl font-semibold tabular-nums ${accent || "text-yellow-400"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });
  const { data: activity } = useQuery<ActivityItem[]>({ queryKey: ["/api/activity"] });

  const activityItems = (activity || []).slice(0, 12);

  const actionLabels: Record<string, string> = {
    created: "Lead created",
    updated: "Lead updated",
    step1_pass: "Step 1 passed",
    step1_fail: "Step 1 killed",
    step2_pass: "Step 2 scored",
    step2_fail: "Step 2 killed",
    gold_memo_created: "Gold Memo issued",
    loi_issued: "LOI issued",
    call_logged: "Broker call logged",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Command Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Welcome back, {user?.name?.split(" ")[0]}. Live deal pipeline.</p>
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Top stats */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[...Array(8)].map((_, i) => <div key={i} className="panel h-20 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total Leads" value={stats?.total ?? 0} sub="In pipeline" />
            <StatCard label="New / Unscreened" value={stats?.newCount ?? 0} sub="Awaiting Step 1" accent="text-zinc-300" />
            <StatCard label="Step 2 / Scoring" value={stats?.inScreen ?? 0} sub="Awaiting score" accent="text-purple-400" />
            <StatCard label="Gold Validation" value={stats?.goldValidation ?? 0} sub="Step 3 deep dive" accent="text-sky-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Active LOIs" value={stats?.loi ?? 0} sub="Under LOI" accent="text-sky-400" />
            <StatCard label="Rejected" value={stats?.rejected ?? 0} sub="Killed / logged" accent="text-red-400" />
            <StatCard label="GO Deals" value={stats?.goDeals ?? 0} sub="Bond model GO" accent="text-green-400" />
            <StatCard label="Total Bond Par" value={stats?.totalPar ? fmt$(stats.totalPar) : "$0"} sub="Modeled deals" />
          </div>
        </>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Pipeline funnel */}
        <div className="col-span-1 panel">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Deal Funnel</div>
          {[
            { label: "Lead Intake", value: stats?.total ?? 0, color: "bg-zinc-500" },
            { label: "Step 1 Screen", value: Math.max(0, (stats?.total ?? 0) - (stats?.newCount ?? 0)), color: "bg-purple-500" },
            { label: "Step 2 Score", value: (stats?.goldValidation ?? 0) + (stats?.loi ?? 0) + 1, color: "bg-sky-500" },
            { label: "Gold Validation", value: (stats?.goldValidation ?? 0) + (stats?.loi ?? 0), color: "bg-yellow-500" },
            { label: "LOI Issued", value: stats?.loi ?? 0, color: "bg-green-500" },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <div className="text-xs text-muted-foreground w-28 shrink-0">{row.label}</div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.value > 0 ? Math.max(8, (row.value / Math.max(stats?.total ?? 1, 1)) * 100) : 0}%` }} />
              </div>
              <div className="font-mono text-xs text-muted-foreground w-6 text-right">{row.value}</div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div className="col-span-2 panel">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</div>
          {activityItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet. Start by adding leads in the Intake module.</p>
          ) : (
            <div className="space-y-0">
              {activityItems.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground">{actionLabels[a.action] || a.action}</span>
                    {a.detail && <span className="text-xs text-muted-foreground ml-1">— {a.detail.substring(0, 60)}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key benchmarks */}
      <div className="mt-4 panel">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">WFHP Program Benchmarks</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { label: "Min Beds", value: "800+" },
            { label: "Min Bond Par", value: "$100M" },
            { label: "Target DSCR", value: "≥1.25x" },
            { label: "Land Basis Target", value: "<$10M" },
            { label: "University Proximity", value: "<1 mi" },
            { label: "Min FMV Lift", value: "2.0x" },
          ].map(b => (
            <div key={b.label} className="text-center">
              <div className="font-mono text-sm font-semibold text-yellow-400">{b.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
