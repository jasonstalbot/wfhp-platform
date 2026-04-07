import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const OUTCOMES = ["Kill", "Underwrite", "Advance", "Follow-Up"];

export default function PipelinePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({ queryKey: ["/api/leads"] });
  const { data: brokers = [] } = useQuery({ queryKey: ["/api/brokers"] });
  const { data: calls = [] } = useQuery({ queryKey: ["/api/broker-calls"] });
  const { data: memos = [] } = useQuery({ queryKey: ["/api/gold-memos"] });

  const [tab, setTab] = useState<"pipeline" | "brokers" | "memos">("pipeline");
  const [showBrokerForm, setShowBrokerForm] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [brokerForm, setBrokerForm] = useState({ name: "", firm: "", email: "", phone: "", specialty: "Land", notes: "" });
  const [callForm, setCallForm] = useState({ brokerId: "", leadId: "", callDate: new Date().toISOString().slice(0,10), outcome: "Follow-Up", keyMetrics: "", actionItems: "", calledBy: "Jason Talbot" });
  const [memoForm, setMemoForm] = useState({ leadId: "", siteSummary: "", universityDemandSnapshot: "", tefraIssuerFit: "", economicsSummary: "", risksMitigations: "", recommendation: "Advance to LOI", createdBy: "Jason Talbot" });

  const createBroker = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/brokers", { ...data, markets: "[]" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/brokers"] }); toast({ title: "Broker added" }); setShowBrokerForm(false); },
  });
  const createCall = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/broker-calls", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/broker-calls"] }); toast({ title: "Call logged" }); setShowCallForm(false); },
  });
  const createMemo = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-memos", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/gold-memos"] }); toast({ title: "Gold Memo saved" }); setShowMemoForm(false); },
  });

  const advancedLeads = (leads as any[]).filter((l: any) => ["Watch","LOI"].includes(l.disposition) || l.stepReached >= 3);

  const recColor: Record<string, string> = {
    "Advance to LOI": "text-green-400",
    "Hold": "text-yellow-400",
    "Kill": "text-red-400",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Module 5 — Pipeline / CRM</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Deal pipeline tracking, broker CRM, and Gold Memos. Weekly governance layer.</p>
        </div>
        <div className="flex gap-2">
          {tab === "brokers" && <button onClick={() => setShowBrokerForm(true)} className="bg-yellow-400 text-background text-sm font-semibold px-4 py-2 rounded hover:bg-yellow-300 transition-colors">+ Add Broker</button>}
          {tab === "brokers" && <button onClick={() => setShowCallForm(true)} className="border border-border text-muted-foreground text-sm px-4 py-2 rounded hover:text-foreground transition-colors">Log Call</button>}
          {tab === "memos" && <button onClick={() => setShowMemoForm(true)} className="bg-yellow-400 text-background text-sm font-semibold px-4 py-2 rounded hover:bg-yellow-300 transition-colors">+ Gold Memo</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(["pipeline","brokers","memos"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-4 py-1.5 rounded capitalize transition-colors ${tab === t ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30" : "border border-border text-muted-foreground"}`}>
            {t === "pipeline" ? "Deal Pipeline" : t === "brokers" ? "Broker CRM" : "Gold Memos"}
          </button>
        ))}
      </div>

      {tab === "pipeline" && (
        <div>
          {/* Kanban-style status lanes */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { status: "New", color: "border-zinc-500/30", bg: "bg-zinc-500/5" },
              { status: "Watch", color: "border-purple-500/30", bg: "bg-purple-500/5" },
              { status: "LOI", color: "border-sky-500/30", bg: "bg-sky-500/5" },
              { status: "Reject", color: "border-red-500/30", bg: "bg-red-500/5" },
            ].map(lane => {
              const laneLeads = (leads as any[]).filter((l: any) => l.disposition === lane.status);
              return (
                <div key={lane.status} className={`rounded border ${lane.color} ${lane.bg} p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium uppercase tracking-wider">{lane.status}</div>
                    <div className="font-mono text-xs text-muted-foreground">{laneLeads.length}</div>
                  </div>
                  <div className="space-y-2">
                    {laneLeads.slice(0, 5).map((l: any) => (
                      <div key={l.id} className="bg-card rounded p-2 border border-border">
                        <div className="font-mono text-[10px] text-yellow-400">{l.leadId}</div>
                        <div className="text-xs font-medium truncate">{l.address}</div>
                        <div className="text-[10px] text-muted-foreground">{l.city}, {l.state}</div>
                        {l.askingPrice && <div className="font-mono text-[10px] text-muted-foreground">${(l.askingPrice/1e6).toFixed(1)}M</div>}
                      </div>
                    ))}
                    {laneLeads.length > 5 && <div className="text-[10px] text-muted-foreground text-center">+{laneLeads.length - 5} more</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full table */}
          <div className="panel p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Lead ID","Address","University","Step","Score","Disposition","Kill Reason","Assigned"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(leads as any[]).map((l: any) => (
                  <tr key={l.id} className="data-row">
                    <td className="px-4 py-2.5 font-mono text-xs text-yellow-400">{l.leadId}</td>
                    <td className="px-4 py-2.5 text-sm">{l.address}, {l.city}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.universityName || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-0.5">
                        {[1,2,3].map(s => <div key={s} className={`w-4 h-1.5 rounded-full ${l.stepReached >= s ? "bg-yellow-400" : "bg-muted"}`} />)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {l.step2TotalScore != null ? `${l.step2TotalScore}/25` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${l.disposition === "LOI" ? "badge-loi" : l.disposition === "Reject" ? "badge-nogo" : l.disposition === "Watch" ? "badge-watch" : "badge-new"}`}>
                        {l.disposition}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.killReason || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.assignedTo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "brokers" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 panel p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Name","Firm","Specialty","Email","Phone","Last Contact"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(brokers as any[]).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No brokers yet. Add your first broker contact.</td></tr>}
                {(brokers as any[]).map((b: any) => (
                  <tr key={b.id} className="data-row">
                    <td className="px-4 py-2.5 font-medium">{b.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{b.firm || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.specialty || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.email || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.lastContactDate ? new Date(b.lastContactDate).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Recent Calls</div>
            {(calls as any[]).slice(0, 10).map((c: any) => (
              <div key={c.id} className="py-2 border-b border-border last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{new Date(c.callDate).toLocaleDateString()}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${c.outcome === "Advance" ? "badge-loi" : c.outcome === "Kill" ? "badge-nogo" : "badge-watch"}`}>{c.outcome}</span>
                </div>
                {c.actionItems && <div className="text-[10px] text-muted-foreground mt-0.5">{c.actionItems}</div>}
              </div>
            ))}
            {(calls as any[]).length === 0 && <p className="text-xs text-muted-foreground">No calls logged yet.</p>}
          </div>
        </div>
      )}

      {tab === "memos" && (
        <div className="panel p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Lead ID","Site Summary","Economics","Recommendation","Date"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(memos as any[]).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No Gold Memos yet. Create one from a Step 3 lead.</td></tr>}
              {(memos as any[]).map((m: any) => (
                <tr key={m.id} className="data-row">
                  <td className="px-4 py-2.5 font-mono text-xs text-yellow-400">Lead #{m.leadId}</td>
                  <td className="px-4 py-2.5 text-sm max-w-xs truncate">{m.siteSummary || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{m.economicsSummary || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${recColor[m.recommendation] || "text-muted-foreground"}`}>{m.recommendation}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Broker Modal */}
      {showBrokerForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add Broker</h2>
              <button onClick={() => setShowBrokerForm(false)} className="text-muted-foreground text-xl leading-none">×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createBroker.mutate(brokerForm); }} className="space-y-3">
              {[["name","Name *",true],["firm","Firm"],["email","Email"],["phone","Phone"]].map(([k,l,req]) => (
                <div key={k as string}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">{l as string}</label>
                  <input required={!!req} value={(brokerForm as any)[k as string]} onChange={e => setBrokerForm({...brokerForm, [k as string]: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Specialty</label>
                <select value={brokerForm.specialty} onChange={e => setBrokerForm({...brokerForm, specialty: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                  {["Land","Multifamily","Student Housing","Mixed","Other"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-yellow-400 text-background font-semibold px-5 py-2 rounded text-sm hover:bg-yellow-300 transition-colors">Add</button>
                <button type="button" onClick={() => setShowBrokerForm(false)} className="border border-border text-muted-foreground px-5 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {showCallForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Log Broker Call</h2>
              <button onClick={() => setShowCallForm(false)} className="text-muted-foreground text-xl leading-none">×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createCall.mutate({ ...callForm, brokerId: parseInt(callForm.brokerId), leadId: callForm.leadId ? parseInt(callForm.leadId) : undefined }); }} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Broker *</label>
                <select required value={callForm.brokerId} onChange={e => setCallForm({...callForm, brokerId: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select broker...</option>
                  {(brokers as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name} — {b.firm}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Associated Lead</label>
                <select value={callForm.leadId} onChange={e => setCallForm({...callForm, leadId: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                  <option value="">None</option>
                  {(leads as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.leadId} — {l.address}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Date</label>
                <input type="date" value={callForm.callDate} onChange={e => setCallForm({...callForm, callDate: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Outcome</label>
                <select value={callForm.outcome} onChange={e => setCallForm({...callForm, outcome: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                  {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Key Metrics / Notes</label>
                <textarea value={callForm.keyMetrics} onChange={e => setCallForm({...callForm, keyMetrics: e.target.value})} rows={2}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Action Items</label>
                <textarea value={callForm.actionItems} onChange={e => setCallForm({...callForm, actionItems: e.target.value})} rows={2}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-yellow-400 text-background font-semibold px-5 py-2 rounded text-sm hover:bg-yellow-300 transition-colors">Log Call</button>
                <button type="button" onClick={() => setShowCallForm(false)} className="border border-border text-muted-foreground px-5 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gold Memo Modal */}
      {showMemoForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Gold Memo</h2>
              <button onClick={() => setShowMemoForm(false)} className="text-muted-foreground text-xl leading-none">×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMemo.mutate({ ...memoForm, leadId: parseInt(memoForm.leadId) }); }} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Lead *</label>
                <select required value={memoForm.leadId} onChange={e => setMemoForm({...memoForm, leadId: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select lead...</option>
                  {(leads as any[]).filter((l: any) => l.step2Pass === 1 || l.stepReached >= 3).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.leadId} — {l.address}, {l.city}</option>
                  ))}
                </select>
              </div>
              {[
                ["siteSummary","Site Summary (location, acres, density path)"],
                ["universityDemandSnapshot","University Demand Snapshot (bed gap + enrollment)"],
                ["tefraIssuerFit","TEFRA / Issuer Fit"],
                ["economicsSummary","Economics Summary (par, DSCR base, DSCR stress)"],
                ["risksMitigations","Risks + Mitigations"],
              ].map(([k,l]) => (
                <div key={k as string}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">{l as string}</label>
                  <textarea value={(memoForm as any)[k as string]} onChange={e => setMemoForm({...memoForm, [k as string]: e.target.value})} rows={2}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Recommendation</label>
                <select value={memoForm.recommendation} onChange={e => setMemoForm({...memoForm, recommendation: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                  {["Advance to LOI","Hold","Kill"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-yellow-400 text-background font-semibold px-5 py-2 rounded text-sm hover:bg-yellow-300">Save Gold Memo</button>
                <button type="button" onClick={() => setShowMemoForm(false)} className="border border-border text-muted-foreground px-5 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
