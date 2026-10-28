"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/* Client-side console gate.

   It no longer blocks the console behind "checking session". Clerk's browser
   SDK can take seconds on a cold custom-domain load, and a spinner made the
   whole dashboard feel broken. The shell renders immediately; the API is the
   authorization boundary, and this effect redirects a clearly signed-out
   visitor once Clerk has resolved the state.

   The server layout still redirects requests with no cookies at all, and the
   API rejects every unauthenticated call.
 */
export function ConsoleGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in?redirect_url=%2Fconsole");
    }
  }, [isLoaded, isSignedIn, router]);

  return <>{children}</>;
}
