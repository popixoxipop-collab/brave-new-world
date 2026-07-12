"use client";

import type { UkraineControlData } from "@/data/geoTypes";

let cache: UkraineControlData | null = null;
let inflight: Promise<UkraineControlData | null> | null = null;

export function readUkraineControlCache(): UkraineControlData | null {
  return cache;
}

export function prefetchUkraineControl(): Promise<UkraineControlData | null> {
  if (cache?.features?.length) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch("/api/render/ukraine-control", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const payload = (await res.json()) as UkraineControlData;
      if (payload?.features?.length) {
        cache = payload;
        return payload;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function storeUkraineControlCache(payload: UkraineControlData) {
  if (payload?.features?.length) {
    cache = payload;
  }
}
