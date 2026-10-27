import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { COMPANY_ADDRESS, COMPANY_LEGAL_NAME, COMPANY_PHONE } from "@/lib/site";
import { cn } from "@/lib/utils";

/* Shared shell for the editorial pages (About, Research, Careers, Contact,
   policies, blog index). Keeps typography and glass surfaces consistent so
   these pages feel like one publication rather than a set of modals. */
export function PageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-aurora min-h-screen bg-bg text-ink">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Intellirity home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            <Link href="/blog" className="transition-colors hover:text-ink">
              Blog
            </Link>
            <Link href="/engines" className="hidden transition-colors hover:text-ink sm:inline">
              Engines
            </Link>
            <Link href="/pricing" className="hidden transition-colors hover:text-ink sm:inline">
              Pricing
            </Link>
            <Link href="/console" className="transition-colors hover:text-ink">
              Console
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-steel">{eyebrow}</p>
        <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(2.3rem,5.6vw,4rem)] font-medium leading-[1.02] tracking-[-0.035em]">
          {title}
        </h1>
        <p className="mt-6 max-w-[64ch] text-[16px] leading-[1.75] text-dim sm:text-[17px]">{lead}</p>
        <div className="mt-12">{children}</div>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 py-8 font-mono text-[10px] uppercase tracking-[0.12em] text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>
            © 2026 {COMPANY_LEGAL_NAME}
            {COMPANY_ADDRESS ? ` · ${COMPANY_ADDRESS}` : ""}
            {COMPANY_PHONE ? ` · ${COMPANY_PHONE}` : ""}
          </span>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-ink">Terms</Link>
            <Link href="/refund-policy" className="transition-colors hover:text-ink">Refunds</Link>
            <Link href="/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function GlassSection({
  title,
  eyebrow,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-panel rounded-2xl p-6 sm:p-8", className)}>
      {eyebrow && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">{eyebrow}</p>
      )}
      {title && (
        <h2 className="mt-2 font-display text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">
          {title}
        </h2>
      )}
      <div className="mt-4 text-[15px] leading-[1.8] text-dim">{children}</div>
    </section>
  );
}
