import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { AUDIO_MANIFEST, type AudioEventDef } from "@/data/audioManifest";
import {
  getFreesoundApiKey,
  isAudioEventId,
  resolveFreesoundPreview,
  resolvePreviewForEvent,
} from "@/lib/freesound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 브라우저에 캐시된 오매칭(개 짖는 소리 등) 무효화용 */
const STREAM_CACHE_BUST = "v9-curated-ids";

function contentTypeForExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  return "application/octet-stream";
}

function resolveLocalAudioPath(localSrc: string): string | null {
  if (!localSrc.startsWith("/")) return null;
  const rel = localSrc.replace(/^\/+/, "").replace(/\.\./g, "");
  const abs = path.join(process.cwd(), "public", rel);
  if (!abs.startsWith(path.join(process.cwd(), "public"))) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

/**
 * GET /api/sound-stream?eventId=neptun-impact
 * GET /api/sound-stream?query=distant+explosion+muffled
 *
 * localSrc가 있으면 로컬 파일 우선. 없으면 Freesound HQ mp3 프록시.
 */
export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || "";
    const queryParam = req.nextUrl.searchParams.get("query")?.trim() || "";

    // ── 로컬 공습사이렌 등: Freesound 완전 우회 ─────────────────────
    if (eventId && isAudioEventId(eventId)) {
      const def = AUDIO_MANIFEST[eventId] as AudioEventDef;
      if (def.localSrc) {
        const abs = resolveLocalAudioPath(def.localSrc);
        if (!abs) {
          return NextResponse.json(
            { error: `Local audio missing: ${def.localSrc}` },
            { status: 404 },
          );
        }
        if (req.nextUrl.searchParams.get("metadata") === "1") {
          return NextResponse.json({
            eventId,
            query: def.freesoundQuery,
            soundId: 0,
            name: path.basename(abs),
            username: "local",
            volume: def.volume,
            loop: Boolean(def.loop),
            localSrc: def.localSrc,
            streamUrl: `/api/sound-stream?eventId=${encodeURIComponent(eventId)}&v=${STREAM_CACHE_BUST}`,
            attribution: `local ${def.localSrc}`,
          });
        }
        const body = fs.readFileSync(abs);
        const headers = new Headers();
        headers.set("Content-Type", contentTypeForExt(abs));
        headers.set("Content-Length", String(body.byteLength));
        headers.set("Cache-Control", "no-store, max-age=0");
        headers.set("X-Audio-Source", "local");
        headers.set("X-Audio-Volume", String(def.volume));
        headers.set("X-Audio-Loop", def.loop ? "1" : "0");
        headers.set("X-Audio-Event-Id", eventId);
        headers.set("X-Audio-Cache-Bust", STREAM_CACHE_BUST);
        return new NextResponse(body, { status: 200, headers });
      }
    }

    if (!getFreesoundApiKey()) {
      return NextResponse.json(
        { error: "FREESOUND_API_KEY is not configured" },
        { status: 503 },
      );
    }

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

    if (req.nextUrl.searchParams.get("metadata") === "1") {
      return NextResponse.json({
        eventId: eventId || null,
        query: resolvedQuery,
        soundId,
        name: attributionName,
        username: attributionUser,
        volume,
        loop,
        streamUrl: `/api/sound-stream?${eventId ? `eventId=${encodeURIComponent(eventId)}` : `query=${encodeURIComponent(resolvedQuery)}`}&v=${STREAM_CACHE_BUST}`,
        attribution: `“${attributionName}” by ${attributionUser} on Freesound`,
      });
    }

    const upstream = await fetch(previewUrl, {
      headers: { Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8" },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Preview fetch failed: HTTP ${upstream.status}` },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "audio/mpeg");
    // 예전 오매칭 MP3가 브라우저에 하루 캐시되던 문제 방지
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("X-Freesound-Id", String(soundId));
    headers.set("X-Freesound-Name", encodeURIComponent(attributionName));
    headers.set("X-Freesound-User", encodeURIComponent(attributionUser));
    headers.set("X-Audio-Volume", String(volume));
    headers.set("X-Audio-Loop", loop ? "1" : "0");
    headers.set("X-Audio-Cache-Bust", STREAM_CACHE_BUST);
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
