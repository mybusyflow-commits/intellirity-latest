"use client";

import type * as AnimeJS from "animejs";

type AnimeModule = typeof AnimeJS;

let cached: AnimeModule | null = null;

/** Dynamically import anime.js v4 on the client only (SSR-safe). */
export async function loadAnime(): Promise<AnimeModule> {
  if (cached) return cached;
  cached = await import("animejs");
  return cached;
}

export type { AnimeModule };
