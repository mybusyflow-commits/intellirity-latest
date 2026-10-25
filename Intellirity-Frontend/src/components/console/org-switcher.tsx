"use client";

import { useEffect, useState } from "react";
import { OrganizationSwitcher, useAuth } from "@clerk/nextjs";
import { AUTH_ENABLED } from "@/components/site/auth-controls";
import { cn } from "@/lib/utils";

/* Active-tenant switcher.
   The engine keys billing, organizations and the workspace by the
   organization the session is acting for, so switching organization must
   change the tenant the whole console reads and writes.

   Clerk Core 3 removed <SignedIn>/<SignedOut>, so the session state comes
   from useAuth() directly. */
export function OrgSwitcher({ className = "" }: { className?: string }) {
  // useAuth() requires a ClerkProvider, which only exists when a
  // publishable key was present at build time.
  if (!AUTH_ENABLED) return null;
  return <OrgSwitcherInner className={className} />;
}

function OrgSwitcherInner({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => setMounted(true), []);

  // Clerk's components need the client; render nothing until mounted so
  // the server-rendered HTML and the client agree.
  if (!mounted || !isLoaded || !isSignedIn) return null;

  return (
    <div className={cn("flex items-center", className)}>
      <OrganizationSwitcher
        hidePersonal
        afterSelectOrganizationUrl="/console"
        appearance={{
          elements: {
            organizationSwitcherTrigger:
              "inline-flex h-8 items-center gap-1.5 rounded border border-line px-2.5 font-mono text-[11px] text-dim transition-colors hover:border-line-strong hover:text-ink",
            organizationSwitcherPopoverCard:
              "w-64 rounded-lg border border-line bg-raise shadow-xl",
            organizationSwitcherListItem: "font-mono text-[11.5px]",
            organizationSwitcherPopoverActionButton: "font-mono text-[11.5px]",
          },
        }}
      />
    </div>
  );
}
