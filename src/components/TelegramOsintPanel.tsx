"use client";

import { TelegramIntelFeed } from "@/components/TelegramIntelFeed";
import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
} from "@/lib/telegramAlerts";

type TelegramOsintPanelProps = {
  alerts: TelegramAlert[];
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  live: boolean;
  needsAuth?: boolean;
  sessionExists?: boolean;
  embedMode?: boolean;
  channelCount?: number;
};

export function TelegramOsintPanel({
  alerts,
  liveStatus,
  live,
  needsAuth,
  sessionExists,
  embedMode = true,
  channelCount = TELEGRAM_CHANNEL_COUNT,
}: TelegramOsintPanelProps) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-4 z-20 w-[min(88vw,280px)]">
      <TelegramIntelFeed
        alerts={alerts}
        live={live}
        liveStatus={liveStatus}
        needsAuth={needsAuth}
        sessionExists={sessionExists}
        embedMode={embedMode}
        channelCount={channelCount}
      />
    </div>
  );
}
