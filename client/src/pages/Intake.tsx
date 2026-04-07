import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const SOURCES = ["LoopNet", "Crexi", "Broker", "Inbound", "Manual"];
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function IntakePage() {
  const { toast } = useToast();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ["/api/leads"] });
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDisp, setFilterDisp] = useState("All");
  const [form, setForm] = useState({
    address: "", city: "", state: "FL", acres: "", askingPrice: "",
    zoning: "", universityName: "", universityDistanceMiles: "", universityEnrollment: "",
    listingUrl: "", source: "LoopNet", assignedTo: "Jason Talbot", notes: "",
  });

  const createLead = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Lead added", description: "Ready for Step 1 screening." });
      setShowForm(false);
      setForm({ address: "", city: "", state: "FL", acres: "", askingPrice: "", zoning: "", universityName: "", universityDistanceMiles: "", universityEnrollment: "", listingUrl: "", source: "LoopNet", assignedTo: "Jason Talbot", notes: "" });
    },
  });

  const filtered = (leads as any[]).filter((l: any) => {
    const matchSearch = !search || `${l.address} ${l.city} ${l.state} ${l.universityName}`.toLowerCase().includes(search.toLowerCase());
    const matchDisp = filterDisp === "All" || l.disposition === filterDisp;
    return matchSearch && matchDisp;
  });

  const dispColor: Record<string, string> = {
    New: "badge-new", Pass: "badge-watch", Watch: "badge-watch",
    LOI: "badge-loi", Reject: "badge-nogo",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Module 1 — Lead Intake</h1>
          <p className="text-xs text-muted-foreground mt-0.5">All incoming land/site leads. Source, log, and route to screening.</p>
        </div>
        <button
          data-testid="button-add-lead"
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-background text-sm font-semibold px-4 py-2 rounded hover:bg-yellow-300 transition-colors"
        >+ Add Lead</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          data-testid="input-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search address, city, university..."
          className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400/50 w-72"
        />
        {["All","New","Pass","Watch","LOI","Reject"].map(d => (
          <button key={d} onClick={() => setFilterDisp(d)}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${filterDisp === d ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30" : "text-muted-foreground hover:text-foreground border border-border"}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="panel p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Lead ID</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Address</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">University</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Acres</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Asking</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Step</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No leads found. Add your first lead above.</td></tr>
            ) : filtered.map((l: any) => (
              <tr key={l.id} data-testid={`row-lead-${l.id}`} className="data-row">
                <td className="px-4 py-2.5 font-mono text-xs text-yellow-400">{l.leadId}</td>
                <td className="px-4 py-2.5">
                  <div className="text-sm text-foreground">{l.address}</div>
                  <div className="text-xs text-muted-foreground">{l.city}, {l.state}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm">{l.universityName || "—"}</div>
                  {l.universityDistanceMiles && <div className="text-xs text-muted-foreground">{l.universityDistanceMiles} mi · {l.universityEnrollment?.toLocaleString()} enrolled</div>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">{l.acres ? `${l.acres} ac` : "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">
                  {l.askingPrice ? `$${(l.askingPrice / 1e6).toFixed(1)}M` : "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.source}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${dispColor[l.disposition] || "badge-new"}`}>
                    {l.disposition}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-0.5">
                    {[1,2,3].map(s => (
                      <div key={s} className={`w-4 h-1.5 rounded-full ${l.stepReached >= s ? "bg-yellow-400" : "bg-muted"}`} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">New Lead</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createLead.mutate({
                ...form,
                acres: form.acres ? parseFloat(form.acres) : null,
                askingPrice: form.askingPrice ? parseFloat(form.askingPrice) : null,
                universityDistanceMiles: form.universityDistanceMiles ? parseFloat(form.universityDistanceMiles) : null,
                universityEnrollment: form.universityEnrollment ? parseInt(form.universityEnrollment) : null,
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Street Address *</label>
                  <input data-testid="input-address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">City *</label>
                  <input required value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">State *</label>
                  <select value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50">
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Acres</label>
                  <input type="number" step="0.01" value={form.acres} onChange={e => setForm({...form, acres: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Asking Price ($)</label>
                  <input type="number" step="1" value={form.askingPrice} onChange={e => setForm({...form, askingPrice: e.target.value})}
                    placeholder="10000000"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Zoning</label>
                  <input value={form.zoning} onChange={e => setForm({...form, zoning: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm({...form, source: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50">
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Anchor University</label>
                  <input value={form.universityName} onChange={e => setForm({...form, universityName: e.target.value})}
                    placeholder="e.g. Florida International University"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Distance to University (mi)</label>
                  <input type="number" step="0.1" value={form.universityDistanceMiles} onChange={e => setForm({...form, universityDistanceMiles: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Enrollment</label>
                  <input type="number" value={form.universityEnrollment} onChange={e => setForm({...form, universityEnrollment: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Listing URL</label>
                  <input type="url" value={form.listingUrl} onChange={e => setForm({...form, listingUrl: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createLead.isPending}
                  className="bg-yellow-400 text-background font-semibold px-5 py-2 rounded text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
                  {createLead.isPending ? "Saving..." : "Add Lead"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border border-border text-muted-foreground px-5 py-2 rounded text-sm hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
