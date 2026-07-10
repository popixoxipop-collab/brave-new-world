import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getTelegramAlertStore, pushTelegramAlert } from "@/lib/telegramAlertStore";
import { regionForChannel, type TelegramAlert } from "@/lib/telegramAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "telegram-alerts.json");

function persistToFile(alerts: TelegramAlert[]) {
  try {
    fs.mkdirSync(path.dirname(LIVE_FILE), { recursive: true });
    fs.writeFileSync(
      LIVE_FILE,
      JSON.stringify(
        { fetchedAt: new Date().toISOString(), live: true, alerts: alerts.slice(0, 120) },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    // collector가 동시에 같은 파일을 쓸 수 있음 — 메모리 ingest는 성공으로 처리
  }
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_INGEST_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get("secret") === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<TelegramAlert>;
    const username = String(body.channelUsername || "").replace(/^@/, "");
    const text = String(body.text || "").trim();
    if (!username || !text) {
      return NextResponse.json({ error: "channelUsername and text required" }, { status: 400 });
    }

    const alert: TelegramAlert = {
      id: String(body.id || `${username}-${Date.now()}`),
      channelUsername: username,
      channelTitle: String(body.channelTitle || username),
      region: body.region ?? regionForChannel(username),
      text,
      receivedAt: body.receivedAt || new Date().toISOString(),
      messageUrl: body.messageUrl ?? `https://t.me/${username}`,
    };

    pushTelegramAlert(alert);
    persistToFile(getTelegramAlertStore().alerts);
    return NextResponse.json({ ok: true, id: alert.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ingest failed" },
      { status: 500 },
    );
  }
}
