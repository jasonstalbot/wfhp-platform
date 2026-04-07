import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const KILL_REASONS = [
  "MARKET_WEAK","TOO_FAR","NO_DENSITY","ENROLLMENT_DOWN",
  "NO_TEFRA_PATH","PRICE_TOO_HIGH","PIPELINE_OVERSUPPLY",
  "NET_OUTMIGRATION","ENTITLEMENT_RISK","OTHER",
];

const STEP1_GATES = [
  { key: "marketRank", label: "Market Rank", threshold: "Top 20 per WFHP Scorecard", dataSource: "WFHP Market Scorecard" },
  { key: "proximity", label: "University Proximity", threshold: "<1 mile from flagship AND 20k+ enrollment", dataSource: "Maps + University stats" },
  { key: "siteSize", label: "Site Size / Density", threshold: "4+ acres AND zoning supports 100+ units/acre", dataSource: "County zoning + records" },
  { key: "enrollment", label: "Enrollment Trend", threshold: "+3% 5-yr avg AND no declines", dataSource: "University datasets" },
  { key: "tefraHistory", label: "TEFRA History", threshold: "Issuer has 2+ deals in last 5 years", dataSource: "TEFRA Deals file" },
  { key: "priceSanity", label: "Price Sanity", threshold: "<$10M acquisition target", dataSource: "Listing / broker" },
];

const SCORE_METRICS = [
  { key: "bedGap", label: "Bed Gap", weight: 10, score5: ">5,000 unmet beds", score1: "<1,000 unmet beds" },
  { key: "rentLevels", label: "Rent Levels / Growth", weight: 10, score5: ">$1,500/bed/mo AND +3% 3-yr growth", score1: "<$1,000 or declining" },
  { key: "pipelineConstraint", label: "Pipeline Constraint", weight: 10, score5: "Built-out infill / supply constrained", score1: "Heavy deliveries" },
  { key: "issuerReceptivity", label: "Issuer / 501(c)(3) Receptivity", weight: 10, score5: "Proven active conduit behavior", score1: "No history / friction" },
  { key: "populationMigration", label: "Population / Net Migration", weight: 10, score5: "+5% 5-yr growth", score1: "Declining" },
];

