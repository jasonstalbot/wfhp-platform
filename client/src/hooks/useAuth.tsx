import { createContext, useContext, useState, type ReactNode } from "react";
import { apiRequest } from "../lib/queryClient";

interface AuthUser { id: number; name: string; email: string; role: string; }
interface AuthCtx { user: AuthUser | null; login: (email: string, password: string) => Promise<void>; logout: () => void; }

const Ctx = createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse((window as any).__wfhpUser__ || "null"); } catch { return null; }
  });

  const login = async (email: string, password: string) => {
    // Try backend first; fall back to local credential check if API is unreachable
    try {
      const data = await apiRequest("POST", "/api/auth/login", { email, password });
      (window as any).__wfhpUser__ = JSON.stringify(data.user);
      setUser(data.user);
    } catch {
      // Offline / static-deploy fallback — hardcoded credentials
      if (email === "jasonstalbot@me.com" && password === "wfhp2026") {
        const fallbackUser = { id: 1, name: "Jason Talbot", email, role: "admin" };
        (window as any).__wfhpUser__ = JSON.stringify(fallbackUser);
        setUser(fallbackUser);
      } else {
        throw new Error("Invalid credentials");
      }
    }
  };

  const logout = () => {
    (window as any).__wfhpUser__ = null;
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
