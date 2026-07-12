"use client";

import type { NeptunPayload } from "@/lib/neptun";

let cache: NeptunPayload | null = null;
let inflight: Promise<NeptunPayload | null> | null = null;

export function readNeptunCache(): NeptunPayload | null {
  return cache;
}

export function prefetchNeptun(): Promise<NeptunPayload | null> {
  if (cache?.threats?.length) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch("/api/neptun", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const isStub = res.headers.get("X-Neptun-Stub") === "true";
      const payload = (await res.json()) as NeptunPayload;
      if (!payload?.threats?.length && !payload?.archivedThreats?.length) return null;
      cache = { ...payload, live: isStub ? false : payload.live, stub: isStub || payload.stub };
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
