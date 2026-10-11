"use client";

import { Logo } from "@/components/site/logo";

/* Last-resort failure screen: a clean page, never a stack trace. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg font-sans text-ink antialiased">
        <div className="grid min-h-screen place-items-center px-6">
          <div className="w-full max-w-[520px]">
            <Logo />
            <div className="mt-10 font-mono text-[13px] tabular-nums text-faint">
              500 · something broke on our side
            </div>
            <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.03em]">
              The mesh stumbled. Nothing leaked.
            </h1>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-dim">
              The error was logged with a reference ID. Try again — if it
              persists, reach us through the contact channel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={reset}
                className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13.5px] font-medium text-bg transition-colors hover:bg-white"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex h-10 items-center rounded border border-line-strong px-5 text-[13.5px] font-medium transition-colors hover:border-ink/40"
              >
                Back to landing
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
