import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  NEPTUN_API_BASE,
  type NeptunAlerts,
  type NeptunPayload,
  type NeptunThreatsResponse,
} from "@/lib/neptun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const CACHE_MS = 5000;

let cacheAt = 0;
let cachePayload: NeptunPayload | null = null;

function neptunEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NEPTUN_ENABLED === "true";
}

function readSeedPayload(): NeptunPayload {
  const profile = process.env.NEXT_PUBLIC_DATA_PROFILE === "full" ? "full" : "lite";
  const candidates = [
    path.join(ROOT, "public", "data", profile, "neptun-seed.json"),
    path.join(ROOT, "public", "data", "neptun-seed.json"),
  ];

  for (const seedFile of candidates) {
    if (!fs.existsSync(seedFile)) continue;
    try {
      return JSON.parse(fs.readFileSync(seedFile, "utf8")) as NeptunPayload;
    } catch {
      // try next candidate
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    live: false,
    stub: true,
    threats: [],
    alerts: { raions: [], oblasts: [] },
  };
}

async function fetchNeptunLive(): Promise<NeptunPayload> {
  const headers = {
    Accept: "application/json",
    "User-Agent": "GeoWatch/1.0 (+https://neptun.in.ua/)",
  };

  const [threatsRes, alertsRes] = await Promise.all([
    fetch(`${NEPTUN_API_BASE}/api/v1/threats`, {
      headers,
      next: { revalidate: 0 },
    }),
    fetch(`${NEPTUN_API_BASE}/api/v1/alerts`, {
      headers,
      next: { revalidate: 0 },
    }),
  ]);

  if (!threatsRes.ok) {
    throw new Error(`NEPTUN threats HTTP ${threatsRes.status}`);
  }

  const threatsData = (await threatsRes.json()) as NeptunThreatsResponse;
  let alerts: NeptunAlerts = { raions: [], oblasts: [] };

  if (alertsRes.ok) {
    alerts = (await alertsRes.json()) as NeptunAlerts;
  }

  return {
    fetchedAt: new Date().toISOString(),
    serverTime: threatsData.serverTime,
    live: true,
    threats: Array.isArray(threatsData.threats) ? threatsData.threats : [],
    alerts,
  };
}

export async function GET() {
  if (!neptunEnabled()) {
    const seed = readSeedPayload();
    return NextResponse.json({ ...seed, live: false, stub: true });
  }

  if (isApiStubMode()) {
    const seed = readSeedPayload();
    return NextResponse.json({ ...seed, live: false, stub: true });
  }

  const now = Date.now();
  if (cachePayload && now - cacheAt < CACHE_MS) {
    return NextResponse.json(cachePayload, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=5" },
    });
  }

  try {
    const payload = await fetchNeptunLive();
    cachePayload = payload;
    cacheAt = now;
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=5" },
    });
  } catch (err) {
    console.error("NEPTUN fetch error:", err);
    const fallback = readSeedPayload();
    return NextResponse.json(
      {
        ...fallback,
        live: false,
        error: err instanceof Error ? err.message : "fetch failed",
      },
      { status: 200 },
    );
  }
}
