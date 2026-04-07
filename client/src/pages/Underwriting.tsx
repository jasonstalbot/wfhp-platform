import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

function fmt$(n: number) {
  if (!n) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return n ? `${(n*100).toFixed(2)}%` : "—"; }
function x(n: number) { return n ? `${n.toFixed(2)}x` : "—"; }

const DEFAULT_MODEL = {
  projectName: "New Project",
  seniorCouponRate: 0.0525, targetDscr: 1.2, valueEngineeringPct: 0.05,
  landContractPrice: 0, fmvLandSale: 0, developerFeePct: 0.06,
  wfhpDevFeeShare: 0.02, assetMgmtFeePct: 0.015, seniorAmortYears: 40,
  coiPct: 0.0245, mmYield: 0.0375, constructionMonths: 30,
  grossPotentialRent: 0, concessionsPct: 0.015, vacancyPct: 0.025,
  parkingIncome: 0, otherIncome: 0, commercialIncome: 0,
  payroll: 0, advertising: 0, generalAdmin: 0, utilities: 0,
  repairsMaintenance: 0, serviceContracts: 0, mgmtFeePct: 0.035,
  makeReady: 0, propertyTaxes: 0, insurance: 0, pilotAddback: 0,
  hardCostTotal: 0, ownersDirectCosts: 0, contingency: 0,
  softCosts: 0, workingCapital: 0, aeReimbursement: 0, wfhpPredDevCosts: 0,
};