export default function ScreenPage() {
  const { toast } = useToast();
  const { data: leads = [] } = useQuery({ queryKey: ["/api/leads"] });
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Gates, setStep1Gates] = useState<Record<string, boolean>>({});
  const [killReason, setKillReason] = useState("MARKET_WEAK");
  const [step2Scores, setStep2Scores] = useState<Record<string, number>>({
    bedGap: 3, rentLevels: 3, pipelineConstraint: 3, issuerReceptivity: 3, populationMigration: 3,
  });

  const step1Mut = useMutation({
    mutationFn: ({ id, pass, notes, killReason }: any) => apiRequest("POST", `/api/leads/${id}/step1`, { pass, notes, killReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const pass = Object.values(step1Gates).every(v => v);
      toast({ title: pass ? "Step 1 Passed" : "Lead Killed", description: pass ? "Advance to Step 2 scoring." : `Kill reason: ${killReason}` });
      setSelectedLead(null);
    },
  });

  const step2Mut = useMutation({
    mutationFn: ({ id, ...scores }: any) => apiRequest("POST", `/api/leads/${id}/step2`, scores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const total = Object.values(step2Scores).reduce((s, v) => s + v, 0);
      toast({ title: total >= 15 ? "Step 2 Passed — Gold Validation" : "Lead Killed", description: `Score: ${total}/25` });
      setSelectedLead(null);
    },
  });

  const queue = (leads as any[]).filter((l: any) => l.disposition === "New" || l.disposition === "Pass");
  const allGatesPass = STEP1_GATES.every(g => step1Gates[g.key]);
  const step2Total = Object.values(step2Scores).reduce((s, v) => s + v, 0);
  const step2Pass = step2Total >= 15; // 15/25 ≈ 35/50 threshold

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Module 2 — Screening Engine</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Step 1: Hard filter (yes/no). Step 2: Weighted score (threshold ≥15/25). Kill fast, advance gold.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Queue */}
        <div className="col-span-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Screening Queue ({queue.length})</div>
          <div className="space-y-2">
            {queue.length === 0 && (
              <div className="panel text-xs text-muted-foreground">No leads awaiting screening. Add leads in the Intake module.</div>
            )}
            {queue.map((l: any) => (
              <button key={l.id} data-testid={`button-screen-${l.id}`}
                onClick={() => { setSelectedLead(l); setStep(l.step1Pass === 1 ? 2 : 1); setStep1Gates({}); }}
                className={`w-full text-left panel p-3 hover:border-yellow-400/50 transition-colors ${selectedLead?.id === l.id ? "border-yellow-400/50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-yellow-400">{l.leadId}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${l.step1Pass === 1 ? "badge-watch" : "badge-new"}`}>
                    {l.step1Pass === 1 ? "Step 2" : "Step 1"}
                  </span>
                </div>
                <div className="text-sm text-foreground truncate">{l.address}</div>
                <div className="text-xs text-muted-foreground">{l.city}, {l.state}</div>
                {l.askingPrice && <div className="text-xs text-yellow-400/70 mt-1 font-mono">${(l.askingPrice/1e6).toFixed(1)}M asking</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Screen panel */}
        <div className="col-span-2">
          {!selectedLead ? (
            <div className="panel h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a lead from the queue to begin screening.</p>
            </div>
          ) : (
            <div className="panel">
              {/* Lead header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <div className="font-mono text-xs text-yellow-400 mb-0.5">{selectedLead.leadId}</div>
                  <div className="text-base font-semibold">{selectedLead.address}, {selectedLead.city}, {selectedLead.state}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {selectedLead.universityName} · {selectedLead.universityDistanceMiles} mi ·{" "}
                    {selectedLead.acres} acres · ${selectedLead.askingPrice ? (selectedLead.askingPrice/1e6).toFixed(1) + "M" : "—"} asking
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2].map(s => (
                    <button key={s} onClick={() => setStep(s as 1 | 2)}
                      className={`text-xs px-3 py-1 rounded ${step === s ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30" : "border border-border text-muted-foreground"}`}>
                      Step {s}
                    </button>
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Step 1 — Hard Filter (5-min Yes/No)</div>
                  <div className="text-xs text-muted-foreground mb-4">Rule: If ANY item is No → REJECT. All must pass to advance.</div>
                  <div className="space-y-3 mb-5">
                    {STEP1_GATES.map(g => (
                      <div key={g.key} className="flex items-start gap-3 p-3 bg-muted/30 rounded">
                        <div className="flex gap-2 mt-0.5 shrink-0">
                          <button onClick={() => setStep1Gates({...step1Gates, [g.key]: true})}
                            className={`text-xs px-2 py-0.5 rounded border ${step1Gates[g.key] === true ? "bg-green-500/20 text-green-400 border-green-500/30" : "border-border text-muted-foreground"}`}>
                            YES
                          </button>
                          <button onClick={() => setStep1Gates({...step1Gates, [g.key]: false})}
                            className={`text-xs px-2 py-0.5 rounded border ${step1Gates[g.key] === false ? "bg-red-500/20 text-red-400 border-red-500/30" : "border-border text-muted-foreground"}`}>
                            NO
                          </button>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{g.label}</div>
                          <div className="text-xs text-muted-foreground">{g.threshold}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">Source: {g.dataSource}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!allGatesPass && Object.values(step1Gates).some(v => v === false) && (
                    <div className="mb-4">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Kill Reason</label>
                      <select value={killReason} onChange={e => setKillReason(e.target.value)}
                        className="bg-background border border-border rounded px-3 py-2 text-sm w-full focus:outline-none">
                        {KILL_REASONS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => step1Mut.mutate({ id: selectedLead.id, pass: allGatesPass, killReason })}
                      disabled={Object.keys(step1Gates).length < 6 || step1Mut.isPending}
                      className={`px-5 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-40 ${allGatesPass ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"}`}>
                      {allGatesPass ? "✓ Pass — Advance to Step 2" : "✗ Kill Lead"}
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Step 2 — Weighted Score (Threshold ≥15/25)</div>
                  <div className="space-y-4 mb-5">
                    {SCORE_METRICS.map(m => (
                      <div key={m.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{m.label}</span>
                          <span className={`font-mono text-sm font-semibold ${step2Scores[m.key] >= 4 ? "text-green-400" : step2Scores[m.key] <= 2 ? "text-red-400" : "text-yellow-400"}`}>
                            {step2Scores[m.key]}/5
                          </span>
                        </div>
                        <input type="range" min={1} max={5} step={1}
                          value={step2Scores[m.key]}
                          onChange={e => setStep2Scores({...step2Scores, [m.key]: parseInt(e.target.value)})}
                          className="w-full accent-yellow-400" />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                          <span>{m.score1}</span>
                          <span>{m.score5}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Score summary */}
                  <div className={`p-3 rounded border mb-4 ${step2Pass ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-base font-mono font-semibold ${step2Pass ? "text-green-400" : "text-red-400"}`}>
                          {step2Total}/25 {step2Pass ? "— ADVANCE to Gold Validation" : "— KILL (below threshold)"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Threshold: 15/25 (SOP: 35/50)</div>
                      </div>
                      <div className={`text-2xl font-mono font-bold ${step2Pass ? "text-green-400" : "text-red-400"}`}>
                        {Math.round((step2Total / 25) * 100)}%
                      </div>
                    </div>
                  </div>
                  {!step2Pass && (
                    <div className="mb-4">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Kill Reason</label>
                      <select value={killReason} onChange={e => setKillReason(e.target.value)}
                        className="bg-background border border-border rounded px-3 py-2 text-sm w-full focus:outline-none">
                        {KILL_REASONS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={() => step2Mut.mutate({ id: selectedLead.id, bedGap: step2Scores.bedGap, rentLevels: step2Scores.rentLevels, pipelineConstraint: step2Scores.pipelineConstraint, issuerReceptivity: step2Scores.issuerReceptivity, populationMigration: step2Scores.populationMigration, killReason })}
                    disabled={step2Mut.isPending}
                    className={`px-5 py-2 rounded text-sm font-semibold transition-colors ${step2Pass ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"}`}>
                    {step2Pass ? "✓ Advance to Gold Validation" : "✗ Kill Lead"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
