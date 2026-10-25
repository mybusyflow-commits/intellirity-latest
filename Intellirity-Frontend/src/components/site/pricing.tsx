"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkoutBundle, verifyPayment } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  price: number;
  blurb: string;
  engines: string[];
  href: string;
  tier: "basic" | "core";
}

/* Mirrors the engine's catalogue; used only if the backend is unreachable. */
const FALLBACK: Product[] = [
  { id: "injection-shield", name: "Injection Shield", price: 99, blurb: "Jailbreak + advanced encoding defense.", engines: [], href: "/console/scanner", tier: "basic" },
  { id: "vibe-code", name: "Vibe-Code Security", price: 99, blurb: "SQLi, XSS, secrets and supply-chain checks.", engines: [], href: "/console/scanner", tier: "basic" },
  { id: "leakage-guard", name: "Leakage Guard", price: 99, blurb: "PII, secrets and pipeline-hop tracing.", engines: [], href: "/console/leakage", tier: "basic" },
  { id: "content-guard", name: "Content Guard", price: 79, blurb: "Spam, abuse and violence screening.", engines: [], href: "/console/content", tier: "basic" },
  { id: "agent-guard", name: "Agent Guard", price: 99, blurb: "Policy, drift, MCP and workflow checks.", engines: [], href: "/console/behavior", tier: "basic" },
  { id: "wallet-guard", name: "Wallet Guard", price: 79, blurb: "Runaway AI spend stopped early.", engines: [], href: "/console/wallet", tier: "basic" },
  { id: "escrow", name: "Agent Escrow", price: 399, blurb: "Oracle-verified custody for agent value.", engines: [], href: "/console/escrow", tier: "core" },
  { id: "ledger", name: "Evidence Ledger", price: 299, blurb: "Tamper-evident vault for every decision.", engines: [], href: "/console/audit", tier: "core" },
  { id: "vpi", name: "Proof of Intent", price: 299, blurb: "Signed human authorization per action.", engines: [], href: "/console/proof", tier: "core" },
];

/* Loads Razorpay's Checkout script on demand. The script is not in the
   bundle; it is fetched only when the visitor clicks checkout. */
function loadRazorpay(): Promise<Window["Razorpay"]> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error("Could not load the Razorpay checkout."));
    document.body.appendChild(s);
  });
}

