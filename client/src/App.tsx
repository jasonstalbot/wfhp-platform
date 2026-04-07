import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";

// Pages
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import IntakePage from "./pages/Intake";
import ScreenPage from "./pages/Screen";
import UnderwritingPage from "./pages/Underwriting";
import MarketSievePage from "./pages/MarketSieve";
import PipelinePage from "./pages/Pipeline";
import IssuersPage from "./pages/Issuers";
import SettingsPage from "./pages/Settings";
import SourcingPage from "./pages/Sourcing";
import TeamPage from "./pages/Team";

// Auth context
import { AuthProvider, useAuth } from "./hooks/useAuth";

function AppShell() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <LoginPage />;

  const nav = [
    { href: "/", label: "Dashboard", icon: "▦" },
    { href: "/intake", label: "Intake", icon: "⊕" },
    { href: "/screen", label: "Screen", icon: "◈" },
    { href: "/underwriting", label: "Bond Engine", icon: "∫" },
    { href: "/market-sieve", label: "Market Sieve", icon: "◎" },
    { href: "/pipeline", label: "Pipeline / CRM", icon: "◱" },
    { href: "/issuers", label: "TEFRA Issuers", icon: "⊞" },
    { href: "/sourcing", label: "Deal Sourcing", icon: "◉" },
    { href: "/team", label: "Team", icon: "◫" },
    { href: "/settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-card border-r border-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="WFHP">
              <rect x="2" y="2" width="10" height="10" stroke="hsl(45 85% 55%)" strokeWidth="1.5"/>
              <rect x="16" y="2" width="10" height="10" stroke="hsl(45 85% 55%)" strokeWidth="1.5"/>
              <rect x="9" y="16" width="10" height="10" stroke="hsl(45 85% 55%)" strokeWidth="1.5" fill="hsl(45 85% 55% / 0.15)"/>
            </svg>
            <div>
              <div className="text-xs font-semibold text-yellow-400 tracking-widest">WFHP</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Municipal Capital</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {nav.map(n => (
            <Link key={n.href} href={n.href}>
              <a className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                location === n.href
                  ? "text-yellow-400 bg-yellow-400/8 border-r-2 border-yellow-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
                <span className="text-base leading-none">{n.icon}</span>
                <span>{n.label}</span>
              </a>
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground truncate">{user.name}</div>
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{user.role}</div>
          <button onClick={logout} className="text-[11px] text-muted-foreground hover:text-red-400 mt-1 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/intake" component={IntakePage} />
          <Route path="/screen" component={ScreenPage} />
          <Route path="/underwriting" component={UnderwritingPage} />
          <Route path="/market-sieve" component={MarketSievePage} />
          <Route path="/pipeline" component={PipelinePage} />
          <Route path="/issuers" component={IssuersPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/sourcing" component={SourcingPage} />
          <Route path="/team" component={TeamPage} />
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AppShell />
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
