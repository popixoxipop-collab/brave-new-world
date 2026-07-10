import type { TelegramAlert } from "@/lib/telegramAlerts";
import { isKoreanTranslationEnabled, mapPool, translateTextToKorean } from "@/lib/koreanTranslate";

export function isTelegramTranslationEnabled(): boolean {
  return isKoreanTranslationEnabled();
}

export { isMostlyKorean } from "@/lib/koreanTranslate";

export async function translateTelegramTextToKorean(text: string): Promise<string> {
  return translateTextToKorean(text);
}

export async function translateTelegramAlerts(alerts: TelegramAlert[]): Promise<TelegramAlert[]> {
  if (!isKoreanTranslationEnabled() || alerts.length === 0) return alerts;

  return mapPool(
    alerts,
    async (alert) => ({
      ...alert,
      text: await translateTextToKorean(alert.text),
    }),
    6,
  );
}
