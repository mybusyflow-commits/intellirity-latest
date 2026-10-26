"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkoutBundle } from "@/lib/api";

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

/* PayU is a redirect flow: the server returns a signed form and the browser
   POSTs it to PayU. Building it here keeps the salt off the client. */
function submitPayuForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function Pricing() {
  const [products, setProducts] = useState<Product[]>(FALLBACK);
  const [live, setLive] = useState(false);
  // Mirrors the engine's bundle rule; replaced by the API value on load.
  const [bundlePct, setBundlePct] = useState(20);
  // Which provider the engine says is live: "payu" | "dev".
  const [paymentMode, setPaymentMode] = useState<"payu" | "dev">("dev");
  const [payuMode, setPayuMode] = useState<"test" | "live" | null>(null);
  const [firstname, setFirstname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<{ kind: "success" | "failed"; order: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [openTier, setOpenTier] = useState<"basic" | "core" | null>(null);
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
        if (j.bundle && typeof j.bundle.discount_pct === "number") {
          setBundlePct(j.bundle.discount_pct);
        }
        if (j.payment === "payu") setPaymentMode("payu");
        if (j.payu_mode === "test" || j.payu_mode === "live") setPayuMode(j.payu_mode);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  // PayU returns the browser here with the outcome. The server has already
  // verified the reverse hash and activated the order; this only reports it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;
    setResult({
      kind: payment === "success" ? "success" : "failed",
      order: params.get("order") || "",
    });
  }, []);

  // A paywall link carries the module it needs (/pricing?module=wallet-guard).
  // Preselect exactly that module so "unlock" is one step, not a hunt.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("module");
    if (!wanted) return;
    const product = products.find((p) => p.id === wanted);
    if (product) {
      setSelected([wanted]);
      setOpenTier(product.tier);
    }
  }, [products]);

  const pricing = useMemo(() => {
    const chosen = products.filter((p) => selected.includes(p.id));
    const subtotal = chosen.reduce((sum, p) => sum + p.price, 0);
    const allSelected = products.length > 0 && chosen.length === products.length;
    const discountPct = allSelected ? bundlePct : 0;
    const discount = Math.round((subtotal * discountPct) / 100);
    return { subtotal, discountPct, discount, total: subtotal - discount, allSelected };
  }, [products, selected, bundlePct]);

  const toggle = (id: string) =>
    setSelected((ss) => (ss.includes(id) ? ss.filter((x) => x !== id) : [...ss, id]));

  const toggleAll = () =>
    setSelected(pricing.allSelected ? [] : products.map((p) => p.id));

  // Never let a production visitor create a fake "pending-payment" order.
  // Checkout is only offered when the engine reports a live provider.
  const isProduction = process.env.NEXT_PUBLIC_DEPLOY_ENV === "production";
  const paymentsDisabled = isProduction && paymentMode === "dev";

  async function checkout() {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    setError("");
    setOrder(null);
    setResult(null);
    try {
      const j = await checkoutBundle(selected, {
        firstname: firstname.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (j.action && j.fields) {
        // Leaves the page for PayU. The server has already persisted the
        // order and signed the form; PayU returns to the callback route.
        submitPayuForm(j.action, j.fields);
        return;
      }
      setOrder({ order_id: j.order_id, total_inr: j.total_inr, status: j.status });
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
          {result && (
            <div
              role="status"
              className={cn(
                "mb-5 rounded-lg border px-4 py-3 font-mono text-[11.5px] leading-relaxed",
                result.kind === "success" ? "border-ok/40 text-ok" : "border-crit/40 text-crit"
              )}
            >
              {result.kind === "success"
                ? `Payment received${result.order ? ` · ${result.order}` : ""}. Your modules are active.`
                : `Payment was not completed${result.order ? ` · ${result.order}` : ""}. Nothing was charged.`}
            </div>
          )}
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">05</span>
            <span className="h-px w-8 bg-line-strong" />
            pricing
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            One plan. Pick your modules.
          </h2>
          <p className="reveal mt-4 max-w-lg text-[14.5px] leading-relaxed text-dim">
            No plan tiers, no seats. Choose a group below to see its modules,
            toggle the coverage you need, and pay exactly the sum. Take all{" "}
            {products.length} modules together and save {bundlePct}%.
            {live ? " Prices live from billing." : ""}
          </p>
        </div>
        <div className="reveal w-full rounded-lg border border-line bg-raise p-5 md:w-72">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
              your bundle · {selected.length} module{selected.length === 1 ? "" : "s"}
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-steel transition-colors hover:text-ink"
            >
              {pricing.allSelected ? "clear" : `all ${products.length} · −${bundlePct}%`}
            </button>
          </div>
          <div className="mt-1 font-display text-[40px] font-medium tabular-nums">
            ₹{pricing.total.toLocaleString("en-IN")}
            <span className="font-mono text-[12px] text-faint">/mo</span>
          </div>
          {pricing.allSelected && (
            <p className="mt-0.5 font-mono text-[10.5px] leading-relaxed text-ok">
              <span className="text-faint line-through">
                ₹{pricing.subtotal.toLocaleString("en-IN")}
              </span>{" "}
              · full coverage −{pricing.discountPct}% · save ₹
              {pricing.discount.toLocaleString("en-IN")}/mo
            </p>
          )}
          {selected.length === 0 && (
            <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-faint">
              Choose Basics or Trust Core below to start.
            </p>
          )}
          {paymentMode === "payu" && (
            <div className="mt-3 space-y-2">
              <input
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Full name"
                aria-label="Full name"
                autoComplete="name"
                maxLength={60}
                className="h-9 w-full rounded border border-line bg-sunken px-2.5 text-[12px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                aria-label="Email for the receipt"
                type="email"
                autoComplete="email"
                maxLength={320}
                className="h-9 w-full rounded border border-line bg-sunken px-2.5 text-[12px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (required by PayU)"
                aria-label="Phone number"
                type="tel"
                autoComplete="tel"
                maxLength={18}
                className="h-9 w-full rounded border border-line bg-sunken px-2.5 text-[12px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
          )}
          <button
            onClick={checkout}
            disabled={busy || selected.length === 0 || paymentsDisabled}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-ink text-[13.5px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {paymentsDisabled
              ? "Payments not enabled"
              : busy
                ? "redirecting…"
                : paymentMode === "payu"
                  ? "Pay with PayU"
                  : "Checkout bundle"}
            {!paymentsDisabled && <ArrowRight className="size-4" />}
          </button>
          {paymentMode === "payu" && payuMode === "test" && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
              PayU test mode — no real money is charged.
            </p>
          )}
          {paymentsDisabled && (
            <p className="mt-2.5 font-mono text-[10.5px] leading-relaxed text-faint">
              Checkout is disabled until a payment provider is configured.
            </p>
          )}
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

      <div className="reveal grid gap-3 sm:grid-cols-2">
        {[
          {
            key: "basic" as const,
            title: "Basics",
            count: basics.length,
            range: "₹79–99",
            note: "Injection, code, leakage, content, agents and spend.",
          },
          {
            key: "core" as const,
            title: "Trust Core",
            count: core.length,
            range: "₹299–399",
            note: "Escrow, evidence ledger and proof of intent.",
          },
        ].map((tier) => {
          const open = openTier === tier.key;
          const picked = (tier.key === "basic" ? basics : core).filter((p) =>
            selected.includes(p.id)
          ).length;
          return (
            <button
              key={tier.key}
              type="button"
              aria-expanded={open}
              onClick={() => setOpenTier(open ? null : tier.key)}
              className={cn(
                "group flex items-center justify-between gap-4 rounded-lg border px-5 py-4 text-left transition-colors",
                open ? "border-steel/60 bg-raise" : "border-line bg-bg hover:border-line-strong"
              )}
            >
              <span>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[15px] font-medium">{tier.title}</span>
                  <span className="font-mono text-[10.5px] text-faint">
                    {tier.count} modules · {tier.range}/mo
                  </span>
                </span>
                <span className="mt-1 block text-[12.5px] text-faint">{tier.note}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-steel">
                {picked > 0 ? `${picked} selected` : open ? "hide" : "reveal"}
              </span>
            </button>
          );
        })}
      </div>

      {openTier === "basic" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {basics.map((p) => (
            <ModuleCard key={p.id} p={p} on={selected.includes(p.id)} onToggle={() => toggle(p.id)} />
          ))}
        </div>
      )}

      {openTier === "core" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {core.map((p) => (
            <ModuleCard key={p.id} p={p} on={selected.includes(p.id)} onToggle={() => toggle(p.id)} />
          ))}
        </div>
      )}
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
