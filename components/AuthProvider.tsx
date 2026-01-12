
//AuthProvider.tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { observeUser, logOut } from "@/lib/client/auth-client";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/client/firestore";

// ⏱️ Inactivity timeout: 5 minutes (in milliseconds)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 1 minutes

type Permissions = {
  //district: string;
  city: string;
};

type AuthCtx = { 
  user: User | null; 
  loading: boolean;
  permissions: Permissions | null;
  resetActivityTimer: () => void; // Expose for manual reset if needed
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  permissions: null,
  resetActivityTimer: () => {}
});

export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ⏱️ Inactivity timer reference
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);

  // 🔓 Logout due to inactivity
  const handleInactivityLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    
    console.log("⏱️ Session expired due to inactivity (5 minutes)");
    
    try {
      await logOut();
      // Clear any stored session data
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.removeItem('firebase:authUser');
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Force redirect to login with expired parameter
    if (typeof window !== 'undefined') {
      window.location.href = '/?expired=true';
    }
  }, []);

  // 🔄 Reset the inactivity timer
  const resetActivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Only set timer if user is logged in
    if (user && !isLoggingOutRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        handleInactivityLogout();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, handleInactivityLogout]);

  // 👁️ Monitor user activity
  useEffect(() => {
    if (!user) return;

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel'
    ];

    // Throttle activity detection to avoid excessive timer resets
    let lastActivity = Date.now();
    const THROTTLE_MS = 1000; // Only reset timer once per second max

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > THROTTLE_MS) {
        lastActivity = now;
        resetActivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetActivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, resetActivityTimer]);

  // 🔐 Firebase auth state observer
  useEffect(() => {
    const un = observeUser(async (u) => {
      setUser(u);
      isLoggingOutRef.current = false;

      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const userData = snap.data();
          // Support both direct city field and nested permissions.city
          setPermissions({
            city: userData.city || userData.permissions?.city || ""
          });
        } else {
          setPermissions(null);
        }
      } else {
        setPermissions(null);
        // Clear timer when user logs out
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      }

      setLoading(false);
    });

    return () => un();
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, permissions, resetActivityTimer }}>
      {children}
    </Ctx.Provider>
  );
}