export function Pricing() {
  const [products, setProducts] = useState<Product[]>(FALLBACK);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string[]>(["injection-shield", "leakage-guard"]);
  const [order, setOrder] = useState<{ order_id: string; total_inr: number; status: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let on = true;
    fetch("/backend/billing/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!on || !j || !Array.isArray(j.products) || j.products.length === 0) return;
        // Merge live prices onto the local catalogue. The API carries no
        // `tier` or `href`, so replacing the list with it left every card
        // filtered out -- an empty pricing page once the request succeeded.
        const liveById = new Map<string, Partial<Product>>(
          (j.products as Product[]).map((p) => [p.id, p])
        );
        setProducts(
          FALLBACK.map((p) => {
            const live = liveById.get(p.id);
            return live
              ? {
                  ...p,
                  name: live.name ?? p.name,
                  price: live.price ?? p.price,
                  blurb: live.blurb ?? p.blurb,
                  engines: live.engines ?? p.engines,
                }
              : p;
          })
        );
        setLive(true);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  const total = useMemo(
    () => products.filter((p) => selected.includes(p.id)).reduce((s, p) => s + p.price, 0),
    [products, selected]
  );

  const toggle = (id: string) =>
    setSelected((ss) => (ss.includes(id) ? ss.filter((x) => x !== id) : [...ss, id]));

  async function checkout() {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    setError("");
    setOrder(null);
    try {
      const j = await checkoutBundle(selected);
      if (j.razorpay_order_id && j.key_id) {
        const Rzp = await loadRazorpay();
        if (!Rzp) throw new Error("Razorpay checkout is not available.");
        const rzp = new Rzp({
          key: j.key_id,
          amount: j.amount ?? 0,
          currency: j.currency ?? "INR",
          name: "Intellirity",
          description: "Security modules · monthly",
          order_id: j.razorpay_order_id,
          theme: { color: "#0a0b0d" },
          handler: async (resp) => {
            try {
              await verifyPayment({
                order_id: j.order_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
              setOrder({ order_id: j.order_id, total_inr: j.total_inr, status: "active" });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Payment verification failed");
            }
          },
        });
        rzp.open();
      } else {
        setOrder({ order_id: j.order_id, total_inr: j.total_inr, status: j.status });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  const basics = products.filter((p) => p.tier === "basic");
  const core = products.filter((p) => p.tier === "core");

  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32">
      <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <div>
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">06</span>
            <span className="h-px w-8 bg-line-strong" />
            pricing
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            One plan. Pick your modules.
          </h2>
          <p className="reveal mt-4 max-w-lg text-[14.5px] leading-relaxed text-dim">
            No tiers, no seats. Toggle the coverage you need — basics from ₹79,
            the trust core up to ₹399 — and pay exactly the sum.
            {live ? " Prices live from billing." : ""}
          </p>
        </div>
        <div className="reveal w-full rounded-lg border border-line bg-raise p-5 md:w-72">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            your bundle · {selected.length} module{selected.length === 1 ? "" : "s"}
          </div>
          <div className="mt-1 font-display text-[40px] font-medium tabular-nums">
            ₹{total.toLocaleString("en-IN")}
            <span className="font-mono text-[12px] text-faint">/mo</span>
          </div>
          <button
            onClick={checkout}
            disabled={busy || selected.length === 0}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-ink text-[13.5px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {busy ? "creating order…" : "Checkout bundle"}
            <ArrowRight className="size-4" />
          </button>
          {order && (
            <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-ok">
              {order.order_id} · ₹{order.total_inr.toLocaleString("en-IN")} · {order.status}
            </p>
          )}
          {error !== "" && (
            <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-crit">{error}</p>
          )}
        </div>
      </div>

      {(basics.length > 0 || core.length > 0) && (
        <p className="reveal mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          basics · ₹79–99
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {basics.map((p) => (
          <ModuleCard key={p.id} p={p} on={selected.includes(p.id)} onToggle={() => toggle(p.id)} />
        ))}
      </div>
      {core.length > 0 && (
        <p className="reveal mb-4 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          trust core · ₹299–399
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {core.map((p) => (
          <ModuleCard key={p.id} p={p} on={selected.includes(p.id)} onToggle={() => toggle(p.id)} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({ p, on, onToggle }: { p: Product; on: boolean; onToggle: () => void }) {
  return (
    <article
      className={cn(
        "reveal relative flex flex-col rounded-lg border p-6 transition-colors",
        on ? "border-steel/60 bg-raise" : "border-line bg-bg"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-[12px] uppercase tracking-[0.16em] text-dim">{p.name}</h3>
        <button
          role="switch"
          aria-checked={on}
          aria-label={`${on ? "Remove" : "Add"} ${p.name}`}
          onClick={onToggle}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
            on ? "border-ink/60 bg-ink" : "border-line-strong bg-sunken"
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all",
              on ? "left-[27px] bg-bg" : "left-[3px] bg-faint"
            )}
          />
        </button>
      </div>
      <p className="mt-1.5 min-h-[42px] text-[13.5px] text-faint">{p.blurb}</p>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[36px] font-medium tabular-nums tracking-[-0.025em]">
          ₹{p.price.toLocaleString("en-IN")}
        </span>
        <span className="font-mono text-[12px] text-faint">/mo</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
          {p.engines.length > 0 ? `${p.engines.length} engines` : "live module"}
        </span>
        <a href={p.href} className="inline-flex min-h-6 items-center gap-1 text-[12.5px] text-dim transition-colors hover:text-ink">
          Try live <Check className="size-3.5 text-ok" strokeWidth={2} />
        </a>
      </div>
    </article>
  );
}
