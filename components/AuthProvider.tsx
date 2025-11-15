"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { observeUser } from "@/lib/auth-client";
import type { User } from "firebase/auth";

type AuthCtx = { user: User | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ user: null, loading: true });
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const un = observeUser(u => { setUser(u); setLoading(false); });
    return () => un();
  }, []);

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}
