"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import { AUTH_ENABLED } from "@/components/site/auth-controls";

/* Console identity chip. Renders nothing until Clerk keys exist. */
export function UserChip() {
  if (!AUTH_ENABLED) return null;
  return (
    <SignedIn>
      <UserButton
        appearance={{
          elements: { avatarBox: "size-8" },
        }}
      />
    </SignedIn>
  );
}
