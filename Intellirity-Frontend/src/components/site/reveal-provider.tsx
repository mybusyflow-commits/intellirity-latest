"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadAnime } from "@/lib/use-anime";

/* Reveals .reveal elements as they enter the viewport.
   Mounted in the root layout so every page has it, re-scans on navigation,
   and observes the DOM for content added after hydration (the pricing
   catalogue is fetched).

   The animation only moves the content. It never sets opacity to 0, so a
   throttled background tab, a missed observer callback, or a failed
   animation library can never leave a section unreadable. */
export function RevealProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    let cancelled = false;
    let scheduled = false;

    const io = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const entering = entries.filter((e) => e.isIntersecting);
        if (!entering.length) return;

        loadAnime()
          .then(({ animate, stagger, eases }) => {
            if (cancelled) return;
            entering.forEach((e) => {
              (e.target as HTMLElement).dataset.revealed = "1";
              io.unobserve(e.target);
            });

            const byParent = new Map<Element, Element[]>();
            for (const entry of entering) {
              const parent = entry.target.parentElement ?? entry.target;
              const list = byParent.get(parent) ?? [];
              list.push(entry.target);
              byParent.set(parent, list);
            }

            byParent.forEach((targets) => {
              animate(targets, {
                translateY: [22, 0],
                duration: 950,
                ease: eases.outExpo,
                delay: targets.length > 1 ? stagger(80, { start: 40 }) : 0,
                complete: () => {
                  targets.forEach((t) => {
                    (t as HTMLElement).style.willChange = "auto";
                  });
                },
              });
            });
          })
          .catch(() => {
            /* Animation is cosmetic; the content is already visible. */
          });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll(".reveal:not([data-revealed])").forEach((el) => io.observe(el));
    };

    // One pass per frame at most: the console updates its DOM frequently.
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (!cancelled) observeAll();
      });
    };

    observeAll();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
