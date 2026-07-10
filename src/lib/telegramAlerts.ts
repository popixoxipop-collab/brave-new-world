import {
  channelByUsername,
  TELEGRAM_CATALOG_NOTE,
  TELEGRAM_CHANNEL_COUNT,
  TELEGRAM_PUBLIC_CHANNELS,
  type TelegramTheater,
} from "@/data/telegramChannels";

export type TelegramAlertRegion = "ukraine" | "middle-east" | "global";

export type TelegramAlert = {
  id: string;
  channelUsername: string;
  channelTitle: string;
  region: TelegramAlertRegion;
  text: string;
  receivedAt: string;
  messageUrl?: string | null;
};

export type TelegramAlertsPayload = {
  fetchedAt: string;
  live: boolean;
  alerts: TelegramAlert[];
  stub?: boolean;
  waiting?: boolean;
  source?: "embed" | "telethon";
};

export {
  TELEGRAM_PUBLIC_CHANNELS,
  TELEGRAM_CHANNEL_COUNT,
  TELEGRAM_CATALOG_NOTE,
  type TelegramTheater,
};

/** @deprecated use TELEGRAM_PUBLIC_CHANNELS */
export const TELEGRAM_OSINT_CHANNELS = TELEGRAM_PUBLIC_CHANNELS.map((c) => ({
  username: c.username,
  region: c.theater === "ukraine" ? ("ukraine" as const) : ("middle-east" as const),
  label: c.label,
}));

export const TELEGRAM_REGION_LABELS: Record<TelegramAlertRegion, string> = {
  ukraine: "우크라이나 전선",
  "middle-east": "중동 전선",
  global: "글로벌",
};

export function regionForChannel(username: string): TelegramAlertRegion {
  const ch = channelByUsername(username);
  if (!ch) return "global";
  return ch.theater === "ukraine" ? "ukraine" : "middle-east";
}
