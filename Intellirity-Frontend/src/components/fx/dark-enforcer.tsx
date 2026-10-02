"use client";

import { useEffect } from "react";

/* Dark-only site: scrub any previously stored light theme so
   returning visitors can never be stuck in a removed mode. */
export function DarkEnforcer() {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.removeAttribute("data-theme");
    try {
      window.localStorage.removeItem("intellirity-theme");
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }, []);
  return null;
}
