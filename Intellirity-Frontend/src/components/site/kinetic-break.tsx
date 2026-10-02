"use client";

import { useEffect, useRef } from "react";
import { LiquidChrome } from "@/components/fx/liquid-chrome";

const WORDS = [
  { text: "DETECT", speed: -0.16, cls: "text-ink" },
  { text: "DECIDE", speed: -0.09, cls: "text-transparent [-webkit-text-stroke:1px_rgba(233,231,226,0.35)]" },
  { text: "DEFEND", speed: -0.24, cls: "text-dim" },
];

export function KineticBreak() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.querySelectorAll<HTMLElement>("[data-speed]").forEach((word) => {
          const speed = parseFloat(word.dataset.speed || "0");
          word.style.transform = `translateX(${progress * speed * 1000}px)`;
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="relative z-10 overflow-hidden border-y border-line bg-raise/40 py-20 md:py-28">
      {/* liquid-chrome field behind the words, dimmed to keep type crisp */}
      <div className="pointer-events-none absolute inset-0 opacity-45" aria-hidden>
        <LiquidChrome baseColor={[0.09, 0.1, 0.11]} speed={0.7} amplitude={0.55} interactive={false} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-transparent to-bg" aria-hidden />
      <div className="relative flex flex-col items-center">
        {WORDS.map(({ text, speed, cls }) => (
          <div key={text} className="w-full overflow-hidden text-center">
            <span
              data-speed={speed}
              className={`inline-block text-[clamp(3.2rem,10vw,8rem)] font-medium leading-[1.02] tracking-[-0.03em] will-change-transform ${cls}`}
            >
              {text}
            </span>
          </div>
        ))}
      </div>
      <p className="relative mt-8 text-center font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
        the verdict loop · every request
      </p>
    </div>
  );
}
