import Link from "next/link";
import { ArrowRight, CalendarDays, MessagesSquare, Settings2 } from "lucide-react";

const PATHS = [
  {
    title: "Book a call",
    body: "Pick a time to walk through your AI systems, current controls and the risk that matters first.",
    label: "Request a call",
    href: "/contact",
    icon: CalendarDays,
  },
  {
    title: "Talk to the team",
    body: "Ask a product, security or integration question before committing to a plan.",
    label: "Contact us",
    href: "/contact",
    icon: MessagesSquare,
  },
  {
    title: "Configure your plan",
    body: "Tell us what you run and who needs coverage. We will scope the right modules and terms with you.",
    label: "Start a conversation",
    href: "/#contact",
    icon: Settings2,
  },
];

/** Public commercial entry point. Deliberately shows no price list or checkout. */
export function PlanCta({ step = "06" }: { step?: string }) {
  return (
    <section id="plans" className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">{step}</span>
            <span className="h-px w-8 bg-line-strong" />
            plans
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            Let&apos;s configure the right plan.
          </h2>
        </div>
        <p className="reveal max-w-sm text-[14.5px] leading-relaxed text-dim">
          Every AI environment is different. We scope coverage with your team
          instead of asking you to assemble a plan from a public price list.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PATHS.map((path) => (
          <article key={path.title} className="panel flex flex-col rounded-lg p-6 md:p-7">
            <path.icon className="size-5 text-steel" strokeWidth={1.5} />
            <h3 className="mt-4 text-[17px] font-medium tracking-[-0.01em]">
              {path.title}
            </h3>
            <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-dim">
              {path.body}
            </p>
            <Link
              href={path.href}
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink transition-colors hover:text-bright"
            >
              {path.label}
              <ArrowRight className="size-3.5" strokeWidth={1.8} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
