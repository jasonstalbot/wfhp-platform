import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("jasonstalbot@me.com");
  const [password, setPassword] = useState("wfhp2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch {
      setError("Invalid credentials. Try password: wfhp2026");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none" aria-label="WFHP" className="mb-3">
            <rect x="2" y="2" width="10" height="10" stroke="hsl(45 85% 55%)" strokeWidth="1.5"/>
            <rect x="16" y="2" width="10" height="10" stroke="hsl(45 85% 55%)" strokeWidth="1.5"/>
            <rect x="9" y="16" width="10" height="10" stroke="hsl(45 85% 55%)" strokeWidth="1.5" fill="hsl(45 85% 55% / 0.15)"/>
          </svg>
          <div className="text-yellow-400 font-semibold tracking-[0.2em] text-sm">WFHP</div>
          <div className="text-muted-foreground text-xs mt-0.5">Municipal Capital Partners</div>
          <div className="text-muted-foreground/50 text-[10px] mt-3 tracking-wider uppercase">Deal Sourcing Platform</div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Email</label>
            <input
              data-testid="input-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400/50 focus:border-yellow-400/50"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Password</label>
            <input
              data-testid="input-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="wfhp2026"
              className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400/50 focus:border-yellow-400/50"
              required
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            data-testid="button-login"
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-background font-semibold py-2 rounded text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-8">
          WFHP LLC · Confidential · Internal Use Only
        </p>
      </div>
    </div>
  );
}
