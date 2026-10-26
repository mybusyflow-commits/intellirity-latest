"use client";

import { useEffect, useRef } from "react";
import { useAuth, useSession } from "@clerk/nextjs";
import { markAuthReady, setTokenGetter } from "@/lib/api";

/* Keeps the engine client authenticated: every /backend call carries the
   current Clerk session JWT as a Bearer token. Rendered once inside the
   ClerkProvider; harmless if the session is signed out (no header sent).

   Switching organization changes the org claims inside the token, so the
   cached token must be bypassed after a switch — otherwise the engine
   would keep billing the previous tenant. */
export function AuthBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const lastSessionId = useRef<string | null>(null);

  useEffect(() => {
    // Do not install a getter until Clerk has resolved the session: a
    // getter that returns null during the first render caused a 401 burst
    // from console effects that ran before Clerk was ready.
    if (!isLoaded) return;
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
    // Tell the console the token getter is usable and which session it
    // belongs to. Entitlement state must be fetched after this, and must be
    // re-fetched when an organization switch mints a new token.
    markAuthReady();
    window.dispatchEvent(new Event("intellirity:auth-ready"));
    return () => setTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn, session?.id]);

  return null;
}
