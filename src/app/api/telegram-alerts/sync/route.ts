import { NextResponse } from "next/server";
import { replaceTelegramAlerts } from "@/lib/telegramAlertStore";
import { TELEGRAM_CHANNEL_COUNT, TELEGRAM_CATALOG_NOTE } from "@/lib/telegramAlerts";
import { isTelegramEmbedEnabled, syncTelegramEmbedAlerts } from "@/lib/telegramEmbedScrape";
import { translateTelegramAlerts } from "@/lib/telegramTranslate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isTelegramEmbedEnabled()) {
    return NextResponse.json({ error: "TELEGRAM_USE_EMBED is disabled" }, { status: 400 });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const theaterParam = url.searchParams.get("theater");
  const channelLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const theaters = theaterParam
    ? (theaterParam.split(",").filter(Boolean) as Array<"middle-east" | "ukraine">)
    : undefined;

  try {
    const { alerts, channelCount } = await syncTelegramEmbedAlerts({
      channelLimit: Number.isFinite(channelLimit) ? channelLimit : undefined,
      theaters,
    });
    const translated = await translateTelegramAlerts(alerts);
    replaceTelegramAlerts(translated);

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      channelCount,
      alertCount: translated.length,
      catalogNote: TELEGRAM_CATALOG_NOTE,
      totalChannels: TELEGRAM_CHANNEL_COUNT,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sync failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
