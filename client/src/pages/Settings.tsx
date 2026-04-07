import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SieveConfig {
  id: number;
  key: string;
  value: string;
  label: string;
  description: string | null;
  category: string;
  updatedAt: string;
  updatedBy: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  screen: "Step 1 & 2 — Screening Thresholds",
  bond: "Bond Engine — Underwriting Parameters",
  market: "Market Sieve — Scoring Thresholds",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: configs, isLoading } = useQuery<SieveConfig[]>({ queryKey: ["/api/sieve-config"] });
  const [editing, setEditing] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("PATCH", `/api/sieve-config/${key}`, { value, updatedBy: "Jason Talbot" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sieve-config"] });
      toast({ title: "Parameter updated", description: "Sieve config saved to database." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const grouped = (configs ?? []).reduce<Record<string, SieveConfig[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  function formatValue(key: string, value: string) {
    if (key.includes("Pct") || key.includes("Rate")) return `${(Number(value) * 100).toFixed(2)}%`;
    if (key.includes("Par") || key.includes("Basis") || key.includes("Price")) return `$${Number(value).toLocaleString()}`;
    return value;
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground" data-testid="text-settings-title">Program Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjustable screening thresholds, bond engine parameters, and market sieve gates. All changes persist and take effect immediately.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded bg-card animate-pulse" />)}
        </div>
      )}

      {Object.entries(CATEGORY_LABELS).map(([cat, catLabel]) => {
        const rows = grouped[cat] ?? [];
        if (!rows.length) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">{catLabel}</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              {rows.map((cfg, i) => {
                const isEdit = editing[cfg.key] !== undefined;
                const displayVal = isEdit ? editing[cfg.key] : cfg.value;
                return (
                  <div
                    key={cfg.key}
                    className={`flex items-center gap-4 px-5 py-4 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
                    data-testid={`row-config-${cfg.key}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{cfg.label}</div>
                      {cfg.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{cfg.description}</div>
                      )}
                      {cfg.updatedBy && (
                        <div className="text-xs text-muted-foreground/50 mt-0.5">
                          Last updated by {cfg.updatedBy} · {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleDateString() : "—"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEdit ? (
                        <>
                          <input
                            type="text"
                            className="w-32 px-3 py-1.5 text-sm rounded border border-primary bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                            value={displayVal}
                            onChange={e => setEditing(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                            data-testid={`input-config-${cfg.key}`}
                            autoFocus
                          />
                          <button
                            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90"
                            data-testid={`button-save-${cfg.key}`}
                            onClick={() => {
                              mutation.mutate({ key: cfg.key, value: editing[cfg.key] });
                              setEditing(prev => { const n = { ...prev }; delete n[cfg.key]; return n; });
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground"
                            onClick={() => setEditing(prev => { const n = { ...prev }; delete n[cfg.key]; return n; })}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-sm text-primary px-3 py-1.5 rounded bg-primary/10 min-w-[5rem] text-center" data-testid={`value-config-${cfg.key}`}>
                            {cfg.value}
                          </span>
                          <button
                            className="px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                            data-testid={`button-edit-${cfg.key}`}
                            onClick={() => setEditing(prev => ({ ...prev, [cfg.key]: cfg.value }))}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
