"use client";

import { useEffect } from "react";
import { loadAnime } from "@/lib/use-anime";

export function RevealProvider() {
  useEffect(() => {
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const entering = entries.filter((e) => e.isIntersecting);
        if (!entering.length) return;

        loadAnime().then(({ animate, stagger, eases }) => {
          if (cancelled) return;
          const byParent = new Map<Element, Element[]>();
          for (const entry of entering) {
            const parent = entry.target.parentElement ?? entry.target;
            const list = byParent.get(parent) ?? [];
            list.push(entry.target);
            byParent.set(parent, list);
          }
          byParent.forEach((targets) => {
            animate(targets, {
              opacity: [0, 1],
              translateY: [22, 0],
              duration: 950,
              ease: eases.outExpo,
              delay: targets.length > 1 ? stagger(80, { start: 40 }) : 0,
            });
          });
          entering.forEach((e) => io.unobserve(e.target));
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  return null;
}
