"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, X } from "lucide-react";
import { useEntitlements } from "./entitlements";
import type { RouteDef } from "@/lib/routes";

/* Two surfaces, one rule:
 *  - a locked route renders <Paywall/>, so its page never mounts;
 *  - a 403 from the engine opens <PaywallNotice/>, so a deep link or a
 *    stale nav cannot degrade into a raw error string.
 */

function useProductInfo(productId?: string) {
  const { products } = useEntitlements();
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  return { name: product.name, price: product.price };
}

export function Paywall({ route }: { route?: RouteDef }) {
  const { refresh, periodDays, error } = useEntitlements();
  const info = useProductInfo(route?.product);
  const href = route?.product ? `/pricing?module=${route.product}#pricing` : "/pricing#pricing";

  return (
    <div className="mx-auto flex max-w-[620px] flex-col items-center py-16 text-center md:py-24">
      <span className="grid size-12 place-items-center rounded-full border border-line bg-raised text-dim">
        <Lock className="size-5" strokeWidth={1.5} />
      </span>
      <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
        paid feature
      </p>
      <h1 className="mt-3 text-[26px] font-medium leading-[1.15] tracking-[-0.02em] md:text-[32px]">
        {error
          ? "We could not verify your plan."
          : `${route?.title ?? "This module"} is not in your plan.`}
      </h1>
      <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-dim">
        {info
          ? `Add ${info.name} (₹${info.price}/month) to unlock this console and its engines.`
          : "Add this module to your plan to unlock the console and its engines."}{" "}
        A purchase covers {periodDays} days and can be renewed from the pricing
        page.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={href}
          className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
        >
          Unlock with {info ? info.name : "a module"}
        </Link>
        <Link
          href="/console"
          className="inline-flex h-10 items-center rounded border border-line-strong px-5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          Back to overview
        </Link>
      </div>
      <button
        onClick={() => refresh()}
        className="mt-6 font-mono text-[11px] text-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-dim"
      >
        Already paid? Refresh access
      </button>
      {error && (
        <p className="mt-3 max-w-[48ch] font-mono text-[10.5px] leading-relaxed text-warn">
          We could not verify your plan ({error}). Paid modules stay locked
          until the check succeeds.
        </p>
      )}
    </div>
  );
}

export function PaywallNotice() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { products } = useEntitlements();

  useEffect(() => {
    const onPaywall = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message ?? "");
      setOpen(true);
    };
    window.addEventListener("intellirity:paywall", onPaywall);
    return () => window.removeEventListener("intellirity:paywall", onPaywall);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative w-full max-w-[440px] rounded-lg border border-line bg-raise p-6 text-ink shadow-2xl"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded text-faint transition-colors hover:text-ink"
        >
          <X className="size-4" />
        </button>
        <span className="grid size-10 place-items-center rounded-full border border-line bg-sunken text-dim">
          <Lock className="size-4" strokeWidth={1.5} />
        </span>
        <h2 id="paywall-title" className="mt-4 text-[19px] font-medium tracking-[-0.01em]">
          This is a paid feature.
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
          {message ||
            `Your plan does not include this module. Add it to continue — the console will unlock as soon as payment is confirmed.`}
        </p>
        <div className="mt-5 flex gap-2.5">
          <Link
            href="/pricing"
            className="inline-flex h-9 flex-1 items-center justify-center rounded bg-ink px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white"
          >
            Go to pricing
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center justify-center rounded border border-line-strong px-4 text-[13px] font-medium text-dim transition-colors hover:text-ink"
          >
            Not now
          </button>
        </div>
        {products.length > 0 && (
          <p className="mt-3 text-center font-mono text-[10.5px] text-faint">
            modules from ₹{Math.min(...products.map((p) => p.price))}/month
          </p>
        )}
      </div>
    </div>
  );
}
