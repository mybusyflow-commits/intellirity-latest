import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
      <div className="w-full max-w-[520px]">
        <Logo />
        <div className="mt-10 font-mono text-[13px] tabular-nums text-faint">404 · no verdict for this route</div>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.03em]">
          This path isn&apos;t guarded.
        </h1>
        <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-dim">
          The page you asked for doesn&apos;t exist or was moved. The mesh,
          however, is still operational.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded bg-ink px-5 text-[13.5px] font-medium text-bg transition-colors hover:bg-white"
          >
            <ArrowLeft className="size-4" />
            Back to landing
          </Link>
          <Link
            href="/console"
            className="inline-flex h-10 items-center gap-2 rounded border border-line-strong px-5 text-[13.5px] font-medium transition-colors hover:border-ink/40"
          >
            Open dashboard
            <ArrowUpRight className="size-4 text-faint" />
          </Link>
        </div>
        <div className="mt-10 flex items-center gap-2 border-t border-line pt-5 font-mono text-[11px] text-faint">
          <span className="dot animate-status bg-ok" />
          all systems operational · this 404 is the only thing unguarded here
        </div>
      </div>
    </div>
  );
}
