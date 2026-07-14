"use client";

import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import type { ViewerMode } from "@/lib/viewPackages";

export const CHROME_COACH_KEY = "geowatch-chrome-coach-v2";

export type ChromeCoachStep = "nav" | "news";

export function readChromeCoachDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CHROME_COACH_KEY) === "1";
  } catch {
    return true;
  }
}

export function markChromeCoachDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHROME_COACH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferChromeCoach(): boolean {
  return !readChromeCoachDone();
}

type ChromeOnboardingCoachProps = {
  step: ChromeCoachStep | null;
  viewerMode: ViewerMode;
  lang?: "ko" | "en";
  onStepChange: (next: ChromeCoachStep | null) => void;
};

const COPY = {
  ko: {
    navTitle: "주요 전장 · 허브 메뉴",
    navConflict:
      "여기 상단의 중국 · 러시아 · 북한 · 이란 드롭다운이 ‘주요 전장’ 데이터 입구입니다. 항목을 직접 누르면 그 허브 지도·네트워크·분쟁 외교사로 넘어갑니다. 로딩만으로 자동 진입하지는 않습니다.",
    navEconomy:
      "검색창을 눌러 에너지·초크포인트·금융 허브를 직접 찾아 보세요. 관심 있는 항목을 고를 때만 지도가 이동합니다.",
    newsTitle: "하단 뉴스 · 속보",
    newsConflict:
      "지구본 아래 뉴스·속보 창입니다. 탭하면 검증 보도·전장 뉴스가 열립니다. 사이트를 둘러본 뒤 궁금할 때 여기로 오면 됩니다.",
    newsEconomy:
      "지구본 아래 시장·경제 뉴스 창입니다. 티커와 함께 주요 보도를 열 수 있습니다.",
    next: "다음",
    done: "알겠습니다",
    skip: "스킵",
  },
  en: {
    navTitle: "Major theaters · hub menu",
    navConflict:
      "The China · Russia · North Korea · Iran dropdowns are the entry to major-theater data. Click a hub to open its map, network, and friction briefs—nothing auto-enters from loading alone.",
    navEconomy:
      "Focus the search bar to browse energy, chokepoints, and finance hubs. The map moves only when you pick something.",
    newsTitle: "Bottom news strip",
    newsConflict:
      "This is the news / breaking strip under the globe. Tap for verified reporting. Explore freely first—come here when curious.",
    newsEconomy:
      "Market and economy news under the globe—open it with the ticker when you need it.",
    next: "Next",
    done: "Got it",
    skip: "Skip",
  },
} as const;

/**
 * 도메인 진입 직후 공통 온보딩: 상단 nav → 하단 뉴스 표지.
 * 허브/전장 자동 fly 없이, 유저가 직접 발견한다는 전제를 설명합니다.
 */
export function ChromeOnboardingCoach({
  step,
  viewerMode,
  lang = "ko",
  onStepChange,
}: ChromeOnboardingCoachProps) {
  if (!step) return null;
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const isEconomy = viewerMode === "economy";

  const skipAll = () => {
    markChromeCoachDone();
    onStepChange(null);
  };

  if (step === "nav") {
    return (
      <UiSpotlightCoachmark
        open
        targetSelector="#app-hover-nav"
        title={copy.navTitle}
        body={isEconomy ? copy.navEconomy : copy.navConflict}
        ctaLabel={copy.next}
        skipLabel={copy.skip}
        placement="below"
        accent={isEconomy ? "emerald" : "sky"}
        onDismiss={() => onStepChange("news")}
        onSkip={skipAll}
      />
    );
  }

  return (
    <UiSpotlightCoachmark
      open
      targetSelector="#bottom-intel-compact"
      title={copy.newsTitle}
      body={isEconomy ? copy.newsEconomy : copy.newsConflict}
      ctaLabel={copy.done}
      skipLabel={copy.skip}
      placement="above"
      accent={isEconomy ? "emerald" : "amber"}
      onDismiss={() => {
        markChromeCoachDone();
        onStepChange(null);
      }}
      onSkip={skipAll}
    />
  );
}
