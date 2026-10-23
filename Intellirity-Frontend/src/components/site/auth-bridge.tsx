"use client";

import { useEffect, useRef } from "react";
import { useAuth, useSession } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api";

/* Keeps the engine client authenticated: every /backend call carries the
   current Clerk session JWT as a Bearer token. Rendered once inside the
   ClerkProvider; harmless if the session is signed out (no header sent).

   Switching organization changes the org claims inside the token, so the
   cached token must be bypassed after a switch — otherwise the engine
   would keep billing the previous tenant. */
export function AuthBridge() {
  const { getToken, isSignedIn } = useAuth();
  const { session } = useSession();
  const lastSessionId = useRef<string | null>(null);

  useEffect(() => {
    setTokenGetter(async () => {
      if (!isSignedIn) return null;
      try {
        // A new session id means Clerk minted a new token (org switch,
        // impersonation change, refresh). Bypass the cache so the org
        // claims match the active organization immediately.
        const skipCache = lastSessionId.current !== null &&
          lastSessionId.current !== session?.id;
        return await getToken({ skipCache });
      } catch {
        return null;
      }
    });
    lastSessionId.current = session?.id ?? null;
    return () => setTokenGetter(null);
  }, [getToken, isSignedIn, session?.id]);

  return null;
}
