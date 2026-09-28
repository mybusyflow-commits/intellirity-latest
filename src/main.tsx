import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App, { AppShell } from "./app/App.tsx";
import "./styles/index.css";

const clerkPublishableKey = (
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
) as string | undefined;

if (clerkPublishableKey) {
  createRoot(document.getElementById("root")!).render(
    <ClerkProvider publishableKey={clerkPublishableKey} routing="virtual">
      <App />
    </ClerkProvider>
  );
} else {
  // No Clerk key configured: run in open mode (no auth gating) so the
  // site still works. Add VITE_CLERK_PUBLISHABLE_KEY to .env to enable auth.
  createRoot(document.getElementById("root")!).render(
    <AppShell
      openMode
      auth={{ isSignedIn: true, isLoaded: true, user: null, signOut: () => {} }}
    />
  );
}
