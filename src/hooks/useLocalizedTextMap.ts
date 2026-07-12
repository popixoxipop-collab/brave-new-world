"use client";

import { useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { translateText } from "@/lib/koreanTranslate";

type TextEntry = { key: string; text: string };

/** 사이드바·패널 표시용 — 제목·본문을 선택 언어로 번역 (캐시·배치) */
export function useLocalizedTextMap(
  entries: TextEntry[],
  lang: LabelLanguage,
): Map<string, string> {
  const signature = useMemo(
    () => `${lang}\n${entries.map((e) => `${e.key}\0${e.text}`).join("\n")}`,
    [entries, lang],
  );
  const [map, setMap] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (entries.length === 0) {
      setMap(new Map());
      return;
    }

    let cancelled = false;

    void (async () => {
      const next = new Map<string, string>();
      const batchSize = 6;
      for (let i = 0; i < entries.length; i += batchSize) {
        const slice = entries.slice(i, i + batchSize);
        await Promise.all(
          slice.map(async ({ key, text }) => {
            next.set(key, await translateText(text, lang));
          }),
        );
      }
      if (!cancelled) setMap(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [signature, entries, lang]);

  return map;
}

export function localizedDisplayText(
  map: Map<string, string>,
  key: string,
  fallback: string,
): string {
  return map.get(key) ?? fallback;
}

/** @deprecated use useLocalizedTextMap */
export function useKoreanTextMap(entries: TextEntry[]): Map<string, string> {
  return useLocalizedTextMap(entries, "ko");
}

/** @deprecated use localizedDisplayText */
export function koreanDisplayText(
  map: Map<string, string>,
  key: string,
  fallback: string,
): string {
  return localizedDisplayText(map, key, fallback);
}
