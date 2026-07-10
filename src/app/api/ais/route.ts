import { NextResponse } from "next/server";
import type { AisVessel } from "@/data/geoTypes";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

type AisRawMessage = {
  MessageType?: string;
  MetaData?: {
    MMSI?: number | string;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: {
      UserID?: number | string;
      Latitude?: number;
      Longitude?: number;
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
    };
  };
};

function parseNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVessel(raw: AisRawMessage): AisVessel | null {
  if (raw.MessageType && raw.MessageType !== "PositionReport") return null;

  const position = raw.Message?.PositionReport;
  const lat = parseNumber(position?.Latitude ?? raw.MetaData?.latitude);
  const lng = parseNumber(position?.Longitude ?? raw.MetaData?.longitude);
  const mmsiSource = raw.MetaData?.MMSI ?? position?.UserID;
  const mmsi = mmsiSource ? String(mmsiSource) : null;

  if (lat === null || lng === null || !mmsi) return null;

  return {
    id: mmsi,
    mmsi,
    shipName: raw.MetaData?.ShipName?.trim() || null,
    lat,
    lng,
    speedOverGround: parseNumber(position?.Sog),
    courseOverGround: parseNumber(position?.Cog),
    trueHeading: parseNumber(position?.TrueHeading),
    timestamp: raw.MetaData?.time_utc || null,
  };
}

function parseBoundingBoxes(searchParams: URLSearchParams) {
  const bbox = searchParams.get("bbox");
  if (!bbox) return [[[-90, -180], [90, 180]]];

  const values = bbox.split(",").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return [[[-90, -180], [90, 180]]];
  }

  const [minLat, minLng, maxLat, maxLng] = values;
  return [[[minLat, minLng], [maxLat, maxLng]]];
}

async function websocketDataToText(data: MessageEvent["data"]) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf-8");
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf-8");
  }
  if (data instanceof Blob) return data.text();
  return String(data);
}

export async function GET(request: Request) {
  const stub = apiStubResponse("ais", request);
  if (stub) return stub;

  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        vessels: [],
        error: "AISSTREAM_API_KEY가 서버 환경변수에 없습니다.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const maxVessels = Math.min(Number(searchParams.get("max") || 250), 1000);
  const durationMs = Math.min(Number(searchParams.get("seconds") || 8) * 1000, 20000);
  const debug = searchParams.get("debug") === "1";
  const vessels = new Map<string, AisVessel>();
  const rawSamples: unknown[] = [];
  const diagnostics = {
    opened: false,
    subscribed: false,
    closeCode: null as number | null,
    closeReason: null as string | null,
  };

  return new Promise<NextResponse>((resolve) => {
    const ws = new WebSocket(AISSTREAM_URL);
    let resolved = false;

    const finish = (status = 200, error?: string) => {
      if (resolved) return;
      resolved = true;

      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // no-op
      }

      resolve(
        NextResponse.json(
          {
            receivedAt: new Date().toISOString(),
            vessels: Array.from(vessels.values()),
            rawSamples: debug ? rawSamples : undefined,
            diagnostics: debug ? diagnostics : undefined,
            error,
          },
          { status },
        ),
      );
    };

    const timer = setTimeout(() => finish(), durationMs);

    ws.addEventListener("open", () => {
      diagnostics.opened = true;
      const subscription = JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: parseBoundingBoxes(searchParams),
        FilterMessageTypes: ["PositionReport"],
      });

      try {
        ws.send(subscription);
        diagnostics.subscribed = true;
      } catch (error) {
        finish(502, error instanceof Error ? error.message : "AIS 구독 메시지 전송 실패");
      }
    });

    ws.addEventListener("message", async (event) => {
      try {
        const parsed = JSON.parse(await websocketDataToText(event.data)) as AisRawMessage;
        if (debug && rawSamples.length < 5) rawSamples.push(parsed);
        const vessel = normalizeVessel(parsed);
        if (!vessel) return;

        vessels.set(vessel.mmsi, vessel);
        if (vessels.size >= maxVessels) {
          clearTimeout(timer);
          finish();
        }
      } catch {
        // AIS stream can include messages we do not currently parse.
      }
    });

    ws.addEventListener("error", (event) => {
      clearTimeout(timer);
      const message =
        "message" in event && typeof event.message === "string"
          ? event.message
          : "AIS WebSocket error";
      finish(502, message);
    });

    ws.addEventListener("close", (event) => {
      diagnostics.closeCode = event.code;
      diagnostics.closeReason = event.reason || null;
      clearTimeout(timer);
      finish();
    });
  });
}
