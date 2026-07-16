"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";

type PeriodicBriefingParchmentProps = {
  briefing: PeriodicBriefing;
  lang: LabelLanguage;
  onDismiss: () => void;
};

/**
 * 매일 전장 등불 — 첫입장 온보딩과 별개.
 * 확인하면 오늘 분만 닫히고, 로컬 자정·다음날 접속 시 다시 점화된다.
 * 타이핑·전보음·스킵은 ParchmentLetter 재사용.
 */
export function PeriodicBriefingParchment({
  briefing,
  lang,
  onDismiss,
}: PeriodicBriefingParchmentProps) {
  return (
    <ParchmentLetter
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      ctaLabel={lang === "en" ? "Until tomorrow" : "내일 다시"}
      onContinue={onDismiss}
      playBreakingDispatch
      typewriter
      titleId="periodic-briefing-title"
    />
  );
}
