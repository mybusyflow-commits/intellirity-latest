"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./study-buttons.css";

/* The authored soft extruded service button — button only, exact styling.
   Native artboard is 385×104; the wrapper scales it to fit. */
export function SoftSurfaceButton({
  label = "Explore Services",
  href = "/console",
  scale = 0.82,
}: {
  label?: string;
  href?: string;
  scale?: number;
}) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);

  const activate = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => router.push(href), 220);
  };

  return (
    <span
      className="xbtn block"
      data-theme="dark"
      style={{ width: 385 * scale, height: 104 * scale }}
    >
      <span className="block origin-top-left" style={{ transform: `scale(${scale})`, width: 385, height: 104 }}>
        <button className="soft-service" aria-pressed={pressed} onClick={activate}>
          <span className="label">{label}</span>
          <span className="soft-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </span>
        </button>
      </span>
    </span>
  );
}
