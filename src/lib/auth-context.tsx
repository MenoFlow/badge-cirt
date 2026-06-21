import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "@/services/api/auth";
import type { User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((u) => { setUser(u); setLoading(false); });
  }, []);

  return (
    <Ctx.Provider
      value={{
        user, loading,
        async login(email, password) {
          const u = await authApi.login(email, password);
          setUser(u);
          return u;
        },
        async logout() {
          await authApi.logout();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth() doit être utilisé dans <AuthProvider>");
  return v;
}
