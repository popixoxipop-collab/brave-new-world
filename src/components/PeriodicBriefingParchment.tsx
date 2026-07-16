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
 * 매일 전장/시장 등불 — 첫입장 온보딩 이후, 지정학·지경학 각각 하루 1회.
 * 확인하면 오늘(해당 모드) 분만 닫히고, 로컬 자정·다음날 또는 다른 모드에서 다시 점화.
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
