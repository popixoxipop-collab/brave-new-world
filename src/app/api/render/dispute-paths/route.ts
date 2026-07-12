import { NextResponse } from "next/server";
import {
  precomputeDisputeHatchPaths,
  type DisputeHatchLod,
} from "@/lib/disputeHatchPrecompute";
import {
  loadDisputeHatchCache,
  saveDisputeHatchCache,
} from "@/lib/disputeHatchServerData";
import { loadServerDisputes } from "@/lib/serverDisputes";
import { filterHatchPathsByView } from "@/lib/ukraineHatchPrecompute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseLod(raw: string | null): DisputeHatchLod {
  return raw === "overview" ? "overview" : "detail";
}

function ensurePayload(lod: DisputeHatchLod) {
  const cached = loadDisputeHatchCache(lod);
  if (cached?.paths?.length) return { payload: cached, source: "file" as const };

  const disputes = loadServerDisputes();
  if (!disputes.length) return null;

  const payload = precomputeDisputeHatchPaths(disputes, lod);
  saveDisputeHatchCache(payload);
  return { payload, source: "precompute" as const };
}

/**
 * 분쟁 구역 테두리·빗금 사전계산.
 * 클라이언트는 geometry hatch 대신 이 path만 뷰포트 필터한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.min(40, Math.max(2, Number(searchParams.get("radius") || 12)));
  const max = Math.min(6000, Math.max(100, Number(searchParams.get("max") || 2500)));

  try {
    const ensured = ensurePayload(lod);
    if (!ensured) {
      return NextResponse.json(
        { error: "dispute-hatch-empty", paths: [], pathCount: 0 },
        { status: 404 },
      );
    }

    let paths = ensured.payload.paths;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      paths = filterHatchPathsByView(paths, { lat, lng }, radius, max);
    } else if (paths.length > max) {
      paths = paths.slice(0, max);
    }

    return NextResponse.json(
      {
        generatedAt: ensured.payload.generatedAt,
        lodTier: lod,
        pathCount: paths.length,
        totalPathCount: ensured.payload.pathCount,
        pathDisputeIds: ensured.payload.pathDisputeIds,
        source: ensured.source,
        paths,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=600",
          "X-Hatch-Source": ensured.source,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "dispute-hatch-failed",
        paths: [],
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const disputes = loadServerDisputes();
  if (!disputes.length) {
    return NextResponse.json({ error: "disputes-missing" }, { status: 404 });
  }
  const payload = precomputeDisputeHatchPaths(disputes, lod);
  const filePath = saveDisputeHatchCache(payload);
  return NextResponse.json({
    ok: true,
    lodTier: lod,
    pathCount: payload.pathCount,
    filePath,
  });
}
