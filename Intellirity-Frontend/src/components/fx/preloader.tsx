"use client";

import { useEffect, useState } from "react";
import { loadAnime } from "@/lib/use-anime";
import { Logo } from "@/components/site/logo";

const BOOT_LINES = [
  "loading console",
  "connecting to live engine",
  "engine online",
];

export function Preloader() {
  const [count, setCount] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const DURATION = 1700;

    const tick = (now: number) => {
      if (cancelled) return;
      const p = Math.min(1, (now - start) / DURATION);
      setCount(Math.round(p * 100));
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        loadAnime().then(({ animate, eases }) => {
          if (cancelled) return;
          animate(".preloader-inner", {
            opacity: [1, 0],
            duration: 400,
            ease: eases.inOutQuad,
            delay: 150,
          });
          animate(".preloader-curtain", {
            translateY: ["0%", "-100%"],
            duration: 800,
            ease: eases.outExpo,
            delay: 350,
            complete: () => setGone(true),
          });
        });
      }
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, []);

  if (gone) return null;

  const line = BOOT_LINES[Math.min(BOOT_LINES.length - 1, Math.floor((count / 100) * BOOT_LINES.length))];

  return (
    <div className="preloader-curtain fixed inset-0 z-[100] flex items-center justify-center bg-bg">
      <div className="preloader-inner w-[300px]">
        <div className="mb-5 flex justify-center">
          <Logo imgClassName="h-11" />
        </div>
        <div className="h-px w-full bg-line">
          <div className="h-px bg-steel transition-[width] duration-100" style={{ width: `${count}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-faint">
          <span>{line}</span>
          <span className="tabular-nums text-dim">{String(count).padStart(3, "0")}%</span>
        </div>
      </div>
    </div>
  );
}
