import { NextResponse } from "next/server";
import type { MilitaryAircraft } from "@/data/geoTypes";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADSB_FI_MIL_URL = "https://opendata.adsb.fi/api/v2/mil";

type AdsbAircraft = {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  squawk?: string;
  t?: string;
  type?: string;
  seen?: number;
  seen_pos?: number;
};

function parseAlt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalize(raw: AdsbAircraft): MilitaryAircraft | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lon);
  const hex = (raw.hex || "").toLowerCase();
  if (!hex || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: hex,
    hex,
    callsign: raw.flight?.trim() || null,
    lat,
    lng,
    altitude: parseAlt(raw.alt_baro),
    groundSpeed: Number.isFinite(Number(raw.gs)) ? Number(raw.gs) : null,
    track: Number.isFinite(Number(raw.track)) ? Number(raw.track) : null,
    squawk: raw.squawk || null,
    type: raw.t || raw.type || null,
    timestamp: new Date().toISOString(),
  };
}

function extractAircraftList(payload: { ac?: AdsbAircraft[]; aircraft?: AdsbAircraft[] }) {
  if (Array.isArray(payload.aircraft)) return payload.aircraft;
  if (Array.isArray(payload.ac)) return payload.ac;
  return [];
}

export async function GET(request: Request) {
  const stub = apiStubResponse("adsb-mil", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const max = Math.min(Number(searchParams.get("max") || 400), 1000);

  try {
    const response = await fetch(ADSB_FI_MIL_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "ConflictView/1.0 (https://adsb.fi)",
      },
    });
    if (!response.ok) {
      return NextResponse.json(
        { aircraft: [], error: `adsb.fi HTTP ${response.status}` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      ac?: AdsbAircraft[];
      aircraft?: AdsbAircraft[];
    };
    const aircraft: MilitaryAircraft[] = [];
    for (const raw of extractAircraftList(payload)) {
      const item = normalize(raw);
      if (!item) continue;
      aircraft.push(item);
      if (aircraft.length >= max) break;
    }

    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      count: aircraft.length,
      aircraft,
      attribution: "adsb.fi",
      source: ADSB_FI_MIL_URL,
    });
  } catch (error) {
    return NextResponse.json(
      {
        aircraft: [],
        error: error instanceof Error ? error.message : "ADS-B mil fetch failed",
      },
      { status: 502 },
    );
  }
}
