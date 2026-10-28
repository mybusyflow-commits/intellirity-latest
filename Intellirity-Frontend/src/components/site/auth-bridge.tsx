"use client";

import { useEffect, useRef } from "react";
import { useAuth, useSession } from "@clerk/nextjs";
import { markAuthReady, setTokenGetter } from "@/lib/api";

/* Keeps the engine client authenticated: every /backend call carries the
   current Clerk session JWT as a Bearer token.

   Clerk's browser SDK loads asynchronously and can be slow on a cold,
   custom-domain deployment. Waiting for it before making any API call made
   the console look frozen. The session is already present in the
   `__session` cookie as a signed JWT, so we can use that immediately and
   upgrade to Clerk's refreshed token once the SDK is ready. The backend
   verifies the signature either way.
 */

function sessionCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)(__session(?:_[^=;]+)?)=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

export function AuthBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const lastSessionId = useRef<string | null>(null);

  useEffect(() => {
    setTokenGetter(async () => {
      // Prefer Clerk's refreshed token when it is available. If Clerk is
      // still loading or its network call fails, the cookie token is a
      // valid fallback and keeps the dashboard interactive.
      if (isLoaded && isSignedIn) {
        try {
          const skipCache =
            lastSessionId.current !== null && lastSessionId.current !== session?.id;
          const token = await getToken({ skipCache });
          if (token) return token;
        } catch {
          /* fall through to the cookie */
        }
      }
      return sessionCookieToken();
    });
    lastSessionId.current = session?.id ?? null;
    markAuthReady();
    window.dispatchEvent(new Event("intellirity:auth-ready"));
    return () => setTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn, session?.id]);

  return null;
}
