"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { AUTH_ENABLED } from "@/components/site/auth-controls";

/* Console identity chip. Renders nothing until Clerk keys exist.
   Clerk Core 3 removed <SignedIn>; useAuth() is the supported check.
   The hook lives in an inner component because it requires a
   ClerkProvider, which keyless builds do not mount. */
export function UserChip() {
  if (!AUTH_ENABLED) return null;
  return <UserChipInner />;
}

function UserChipInner() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return (
    <UserButton
      appearance={{
        elements: { avatarBox: "size-8" },
      }}
    />
  );
}