export default function UnderwritingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: models = [] } = useQuery({ queryKey: ["/api/bond-models"] });
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [inputs, setInputs] = useState<any>(DEFAULT_MODEL);
  const [computed, setComputed] = useState<any>(null);
  const [sensitivity, setSensitivity] = useState<any>(null);
  const [tab, setTab] = useState<"inputs" | "results" | "sensitivity">("inputs");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedModel) {
      setInputs({ ...DEFAULT_MODEL, ...selectedModel });
    }
  }, [selectedModel]);

  const setInput = (key: string, val: any) => setInputs((prev: any) => ({ ...prev, [key]: val }));

  const runCompute = async () => {
    setLoading(true);
    try {
      const result = await apiRequest("POST", "/api/bond-models/compute", inputs);
      setComputed(result);
      setTab("results");
    } finally { setLoading(false); }
  };

  const runSensitivity = async () => {
    setLoading(true);
    try {
      const result = await apiRequest("POST", "/api/bond-models/sensitivity", inputs);
      setSensitivity(result);
      setTab("sensitivity");
    } finally { setLoading(false); }
  };

  const saveModel = useMutation({
    mutationFn: () => selectedModel?.id
      ? apiRequest("PATCH", `/api/bond-models/${selectedModel.id}`, inputs)
      : apiRequest("POST", "/api/bond-models", inputs),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/bond-models"] });
      setSelectedModel(data);
      toast({ title: "Model saved", description: `${data.projectName} — ${data.goNoGo}` });
    },
  });

  const N = (key: string, label: string, step = 1, prefix = "") => (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <input type="number" step={step} value={inputs[key] || ""}
          onChange={e => setInput(key, parseFloat(e.target.value) || 0)}
          className={`w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400/50 ${prefix ? "pl-5" : ""}`} />
      </div>
    </div>
  );

  const P = (key: string, label: string) => (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">{label}</label>
      <div className="relative">
        <input type="number" step={0.001} value={inputs[key] ? (inputs[key]*100).toFixed(3) : ""} 
          onChange={e => setInput(key, parseFloat(e.target.value)/100 || 0)}
          className="w-full bg-background border border-border rounded pl-2 pr-6 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Module 3 — Bond Underwriting Engine</h1>
          <p className="text-xs text-muted-foreground mt-0.5">NOI → ADS → Bond Par → Max Land FMV → Go/No-Go. Back-solve what you can pay for land.</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedModel?.id || ""} onChange={e => {
            if (!e.target.value) { setSelectedModel(null); setInputs(DEFAULT_MODEL); setComputed(null); return; }
            const m = (models as any[]).find((m: any) => m.id === parseInt(e.target.value));
            setSelectedModel(m);
          }} className="bg-card border border-border rounded px-3 py-1.5 text-sm focus:outline-none">
            <option value="">New Model</option>
            {(models as any[]).map((m: any) => <option key={m.id} value={m.id}>{m.projectName}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(["inputs","results","sensitivity"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-4 py-1.5 rounded transition-colors capitalize ${tab === t ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30" : "border border-border text-muted-foreground"}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={runCompute} disabled={loading}
            className="bg-yellow-400 text-background text-xs font-semibold px-4 py-1.5 rounded hover:bg-yellow-300 transition-colors disabled:opacity-50">
            {loading ? "Computing..." : "Run Model"}
          </button>
          <button onClick={runSensitivity} disabled={loading}
            className="border border-yellow-400/30 text-yellow-400 text-xs font-semibold px-4 py-1.5 rounded hover:bg-yellow-400/10 transition-colors disabled:opacity-50">
            Sensitivity Table
          </button>
          <button onClick={() => saveModel.mutate()} disabled={saveModel.isPending}
            className="border border-border text-muted-foreground text-xs px-4 py-1.5 rounded hover:text-foreground transition-colors disabled:opacity-50">
            Save
          </button>
        </div>
      </div>

      {tab === "inputs" && (
        <div className="grid grid-cols-2 gap-4">
          {/* Tuning levers */}
          <div className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Tuning Levers</div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Project Name</label>
              <input value={inputs.projectName} onChange={e => setInput("projectName", e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50 mb-3" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {P("seniorCouponRate", "Senior Coupon Rate")}
              {P("targetDscr", "Target DSCR")}
              {P("valueEngineeringPct", "Value Engineering %")}
              {N("seniorAmortYears", "Amortization (yrs)")}
              {P("coiPct", "COI % of Par")}
              {P("mmYield", "MM Yield (undrawn)")}
              {N("constructionMonths", "Construction Months")}
              {N("landContractPrice", "Land Contract Price", 10000, "$")}
              {N("fmvLandSale", "FMV Land Sale", 10000, "$")}
              {P("developerFeePct", "Developer Fee %")}
              {P("wfhpDevFeeShare", "WFHP Dev Fee Share")}
              {P("assetMgmtFeePct", "Asset Mgmt Fee %")}
            </div>
          </div>

          {/* Income & Expenses */}
          <div className="space-y-4">
            <div className="panel">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Revenue</div>
              <div className="grid grid-cols-2 gap-2">
                {N("grossPotentialRent", "Gross Potential Rent", 1000, "$")}
                {P("concessionsPct", "Concessions %")}
                {P("vacancyPct", "Vacancy %")}
                {N("parkingIncome", "Parking / Storage", 1000, "$")}
                {N("otherIncome", "Other Income", 1000, "$")}
                {N("commercialIncome", "Commercial Income", 1000, "$")}
                {N("pilotAddback", "PILOT Addback", 1000, "$")}
              </div>
            </div>
            <div className="panel">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Operating Expenses</div>
              <div className="grid grid-cols-2 gap-2">
                {N("payroll", "Payroll", 1000, "$")}
                {N("advertising", "Advertising", 1000, "$")}
                {N("generalAdmin", "G&A", 1000, "$")}
                {N("utilities", "Utilities (net)", 1000, "$")}
                {N("repairsMaintenance", "Repairs & Maint.", 1000, "$")}
                {N("serviceContracts", "Service Contracts", 1000, "$")}
                {P("mgmtFeePct", "Mgmt Fee (% EGI)")}
                {N("makeReady", "Make Ready", 1000, "$")}
                {N("propertyTaxes", "Property Taxes", 1000, "$")}
                {N("insurance", "Insurance", 1000, "$")}
              </div>
            </div>
            <div className="panel">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Construction Costs</div>
              <div className="grid grid-cols-2 gap-2">
                {N("hardCostTotal", "Hard Cost Total", 100000, "$")}
                {N("ownersDirectCosts", "Owner's Direct", 10000, "$")}
                {N("contingency", "Contingency", 10000, "$")}
                {N("softCosts", "Soft Costs", 10000, "$")}
                {N("workingCapital", "Working Capital", 10000, "$")}
                {N("aeReimbursement", "A&E Reimbursement", 10000, "$")}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "results" && computed && (
        <div className="grid grid-cols-2 gap-4">
          {/* Go/No-Go */}
          <div className={`col-span-2 p-4 rounded border text-center ${computed.goNoGo === "GO" ? "bg-green-500/10 border-green-500/30" : computed.goNoGo === "CONDITIONAL" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <div className={`text-3xl font-mono font-bold ${computed.goNoGo === "GO" ? "text-green-400" : computed.goNoGo === "CONDITIONAL" ? "text-yellow-400" : "text-red-400"}`}>
              {computed.goNoGo}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              DSCR: {x(computed.dscrVerification)} · Par: {fmt$(computed.seniorBondPar)} · Surplus: {fmt$(computed.surplus)}
            </div>
          </div>

          {/* P&L */}
          <div className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Stabilized P&L</div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["EGI", fmt$(computed.egi)],
                  ["Total OpEx", fmt$(computed.totalOpex)],
                  ["NOI (Full Tax)", fmt$(computed.noiFullTax)],
                  ["PILOT Addback", fmt$(inputs.pilotAddback)],
                  ["UW NOI (Bond Sizing)", fmt$(computed.uwNoi), "font-semibold text-yellow-400"],
                  ["Allowable Debt Service", fmt$(computed.ads)],
                  ["Debt Constant", pct(computed.debtConstant)],
                ].map(([l, v, cls]) => (
                  <tr key={l as string} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-muted-foreground">{l}</td>
                    <td className={`py-1.5 text-right font-mono ${cls || "text-foreground"}`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sources & Uses */}
          <div className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Sources & Uses</div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Senior Bond Par", fmt$(computed.seniorBondPar), "font-semibold text-yellow-400"],
                  ["Hard Costs (VE'd)", fmt$(computed.totalHardCosts)],
                  ["Developer Fee", fmt$(computed.devFee)],
                  ["Soft Costs + WC", fmt$(inputs.softCosts + inputs.workingCapital)],
                  ["Total Non-Land Dev", fmt$(computed.totalNonLandDev)],
                  ["Costs of Issuance", fmt$(computed.coi)],
                  ["Cap Interest (net)", fmt$(computed.capi)],
                  ["Land at FMV", fmt$(inputs.fmvLandSale)],
                  ["Total Uses", fmt$(computed.totalUses)],
                  ["Surplus / (Gap)", fmt$(computed.surplus), computed.surplus >= 0 ? "font-semibold text-green-400" : "font-semibold text-red-400"],
                ].map(([l, v, cls]) => (
                  <tr key={l as string} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-muted-foreground">{l}</td>
                    <td className={`py-1.5 text-right font-mono ${cls || "text-foreground"}`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Max Land FMV */}
          <div className="panel bg-yellow-400/5 border-yellow-400/20">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max Supportable Land FMV</div>
            <div className="text-3xl font-mono font-bold text-yellow-400">{fmt$(computed.maxSupportableLandFmv)}</div>
            <div className="text-xs text-muted-foreground mt-1">This is the max you can pay — before bond economics break.</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Land Contract</div>
                <div className="font-mono text-sm text-foreground">{fmt$(inputs.landContractPrice)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">FMV Sale</div>
                <div className="font-mono text-sm text-foreground">{fmt$(inputs.fmvLandSale)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Land Spread</div>
                <div className="font-mono text-sm text-green-400">{fmt$(computed.landSpread)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Basis Lift</div>
                <div className="font-mono text-sm text-yellow-400">{inputs.landContractPrice > 0 ? x(inputs.fmvLandSale / inputs.landContractPrice) : "—"}</div>
              </div>
            </div>
          </div>

          {/* Sponsor Returns */}
          <div className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">WFHP Sponsor Returns (Day-One)</div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Land Spread", fmt$(computed.landSpread), "text-green-400"],
                  ["WFHP Dev Fee Share", fmt$(computed.wfhpDevFee)],
                  ["A&E Reimbursement", fmt$(inputs.aeReimbursement)],
                  ["Pre-Dev / DD Reimb.", fmt$(inputs.wfhpPredDevCosts)],
                  ["Total Day-One Monetization", fmt$(computed.dayOneMonetization), "font-semibold text-yellow-400"],
                  ["Cash Invested", fmt$(computed.cashInvested)],
                  ["Day-One ROI", pct(computed.dayOneRoi)],
                  ["Day-One MOIC", x(computed.dayOneMoic)],
                  ["Yield on Cost", pct(computed.yieldOnCost)],
                ].map(([l, v, cls]) => (
                  <tr key={l as string} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-muted-foreground">{l}</td>
                    <td className={`py-1.5 text-right font-mono ${cls || "text-foreground"}`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "sensitivity" && sensitivity && (
        <div className="panel overflow-x-auto">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max Supportable Land FMV — Coupon × DSCR Sensitivity</div>
          <div className="text-[10px] text-muted-foreground mb-4">UW NOI: {fmt$(inputs.grossPotentialRent)} base. Green = GO, Yellow = CONDITIONAL, Red = NO-GO.</div>
          <table className="text-xs font-mono whitespace-nowrap">
            <thead>
              <tr>
                <th className="px-3 py-1.5 text-left text-muted-foreground">Coupon ↓ / DSCR →</th>
                {sensitivity.dscrs.map((d: number) => (
                  <th key={d} className="px-3 py-1.5 text-center text-muted-foreground">{d}x</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.coupons.map((coupon: number, ci: number) => (
                <tr key={coupon} className="border-t border-border/30">
                  <td className="px-3 py-1.5 text-muted-foreground">{(coupon*100).toFixed(2)}%</td>
                  {sensitivity.dscrs.map((d: number, di: number) => {
                    const cell = sensitivity.table[ci][di];
                    const color = cell.goNoGo === "GO" ? "text-green-400 bg-green-500/5" 
                      : cell.goNoGo === "CONDITIONAL" ? "text-yellow-400 bg-yellow-500/5" 
                      : "text-red-400 bg-red-500/5";
                    return (
                      <td key={d} className={`px-3 py-1.5 text-center ${color}`}>
                        {cell.maxLandFmv > 0 ? fmt$(cell.maxLandFmv) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "results" && !computed && (
        <div className="panel text-center py-12 text-muted-foreground text-sm">
          Fill in the inputs and click "Run Model" to compute.
        </div>
      )}
    </div>
  );
}
