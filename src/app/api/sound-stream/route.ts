import { NextRequest, NextResponse } from "next/server";
import { AUDIO_MANIFEST } from "@/data/audioManifest";
import {
  getFreesoundApiKey,
  isAudioEventId,
  resolveFreesoundPreview,
  resolvePreviewForEvent,
} from "@/lib/freesound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sound-stream?eventId=neptun-impact
 * GET /api/sound-stream?query=distant+explosion+muffled
 *
 * Freesound HQ mp3 프리뷰를 서버에서 검색·프록시 스트리밍.
 * API 키는 서버에만 존재 — 클라이언트에는 노출하지 않음.
 */
export async function GET(req: NextRequest) {
  try {
    if (!getFreesoundApiKey()) {
      return NextResponse.json(
        { error: "FREESOUND_API_KEY is not configured" },
        { status: 503 },
      );
    }

    const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || "";
    const queryParam = req.nextUrl.searchParams.get("query")?.trim() || "";

    let previewUrl: string;
    let volume = 0.5;
    let loop = false;
    let attributionName = "";
    let attributionUser = "";
    let soundId = 0;
    let resolvedQuery = queryParam;

    if (eventId) {
      if (!isAudioEventId(eventId)) {
        return NextResponse.json({ error: `Unknown eventId: ${eventId}` }, { status: 400 });
      }
      const { def, preview } = await resolvePreviewForEvent(eventId);
      previewUrl = preview.previewUrl;
      volume = def.volume;
      loop = Boolean(def.loop);
      attributionName = preview.name;
      attributionUser = preview.username;
      soundId = preview.soundId;
      resolvedQuery = def.freesoundQuery;
    } else if (queryParam) {
      const preview = await resolveFreesoundPreview(queryParam);
      previewUrl = preview.previewUrl;
      attributionName = preview.name;
      attributionUser = preview.username;
      soundId = preview.soundId;
    } else {
      return NextResponse.json(
        { error: "Provide eventId or query", events: Object.keys(AUDIO_MANIFEST) },
        { status: 400 },
      );
    }

    // metadata=1 → JSON만 (디버그/프리페치용)
    if (req.nextUrl.searchParams.get("metadata") === "1") {
      return NextResponse.json({
        eventId: eventId || null,
        query: resolvedQuery,
        soundId,
        name: attributionName,
        username: attributionUser,
        volume,
        loop,
        streamUrl: `/api/sound-stream?${eventId ? `eventId=${encodeURIComponent(eventId)}` : `query=${encodeURIComponent(resolvedQuery)}`}`,
        attribution: `“${attributionName}” by ${attributionUser} on Freesound`,
      });
    }

    const upstream = await fetch(previewUrl, {
      headers: { Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8" },
      // 프리뷰 CDN은 공개 — 토큰 불필요
      cache: "force-cache",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Preview fetch failed: HTTP ${upstream.status}` },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "audio/mpeg");
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    headers.set("X-Freesound-Id", String(soundId));
    headers.set("X-Freesound-Name", encodeURIComponent(attributionName));
    headers.set("X-Freesound-User", encodeURIComponent(attributionUser));
    headers.set("X-Audio-Volume", String(volume));
    headers.set("X-Audio-Loop", loop ? "1" : "0");
    if (eventId) headers.set("X-Audio-Event-Id", eventId);

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sound-stream failed" },
      { status: 502 },
    );
  }
}
