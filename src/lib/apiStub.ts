import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isApiStubMode } from "@/lib/apiStubMode";
import { getDataProfile } from "@/lib/dataProfile";

const STUB_AT = () => new Date().toISOString();

export type ApiStubRoute =
  | "ais"
  | "adsb-mil"
  | "gdelt"
  | "data-sync-get"
  | "data-sync-post"
  | "gee-labels"
  | "intel-hotspots"
  | "space-launches"
  | "ai-data-centers"
  | "economic-centers"
  | "conflict-zones"
  | "arms-embargo-zones"
  | "sanctions-entities";

function stubBody(route: ApiStubRoute, request?: Request): Record<string, unknown> {
  const at = STUB_AT();

  switch (route) {
    case "ais":
      return { receivedAt: at, vessels: [], stub: true };
    case "adsb-mil":
      return { receivedAt: at, count: 0, aircraft: [], stub: true };
    case "gdelt": {
      const theme = request ? new URL(request.url).searchParams.get("theme") : null;
      if (theme) {
        return {
          theme,
          cached: true,
          fetchedAt: at,
          events: [],
          stub: true,
          attribution: "stub",
        };
      }
      try {
        const profile = getDataProfile();
        const filePath = path.join(
          process.cwd(),
          "public",
          "data",
          profile,
          "gdelt-events.json",
        );
        const raw = fs.readFileSync(filePath, "utf8");
        const payload = JSON.parse(raw) as { events?: unknown[]; fetchedAt?: string };
        return {
          cached: true,
          fetchedAt: payload.fetchedAt || at,
          events: payload.events || [],
          stub: true,
          attribution: "GDELT Project",
        };
      } catch {
        return {
          cached: true,
          fetchedAt: at,
          events: [],
          stub: true,
          attribution: "stub",
        };
      }
    }
    case "data-sync-get":
      return {
        ok: true,
        stale: false,
        running: false,
        stub: true,
        status: { lastSuccessAt: at, running: false },
        fetchedAt: at,
      };
    case "data-sync-post":
      return {
        ok: true,
        stub: true,
        message: "stub mode — sync skipped",
        fetchedAt: at,
      };
    case "gee-labels":
      return { labels: [], stub: true };
    case "intel-hotspots":
      return { enabled: false, points: [], stub: true, message: "stub mode" };
    case "space-launches":
      return { receivedAt: at, cached: true, count: 0, points: [], stub: true };
    case "ai-data-centers":
    case "economic-centers":
      return { receivedAt: at, cached: true, count: 0, points: [], stub: true };
    case "sanctions-entities":
      return {
        receivedAt: at,
        cached: true,
        count: 0,
        points: [],
        lists: [],
        stub: true,
      };
    case "conflict-zones":
    case "arms-embargo-zones":
      return { receivedAt: at, cached: true, count: 0, zones: [], stub: true };
    default:
      return { stub: true, fetchedAt: at };
  }
}

/** stub 모드면 즉시 응답, 아니면 null */
export function apiStubResponse(route: ApiStubRoute, request?: Request): NextResponse | null {
  if (!isApiStubMode()) return null;
  return NextResponse.json(stubBody(route, request));
}
