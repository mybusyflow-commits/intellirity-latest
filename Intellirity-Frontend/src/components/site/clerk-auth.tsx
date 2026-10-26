"use client";

import { Suspense, useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";

/* Clerk's hosted form suspends while the client SDK initialises. Keeping it
   in its own Suspense boundary means the page never loses everything else
   while that happens; the sibling notice explains the one common failure
   (a live instance rejecting localhost) without touching the form. */

function Pending({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <div className="panel rounded-lg p-8 text-center" aria-busy="true" aria-live="polite">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-dim">
        {mode === "sign-in" ? "sign-in" : "sign-up"}
        <span className="ml-2 inline-block animate-pulse">·</span>
      </p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-faint">
        Establishing a secure session…
      </p>
    </div>
  );
}

/* Rendered only on a local origin: a live Clerk instance accepts only the
   domains configured for it, so the form will legitimately stay empty here. */
function LocalhostNotice() {
  const [local, setLocal] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setLocal(host === "localhost" || host === "127.0.0.1" || host === "::1");
  }, []);

  if (!local) return null;

  return (
    <p className="mt-5 rounded border border-line px-4 py-3 font-mono text-[10.5px] leading-relaxed text-faint">
      Local development with a live Clerk instance: only the configured
      production domains are accepted, so this form will not appear on
      localhost. Test sign-in on{" "}
      <span className="text-dim">https://intellirity.com</span>, or use a Clerk
      development instance (<span className="text-dim">pk_test_</span> keys)
      locally.
    </p>
  );
}

export function ClerkSignIn() {
  return (
    <>
      <Suspense fallback={<Pending mode="sign-in" />}>
        <SignIn fallbackRedirectUrl="/console" signUpFallbackRedirectUrl="/console" />
      </Suspense>
      <LocalhostNotice />
    </>
  );
}

export function ClerkSignUp() {
  return (
    <>
      <Suspense fallback={<Pending mode="sign-up" />}>
        <SignUp fallbackRedirectUrl="/console" signInFallbackRedirectUrl="/console" />
      </Suspense>
      <LocalhostNotice />
    </>
  );
}
