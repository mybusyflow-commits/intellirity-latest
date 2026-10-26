"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getEntitlements, getProducts, type EntitlementDetail, type Entitlements, type Product } from "@/lib/api";

/* Plan state for the console.
 *
 * The engine is the authority: it returns the modules this workspace owns
 * and the paid-through date for each. The UI uses that to lock navigation
 * before a page mounts, so an unpaid module cannot fire its API calls and
 * then surface an error string. If the plan cannot be verified the console
 * fails closed for paid routes and leaves the free routes usable.
 *
 * Refresh periodically and on window focus: a purchase completed in another
 * tab (PayU returns to /pricing) unlocks the console without a reload.
 */

interface EntitlementState {
  loading: boolean;
  error: string;
  enforced: boolean;
  owned: Set<string>;
  entitlements: Record<string, EntitlementDetail>;
  products: Product[];
  periodDays: number;
  isUnlocked: (product?: string) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<EntitlementState | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Entitlements | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await getEntitlements();
      setData(next);
      setError("");
    } catch {
      setError("the plan check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let live = true;

    getProducts()
      .then((r) => {
        if (live) setProducts(r.products);
      })
      .catch(() => {
        /* catalogue is cosmetic here; the engine still decides access */
      });

    refresh();

    const id = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    const onAuthReady = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("intellirity:auth-ready", onAuthReady);
    return () => {
      live = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("intellirity:auth-ready", onAuthReady);
    };
  }, [refresh]);

  const owned = useMemo(() => new Set(data?.owned ?? []), [data?.owned]);
  // Fail closed for paid routes when the plan cannot be verified on a
  // Clerk-enabled deployment: a transient API error must not silently
  // unlock every module. Free routes stay usable, and the paywall offers a
  // retry. In keyless local dev there is nothing to verify, so stay open.
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const enforced = data ? data.enforced : clerkEnabled && Boolean(error);

  const isUnlocked = useCallback(
    (product?: string) => {
      if (!product) return true;
      if (!enforced) return true;
      return owned.has(product);
    },
    [enforced, owned]
  );

  const value: EntitlementState = {
    loading,
    error,
    enforced,
    owned,
    entitlements: data?.entitlements ?? {},
    products,
    periodDays: data?.period_days ?? 30,
    isUnlocked,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useEntitlements must be used inside EntitlementsProvider");
  }
  return ctx;
}
