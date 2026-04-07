import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ISSUER_TYPES = ["IDA","HFA","Authority","City","County","Other"];
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function IssuersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: issuers = [], isLoading } = useQuery({ queryKey: ["/api/tefra-issuers"] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", state: "FL", issuerType: "IDA", dealsLast5Years: 0,
    receptivityScore: 3, avgTefraMonths: 7, primaryContact: "", notes: "", isPrimary: 0,
  });

  const createIssuer = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tefra-issuers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tefra-issuers"] });
      toast({ title: "Issuer added" });
      setShowForm(false);
    },
  });

  const scoreColor = (n: number) => n >= 4 ? "text-green-400" : n >= 3 ? "text-yellow-400" : "text-red-400";

  const byState: Record<string, any[]> = {};
  (issuers as any[]).forEach((i: any) => {
    if (!byState[i.state]) byState[i.state] = [];
    byState[i.state].push(i);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">TEFRA Issuer Database</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Conduit issuers by state. Receptivity scores, deal history, TEFRA velocity benchmarks.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-background text-sm font-semibold px-4 py-2 rounded hover:bg-yellow-300 transition-colors">
          + Add Issuer
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Issuers", value: (issuers as any[]).length },
          { label: "Primary Issuers", value: (issuers as any[]).filter((i: any) => i.isPrimary).length },
          { label: "States Covered", value: Object.keys(byState).length },
          { label: "Avg Receptivity", value: (issuers as any[]).length ? ((issuers as any[]).reduce((s: number, i: any) => s + i.receptivityScore, 0) / (issuers as any[]).length).toFixed(1) + "/5" : "—" },
        ].map(s => (
          <div key={s.label} className="panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
            <div className="font-mono text-xl font-semibold text-yellow-400">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="panel p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Name","State","Type","Deals (5yr)","Receptivity","Avg TEFRA (mo)","Primary","Contact","Notes"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {(issuers as any[]).map((i: any) => (
              <tr key={i.id} data-testid={`row-issuer-${i.id}`} className="data-row">
                <td className="px-4 py-2.5 font-medium">{i.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{i.state}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{i.issuerType}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-center">{i.dealsLast5Years}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`w-2 h-2 rounded-full ${n <= i.receptivityScore ? (i.receptivityScore >= 4 ? "bg-green-500" : i.receptivityScore >= 3 ? "bg-yellow-500" : "bg-red-500") : "bg-muted"}`} />
                      ))}
                    </div>
                    <span className={`font-mono text-xs ${scoreColor(i.receptivityScore)}`}>{i.receptivityScore}/5</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-center">{i.avgTefraMonths ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {i.isPrimary ? <span className="text-xs text-yellow-400 font-medium">★ Primary</span> : <span className="text-xs text-muted-foreground">Backup</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{i.primaryContact || "—"}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{i.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TEFRA Process Guide */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-3 panel">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">TEFRA Process Reference — IRC §147(f)</div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { step: "1", label: "Issuer Selection", detail: "Primary + backup. TEFRA playbook per state. Local counsel engaged.", timing: "Month 0–1" },
              { step: "2", label: "TEFRA Hearing", detail: "Public notice 14 days prior. Open to public comment on public purpose.", timing: "Month 2–4" },
              { step: "3", label: "Adoption Resolution", detail: "Local official votes. IRC §147(f) certification by bond counsel.", timing: "Month 4–6" },
              { step: "4", label: "Bond Pricing", detail: "Rule 144A QIB or public offering. DSCR-led sizing locked.", timing: "Month 6–9" },
              { step: "5", label: "Closing / FMV Transfer", detail: "501(c)(3) purchases at appraised FMV. Bond proceeds fund construction.", timing: "Month 7–10" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-8 h-8 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-mono text-sm font-semibold mx-auto mb-2">{s.step}</div>
                <div className="text-xs font-medium">{s.label}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{s.detail}</div>
                <div className="text-[10px] text-yellow-400/70 mt-1 font-mono">{s.timing}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Issuer Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add TEFRA Issuer</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground text-xl leading-none">×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createIssuer.mutate(form); }} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Issuer Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">State</label>
                  <select value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Type</label>
                  <select value={form.issuerType} onChange={e => setForm({...form, issuerType: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                    {ISSUER_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Deals (last 5yr)</label>
                  <input type="number" value={form.dealsLast5Years} onChange={e => setForm({...form, dealsLast5Years: parseInt(e.target.value)})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Receptivity (1–5)</label>
                  <input type="number" min={1} max={5} value={form.receptivityScore} onChange={e => setForm({...form, receptivityScore: parseInt(e.target.value)})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Avg TEFRA Months</label>
                  <input type="number" value={form.avgTefraMonths} onChange={e => setForm({...form, avgTefraMonths: parseInt(e.target.value)})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Primary Issuer?</label>
                  <select value={form.isPrimary} onChange={e => setForm({...form, isPrimary: parseInt(e.target.value)})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none">
                    <option value={0}>Backup</option>
                    <option value={1}>Primary</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Primary Contact</label>
                <input value={form.primaryContact} onChange={e => setForm({...form, primaryContact: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-yellow-400 text-background font-semibold px-5 py-2 rounded text-sm hover:bg-yellow-300">Add Issuer</button>
                <button type="button" onClick={() => setShowForm(false)} className="border border-border text-muted-foreground px-5 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
