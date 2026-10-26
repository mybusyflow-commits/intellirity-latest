"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { MobileAuth, NavbarAuth } from "@/components/site/auth-controls";
import { cn } from "@/lib/utils";
import { BLOG_POSTS } from "@/lib/blog";

const LINKS = [
  { href: "#pulse", label: "Live threats" },
  { href: "#platform", label: "Platform" },
  { href: "#scanner", label: "Scanner" },
  { href: "#pricing", label: "Pricing" },
];

function Wordmark() {
  return (
    <a href="#top" aria-label="Intellirity home">
      <Logo />
    </a>
  );
}

function BlogMenu() {
  return (
    <div className="group relative">
      <Link
        href="/blog"
        className="flex items-center gap-1 text-[13.5px] text-dim transition-colors hover:text-ink"
      >
        Blog
        <ChevronDown className="size-3.5 transition-transform duration-200 group-hover:rotate-180" />
      </Link>
      <div className="pointer-events-none invisible absolute left-1/2 top-full w-[330px] -translate-x-1/2 pt-4 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-lg border border-line bg-bg/95 p-3 shadow-2xl backdrop-blur-md">
          <p className="px-2 pb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            Latest articles
          </p>
          {BLOG_POSTS.slice(0, 3).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded px-2 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <span className="block text-[12.5px] leading-snug text-ink/90">{post.title}</span>
              <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">
                {post.category}
              </span>
            </Link>
          ))}
          <Link
            href="/blog"
            className="mt-1 flex items-center justify-between border-t border-line px-2 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-steel transition-colors hover:text-ink"
          >
            All articles <span aria-hidden>?</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    // Scroll used to call setState on every event, re-rendering the Clerk
    // controls and the whole mobile menu at display refresh rate. The bar is
    // a transform; writing it directly keeps scrolling off React's path and
    // only the boolean class change re-renders.
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const nextScrolled = y > 24;
        if (nextScrolled !== scrolledRef.current) {
          scrolledRef.current = nextScrolled;
          setScrolled(nextScrolled);
        }
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
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
            <BlogMenu />
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint lg:flex">
              <span className="dot animate-status bg-ok" />
              All systems normal
            </span>
            <NavbarAuth />
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
          ref={progressRef}
          className="h-px origin-left bg-steel/60"
          style={{ transform: "scaleX(0)", opacity: scrolled ? 1 : 0 }}
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
              <li>
                <Link
                  href="/blog"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-line/60 py-3 text-[15px] text-dim transition-colors hover:text-ink"
                >
                  Blog
                  <span className="font-mono text-[11px] text-faint">?</span>
                </Link>
              </li>
              <li className="pt-3">
                <MobileAuth onDone={() => setOpen(false)} />
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
