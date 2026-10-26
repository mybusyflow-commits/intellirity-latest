"use client";

import { useEffect, useState } from "react";
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
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in?redirect_url=%2Fconsole");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded) return;
    const id = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(id);
  }, [isLoaded]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
        <div className="max-w-sm text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">
            {isLoaded ? "redirecting to sign-in" : "checking session"}
          </p>
          {slow && !isLoaded && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
              Clerk is taking longer than usual. Reload the page, or{" "}
              <a href="/sign-in?redirect_url=%2Fconsole" className="text-ink underline underline-offset-4">
                sign in again
              </a>
              . Your session is kept in a cookie once established.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
