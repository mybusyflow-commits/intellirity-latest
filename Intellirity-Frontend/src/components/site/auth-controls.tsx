"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

/* Clerk is enabled only once NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists.
   Until then this renders the plain dashboard link, so keyless builds
   and local dev keep working untouched. */
export const AUTH_ENABLED =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function DashboardLink({ className = "" }: { className?: string }) {
  return (
    <a
      href="/console"
      className={`inline-flex items-center gap-1.5 rounded bg-ink font-medium text-bg transition-colors hover:bg-white ${className}`}
    >
      Open Dashboard
      <ArrowRight className="size-3.5" />
    </a>
  );
}

export function NavbarAuth() {
  if (!AUTH_ENABLED) {
    return <DashboardLink className="hidden h-9 px-4 text-[13px] sm:inline-flex" />;
  }
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="hidden h-9 items-center rounded px-3 text-[13px] font-medium text-dim transition-colors hover:text-ink sm:inline-flex">
            Sign in
          </button>
        </SignInButton>
        <DashboardLink className="hidden h-9 px-4 text-[13px] sm:inline-flex" />
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: { avatarBox: "size-8" },
          }}
        />
        <DashboardLink className="hidden h-9 px-4 text-[13px] sm:inline-flex" />
      </SignedIn>
    </>
  );
}

export function MobileAuth({ onDone }: { onDone: () => void }) {
  if (!AUTH_ENABLED) {
    return (
      <a
        href="/console"
        onClick={onDone}
        className="flex h-11 items-center justify-center gap-2 rounded bg-ink text-[14px] font-medium text-bg"
      >
        Open Dashboard
        <ArrowRight className="size-4" />
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2.5" onClick={onDone}>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="flex h-11 flex-1 items-center justify-center rounded border border-line-strong text-[14px] font-medium">
            Sign in
          </button>
        </SignInButton>
        <a
          href="/console"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded bg-ink text-[14px] font-medium text-bg"
        >
          Open Dashboard
          <ArrowRight className="size-4" />
        </a>
      </SignedOut>
      <SignedIn>
        <UserButton showName />
      </SignedIn>
    </div>
  );
}
