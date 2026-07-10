import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  getTelegramAlertStore,
  hydrateTelegramAlerts,
  replaceTelegramAlerts,
} from "@/lib/telegramAlertStore";
import type { TelegramAlertsPayload } from "@/lib/telegramAlerts";
import { translateTelegramAlerts } from "@/lib/telegramTranslate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "telegram-alerts.json");
const SEED_FILE = path.join(process.cwd(), "public", "data", "telegram-alerts-seed.json");

function telegramOsintEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TELEGRAM_OSINT_ENABLED === "true";
}

function seedAllowed(): boolean {
  return process.env.TELEGRAM_USE_SEED === "true";
}

function readLivePayload(): TelegramAlertsPayload | null {
  if (!fs.existsSync(LIVE_FILE)) return null;
  try {
    const raw = fs.readFileSync(LIVE_FILE, "utf8");
    const payload = JSON.parse(raw) as TelegramAlertsPayload;
    if (!Array.isArray(payload.alerts) || payload.alerts.length === 0) return null;
    return {
      fetchedAt: payload.fetchedAt || new Date().toISOString(),
      live: true,
      alerts: payload.alerts,
    };
  } catch {
    return null;
  }
}

function readSeedPayload(): TelegramAlertsPayload {
  if (!fs.existsSync(SEED_FILE)) {
    return { fetchedAt: new Date().toISOString(), live: false, alerts: [], stub: true };
  }
  const raw = fs.readFileSync(SEED_FILE, "utf8");
  return JSON.parse(raw) as TelegramAlertsPayload;
}

export async function GET() {
  const livePayload = readLivePayload();
  if (livePayload) {
    replaceTelegramAlerts(livePayload.alerts, livePayload.fetchedAt);
  } else {
    const { alerts } = getTelegramAlertStore();
    if (alerts.length === 0) {
      hydrateTelegramAlerts(readLivePayload()?.alerts ?? []);
    }
  }

  const store = getTelegramAlertStore();
  if (store.alerts.length > 0) {
    const alerts = await translateTelegramAlerts(store.alerts);
    return NextResponse.json({
      fetchedAt: store.lastIngestAt ?? new Date().toISOString(),
      live: true,
      alerts,
    } satisfies TelegramAlertsPayload);
  }

  if (telegramOsintEnabled() && !seedAllowed()) {
    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      live: false,
      alerts: [],
      waiting: true,
    } satisfies TelegramAlertsPayload & { waiting?: boolean });
  }

  const seedPayload = readSeedPayload();
  const alerts = await translateTelegramAlerts(seedPayload.alerts);
  return NextResponse.json({ ...seedPayload, alerts });
}
