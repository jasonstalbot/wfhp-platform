import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TeamUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const GOLD = "hsl(45 85% 55%)";

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "analyst" });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useQuery<TeamUser[]>({
    queryKey: ["/api/users"],
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setForm({ name: "", email: "", password: "", role: "analyst" });
      setShowForm(false);
      toast({ title: "Team member added", description: "New user has been created successfully." });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeletingId(null);
      toast({ title: "Team member removed", description: "User has been deleted." });
    },
    onError: (e: any) => {
      setDeletingId(null);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: "Validation error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    addMutation.mutate(form);
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user accounts and access roles for the WFHP platform.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors"
          style={{
            background: GOLD,
            color: "#1a1a0e",
          }}
        >
          <span className="text-base leading-none">+</span>
          Add Team Member
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">New Team Member</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Role</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="px-4 py-2 text-sm font-semibold rounded transition-colors disabled:opacity-60"
                style={{ background: GOLD, color: "#1a1a0e" }}
              >
                {addMutation.isPending ? "Adding…" : "Add Member"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm({ name: "", email: "", password: "", role: "analyst" });
                }}
                className="px-4 py-2 text-sm rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-sm font-semibold text-foreground mb-2">Remove team member?</h3>
            <p className="text-xs text-muted-foreground mb-5">
              This will permanently delete the user account. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId!)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs rounded bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteMutation.isPending ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No team members found.
                  </td>
                </tr>
              ) : (
                users.map((u, i) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`${i < users.length - 1 ? "border-b border-border" : ""} bg-card hover:bg-muted/30 transition-colors`}
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                            (you)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3.5">
                        {u.role === "admin" ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                            style={{ background: "hsl(45 85% 55% / 0.15)", color: GOLD }}
                          >
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-400">
                            Analyst
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => setDeletingId(u.id)}
                            className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {users.length} {users.length === 1 ? "member" : "members"} · Admins have full platform access. Analysts have read/write access to deal data.
      </p>
    </div>
  );
}
