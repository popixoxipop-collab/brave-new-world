import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { geocodeOrefRegion } from "@/lib/israelAlertZones";
import { fetchOrefAlerts } from "@/lib/tzevaAdomFetch";
import { getTzevaAdomStore, replaceTzevaAdomData } from "@/lib/tzevaAdomStore";
import type { TzevaAdomAlert, TzevaAdomPayload } from "@/lib/tzevaAdom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "tzeva-adom.json");
const SEED_FILE = path.join(process.cwd(), "public", "data", "tzeva-adom-seed.json");

let cacheAt = 0;
let cachePayload: TzevaAdomPayload | null = null;
const CACHE_MS = 2500;

function tzevaAdomEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TZEVA_ADOM_ENABLED === "true";
}

function readLivePayload(): TzevaAdomPayload | null {
  if (!fs.existsSync(LIVE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(LIVE_FILE, "utf8")) as TzevaAdomPayload;
  } catch {
    return null;
  }
}

function readSeedPayload(): TzevaAdomPayload {
  if (!fs.existsSync(SEED_FILE)) {
    return {
      fetchedAt: new Date().toISOString(),
      live: false,
      active: [],
      history: [],
      stub: true,
    };
  }
  return JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as TzevaAdomPayload;
}

function enrichAlert(alert: TzevaAdomAlert): TzevaAdomAlert {
  if (Number.isFinite(alert.lat) && Number.isFinite(alert.lng)) return alert;
  const coords = geocodeOrefRegion(alert.region);
  return { ...alert, lat: coords.lat, lng: coords.lng };
}

function enrichPayload(payload: TzevaAdomPayload): TzevaAdomPayload {
  return {
    ...payload,
    active: (payload.active ?? []).map(enrichAlert),
    history: (payload.history ?? []).map(enrichAlert),
  };
}

export async function GET() {
  if (!tzevaAdomEnabled()) {
    const seed = readSeedPayload();
    return NextResponse.json({ ...seed, live: false, stub: true });
  }

  const livePayload = readLivePayload();
  if (livePayload) {
    const enriched = enrichPayload(livePayload);
    replaceTzevaAdomData(enriched.active ?? [], enriched.history ?? [], enriched.fetchedAt);
    return NextResponse.json(enriched);
  }

  if (isApiStubMode()) {
    return NextResponse.json(readSeedPayload());
  }

  const now = Date.now();
  if (cachePayload && now - cacheAt < CACHE_MS) {
    return NextResponse.json(cachePayload);
  }

  const result = await fetchOrefAlerts({
    historyUrl: process.env.OREF_HISTORY_URL,
    activeUrl: process.env.OREF_ACTIVE_URL,
  });

  const store = getTzevaAdomStore();
  const payload: TzevaAdomPayload = {
    fetchedAt: new Date().toISOString(),
    live: result.active.length > 0 || result.history.length > 0,
    active: result.active.length > 0 ? result.active : store.active,
    history: result.history.length > 0 ? result.history : store.history,
    geoRestricted: result.geoRestricted,
    error: result.error,
  };

  if (result.history.length > 0 || result.active.length > 0) {
    replaceTzevaAdomData(payload.active, payload.history, payload.fetchedAt);
  }

  cachePayload = enrichPayload(payload);
  cacheAt = now;
  return NextResponse.json(cachePayload);
}
