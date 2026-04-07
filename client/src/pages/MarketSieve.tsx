import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const GATES = [
  { key: "mdi", killKey: "mdiKill", label: "Market Durability Index (MDI)", weight: 25, desc: "Will demand exist in 10 years?", killDesc: "Multi-year enrollment declines + weak retention + weak demand pressure" },
  { key: "sii", killKey: "siiKill", label: "Supply Imbalance Index (SII)", weight: 25, desc: "Is there a real shortage or mismatch?", killDesc: "Big pipeline + concessions spreading + occupancy trending down" },
  { key: "bei", killKey: "beiKill", label: "Bondable Economics Index (BEI)", weight: 30, desc: "Is it bondable and survivable?", killDesc: "Works only at heroic assumptions, thin DSCR, or requires PILOT to pencil" },
  { key: "eai", killKey: "eaiKill", label: "Entitlement Alpha Index (EAI)", weight: 15, desc: "Can you convert control into permit-ready FMV?", killDesc: "Multiple discretionary approvals + opposition + unclear staff posture" },
  { key: "tvi", killKey: "tviKill", label: "TEFRA Velocity Index (TVI)", weight: 5, desc: "Will TEFRA close cleanly?", killDesc: "Issuer reluctance, inconsistent approvals, or unmanageable narrative" },
];

export default function MarketSievePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: scores = [] } = useQuery({ queryKey: ["/api/market-scores"] });
  const [market, setMarket] = useState("");
  const [scoreVals, setScoreVals] = useState<Record<string, number>>({ mdi: 3, sii: 3, bei: 3, eai: 3, tvi: 3 });
  const [killSwitches, setKillSwitches] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  // Live composite
  const anyKill = Object.values(killSwitches).some(v => v);
  const weights = { mdi: 0.25, sii: 0.25, bei: 0.30, eai: 0.15, tvi: 0.05 };
  const composite = anyKill ? 0 : GATES.reduce((s, g) => s + (scoreVals[g.key] || 0) * (weights as any)[g.key], 0);
  const recommendation = anyKill ? "KILL" : composite >= 3.5 ? "ADVANCE" : composite >= 2.5 ? "HOLD" : "KILL";

  const saveScore = useMutation({
    mutationFn: () => apiRequest("POST", "/api/market-scores", {
      market,
      mdiScore: scoreVals.mdi, siiScore: scoreVals.sii, beiScore: scoreVals.bei,
      eaiScore: scoreVals.eai, tviScore: scoreVals.tvi,
      mdiKill: killSwitches.mdiKill ? 1 : 0, siiKill: killSwitches.siiKill ? 1 : 0,
      beiKill: killSwitches.beiKill ? 1 : 0, eaiKill: killSwitches.eaiKill ? 1 : 0,
      tviKill: killSwitches.tviKill ? 1 : 0,
      notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/market-scores"] });
      toast({ title: "Market scored", description: `${market} — ${recommendation} (${composite.toFixed(2)}/5)` });
      setMarket(""); setScoreVals({ mdi: 3, sii: 3, bei: 3, eai: 3, tvi: 3 }); setKillSwitches({}); setNotes("");
    },
  });

  const recColor = { ADVANCE: "text-green-400", HOLD: "text-yellow-400", KILL: "text-red-400" }[recommendation];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Module 4 — National Market Sieve v2.0</h1>
        <p className="text-xs text-muted-foreground mt-0.5">5-gate scoring system. Composite threshold ≥3.5 = ADVANCE. Any kill switch = out.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Scoring form */}
        <div className="col-span-2 space-y-3">
          <div className="panel">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Market / MSA</label>
            <input value={market} onChange={e => setMarket(e.target.value)} placeholder="e.g. Miami-Dade, FL"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
          </div>

          {GATES.map(g => (
            <div key={g.key} className={`panel ${killSwitches[g.killKey] ? "border-red-500/40 bg-red-500/5" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {g.label}
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Weight: {g.weight}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className={`font-mono text-lg font-bold ${scoreVals[g.key] >= 4 ? "text-green-400" : scoreVals[g.key] <= 2 ? "text-red-400" : "text-yellow-400"}`}>
                    {scoreVals[g.key]}/5
                  </span>
                </div>
              </div>
              <input type="range" min={1} max={5} step={1} value={scoreVals[g.key]}
                onChange={e => setScoreVals({...scoreVals, [g.key]: parseInt(e.target.value)})}
                className="w-full accent-yellow-400 mb-3" />
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <button onClick={() => setKillSwitches({...killSwitches, [g.killKey]: !killSwitches[g.killKey]})}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${killSwitches[g.killKey] ? "bg-red-500/20 text-red-400 border-red-500/30" : "border-border text-muted-foreground"}`}>
                  {killSwitches[g.killKey] ? "⚡ KILL SWITCH ON" : "Kill Switch"}
                </button>
                <span className="text-[10px] text-muted-foreground">{g.killDesc}</span>
              </div>
            </div>
          ))}

          <div className="panel">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50 resize-none" />
          </div>

          <button onClick={() => saveScore.mutate()} disabled={!market || saveScore.isPending}
            className="bg-yellow-400 text-background font-semibold px-5 py-2 rounded text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
            Save Market Score
          </button>
        </div>

        {/* Live score + history */}
        <div className="space-y-4">
          {/* Live composite */}
          <div className={`panel ${anyKill ? "border-red-500/40" : recommendation === "ADVANCE" ? "border-green-500/40" : recommendation === "HOLD" ? "border-yellow-500/40" : "border-red-500/40"}`}>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Live Score</div>
            <div className={`text-4xl font-mono font-bold ${recColor}`}>{composite.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">/ 5.0 composite</div>
            <div className={`text-sm font-semibold mt-2 ${recColor}`}>{recommendation}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Threshold: ≥3.5 = ADVANCE</div>
            {anyKill && <div className="text-xs text-red-400 mt-2">Kill switch active — auto-KILL regardless of score.</div>}
            {/* Gate bars */}
            <div className="mt-4 space-y-1.5">
              {GATES.map(g => (
                <div key={g.key} className="flex items-center gap-2">
                  <div className="text-[10px] text-muted-foreground w-10">{g.key.toUpperCase()}</div>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${killSwitches[g.killKey] ? "bg-red-500" : scoreVals[g.key] >= 4 ? "bg-green-500" : scoreVals[g.key] <= 2 ? "bg-red-500" : "bg-yellow-500"}`}
                      style={{ width: `${(scoreVals[g.key] / 5) * 100}%` }} />
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground w-4">{scoreVals[g.key]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Scored Markets ({(scores as any[]).length})</div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(scores as any[]).length === 0 && <p className="text-xs text-muted-foreground">No markets scored yet.</p>}
              {(scores as any[]).map((s: any) => (
                <div key={s.id} className="p-2 bg-muted/30 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.market}</span>
                    <span className={`text-xs font-mono font-semibold ${s.recommendation === "ADVANCE" ? "text-green-400" : s.recommendation === "HOLD" ? "text-yellow-400" : "text-red-400"}`}>
                      {s.compositeScore?.toFixed(2)} — {s.recommendation}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    MDI:{s.mdiScore} · SII:{s.siiScore} · BEI:{s.beiScore} · EAI:{s.eaiScore} · TVI:{s.tviScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
