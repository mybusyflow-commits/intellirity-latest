"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api";

/* Keeps the engine client authenticated: every /backend call carries the
   current Clerk session JWT as a Bearer token. Rendered once inside the
   ClerkProvider; harmless if the session is signed out (no header sent). */
export function AuthBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setTokenGetter(async () => {
      if (!isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => setTokenGetter(null);
  }, [getToken, isSignedIn]);

  return null;
}
