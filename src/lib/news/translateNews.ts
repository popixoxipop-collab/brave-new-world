/**
 * RSS·GDELT 뉴스 번역 (ko: 한국어, en: 원문 유지).
 * Telegram OSINT 텍스트는 이 경로에 절대 넣지 않음 — @see src/lib/licensing/telegramOsintPolicy.ts
 */
import { isKoreanTranslationEnabled, mapPool, translateTextToKorean } from "@/lib/koreanTranslate";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { HeroBreakingItem, NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

async function translateNewsItem(item: NewsStreamItem): Promise<NewsStreamItem> {
  const title = await translateTextToKorean(item.title);
  const summary = item.summary ? await translateTextToKorean(item.summary) : undefined;
  return { ...item, title, summary };
}

async function translateHero(hero: HeroBreakingItem): Promise<HeroBreakingItem> {
  const title = await translateTextToKorean(hero.title);
  return { ...hero, title };
}

export async function translateNewsStreamPayload(
  payload: NewsStreamPayload,
  lang: LabelLanguage = "ko",
): Promise<NewsStreamPayload> {
  if (lang === "en" || !isKoreanTranslationEnabled()) return payload;

  const verified = await mapPool(payload.verified, translateNewsItem, 6);
  const stateMedia = await mapPool(payload.stateMedia, translateNewsItem, 4);
  const hero = payload.hero ? await translateHero(payload.hero) : null;

  return {
    ...payload,
    hero,
    verified,
    stateMedia,
  };
}
