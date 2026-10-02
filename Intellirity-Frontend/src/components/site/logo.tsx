"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* Brand lockup. Serves public/logo.png (the official artwork).
 * If the file is ever missing, a steel monogram renders instead
 * of a broken image. */
export function Logo({
  className,
  imgClassName,
}: {
  className?: string;
  imgClassName?: string;
}) {
  const [missing, setMissing] = useState(false);

  return (
    <span className={cn("inline-flex items-center", className)}>
      {!missing ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="Intellirity: securing AI, empowering innovation"
          className={cn("h-8 w-auto", imgClassName)}
          onError={() => setMissing(true)}
        />
      ) : (
        <span className="inline-flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded bg-ink font-mono text-[13px] font-semibold text-bg">
            I
          </span>
          <span className="text-[15.5px] font-medium tracking-[-0.01em]">Intellirity</span>
        </span>
      )}
    </span>
  );
}
