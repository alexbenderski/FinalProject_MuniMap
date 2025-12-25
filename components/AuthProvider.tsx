


//AuthProvider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { observeUser } from "@/lib/client/auth-client";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/client/firestore";

type Permissions = {
  //district: string;
  city: string;

};

type AuthCtx = { 
  user: User | null; 
  loading: boolean;
  permissions: Permissions | null;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  permissions: null
});

export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const un = observeUser(async (u) => {
      setUser(u);

      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPermissions(snap.data() as Permissions);
        } else {
          setPermissions(null);
        }
      } else {
        setPermissions(null);
      }

      setLoading(false);
    });

    return () => un();
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, permissions }}>
      {children}
    </Ctx.Provider>
  );
}