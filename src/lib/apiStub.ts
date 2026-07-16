import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SUBMARINE_TUNNEL_SEED } from "@/data/submarineTunnels";
import { isApiStubMode } from "@/lib/apiStubMode";
import { getServerDataProfile } from "@/lib/serverEnv";

const STUB_AT = () => new Date().toISOString();

export type ApiStubRoute =
  | "ais"
  | "adsb-mil"
  | "adsb-traffic"
  | "submarine-tunnels"
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
  | "sanctions-entities"
  | "briefing-stats";

function stubBody(route: ApiStubRoute, request?: Request): Record<string, unknown> {
  const at = STUB_AT();

  switch (route) {
    case "briefing-stats":
      return { fetchedAt: at, source: "stub", stats: null };
    case "ais": {
      const classFilter = request
        ? new URL(request.url).searchParams.get("class") || "all"
        : "all";
      const demo: Array<Record<string, unknown>> = [
        {
          id: "367000001",
          mmsi: "367000001",
          shipName: "USS Abraham Lincoln",
          lat: 17.25,
          lng: 63.85,
          speedOverGround: 12,
          courseOverGround: 90,
          trueHeading: 90,
          timestamp: at,
          shipType: 35,
          shipTypeLabel: "Military",
          category: "military",
        },
        {
          id: "367000011",
          mmsi: "367000011",
          shipName: "USS DEMO DESTROYER",
          lat: 25.1,
          lng: 55.2,
          speedOverGround: 18,
          courseOverGround: 45,
          trueHeading: 45,
          timestamp: at,
          shipType: 35,
          shipTypeLabel: "Military",
          category: "military",
        },
        {
          id: "477000002",
          mmsi: "477000002",
          shipName: "EVER DEMO",
          lat: 1.25,
          lng: 103.8,
          speedOverGround: 14,
          courseOverGround: 180,
          trueHeading: 180,
          timestamp: at,
          shipType: 70,
          shipTypeLabel: "Cargo",
          category: "commercial",
        },
        {
          id: "636000003",
          mmsi: "636000003",
          shipName: "CRUDE DEMO",
          lat: 26.5,
          lng: 56.5,
          speedOverGround: 11,
          courseOverGround: 270,
          trueHeading: 270,
          timestamp: at,
          shipType: 80,
          shipTypeLabel: "Tanker",
          category: "commercial",
        },
      ];
      const vessels =
        classFilter === "military"
          ? demo.filter((v) => v.category === "military")
          : classFilter === "commercial"
            ? demo.filter((v) => v.category === "commercial")
            : demo;
      return { receivedAt: at, vessels, stub: true, classFilter, provider: "stub" };
    }
    case "adsb-mil":
      return { receivedAt: at, count: 0, aircraft: [], stub: true };
    case "adsb-traffic":
      return { receivedAt: at, count: 0, aircraft: [], stub: true, mode: "civilian" };
    case "submarine-tunnels":
      return {
        receivedAt: at,
        count: SUBMARINE_TUNNEL_SEED.length,
        tunnels: SUBMARINE_TUNNEL_SEED,
        stub: true,
        source: "stub-seed",
      };
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
        const profile = getServerDataProfile();
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
