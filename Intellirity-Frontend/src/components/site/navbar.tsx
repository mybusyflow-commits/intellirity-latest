"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#pulse", label: "Live threats" },
  { href: "#platform", label: "Platform" },
  { href: "#scanner", label: "Scanner" },
  { href: "#how", label: "Deploy" },
  { href: "#pricing", label: "Pricing" },
];

function Wordmark() {
  return (
    <a href="#top" aria-label="Intellirity home">
      <Logo />
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "border-b transition-colors duration-500",
          scrolled ? "border-line bg-bg/90 backdrop-blur-md" : "border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
          <Wordmark />

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13.5px] text-dim transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint lg:flex">
              <span className="dot animate-status bg-ok" />
              All systems normal
            </span>
            <a
              href="/console"
              className="hidden h-9 items-center gap-1.5 rounded bg-ink px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white sm:inline-flex"
            >
              Open Dashboard
              <ArrowRight className="size-3.5" />
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded border border-line text-dim transition-colors hover:border-line-strong hover:text-ink md:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        <div
          className="h-px origin-left bg-steel/60"
          style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Mobile"
            className="border-b border-line bg-bg/95 backdrop-blur-md md:hidden"
          >
            <ul className="mx-auto max-w-[1240px] space-y-1 px-6 py-4">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                >
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-line/60 py-3 text-[15px] text-dim transition-colors last:border-b-0 hover:text-ink"
                  >
                    {l.label}
                    <span className="font-mono text-[11px] text-faint">
                      0{i + 1}
                    </span>
                  </a>
                </motion.li>
              ))}
              <li className="pt-3">
                <a
                  href="/console"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded bg-ink text-[14px] font-medium text-bg"
                >
                  Open Dashboard
                  <ArrowRight className="size-4" />
                </a>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
