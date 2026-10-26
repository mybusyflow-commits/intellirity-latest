"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/* Client-side console gate.
   Vercel Services cannot run Next.js Edge middleware, and Clerk's server
   helpers require it, so the layout does a cheap server-side cookie check
   (redirect when there is clearly no session) and this component confirms
   the session with Clerk before showing any console UI.

   The API remains the security boundary: every console call is rejected
   with 401 without a valid session token, regardless of this component. */
export function ConsoleGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in?redirect_url=%2Fconsole");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">
          {isLoaded ? "redirecting to sign-in" : "checking session"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
