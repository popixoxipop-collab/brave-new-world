"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import type { ViewerMode } from "@/lib/viewPackages";

type FeatureGuidePanelProps = {
  open: boolean;
  viewerMode?: ViewerMode;
  onClose: () => void;
};

type GuideSection = {
  title: string;
  steps: string[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "전쟁구역 · 외교적 긴장구역",
    steps: [
      "우상단 ≡ 버튼 → 레이어 패널에서 「전쟁구역」또는 「외교적 긴장구역」을 켭니다.",
      "지도 위 빗금 박스에 마우스를 올리면 이름·등급·요약이 표시됩니다.",
      "박스를 클릭하면 우측에 한국어 개요·관련 당사자·상세 메모가 열립니다.",
      "색상: 빨강(전쟁구역) · 주황(외교적 긴장). 근접 줌에서는 세부 구역이 우선 표시됩니다.",
    ],
  },
  {
    title: "AI 전쟁지역 (데모)",
    steps: [
      "레이어 패널에서 「AI 전쟁지역 (데모)」을 켜면 분쟁 구역·GDELT 전투 뉴스 밀도로 탐지된 지역에 붉은 링이 표시됩니다.",
      "외부 AI API 없이 로컬 휴리스틱으로 동작하는 데모입니다. 중동 진입 시에는 자동으로 켜지지 않습니다.",
      "마우스를 올리면 지역명·긴장도·AI 신뢰도를 볼 수 있습니다.",
      "클릭하면 해당 지역으로 이동하며 우측 상세 패널이 열립니다.",
    ],
  },
  {
    title: "축 관계망 · 반서방국 충돌사",
    steps: [
      "레이어 「축 관계망」을 켜면 이란·중국·러시아·북한 허브와 스포크가 호로 표시됩니다.",
      "상단 허브 메뉴 → 「반서방국 충돌사」: 11대 현장 상황 설명(전바오·랑선·갈완·츠힌발리 등). 카드 클릭 시 soft fly + 양피지.",
      "우측 위 「주요전장」드롭다운으로 대만·한반도·우크라이나·중동 충돌지로 바로 이동합니다.",
      "호 색: 후원·군수·에너지·하이브리드·외교.",
    ],
  },
  {
    title: "GDELT 뉴스 알림 · 위치 태그",
    steps: [
      "분쟁 · 영토 카테고리에서 「뉴스 · 전투·충돌」「뉴스 · 외교 긴장」「뉴스 · 시위」 칩을 눌러 켭니다.",
      "지도에는 빨간·주황·회색 위치 핀과 하단 「뉴스」 뱃지가 함께 표시됩니다. 레이어 패널에서 원하는 뉴스 칩을 켜세요.",
      "마우스를 올리면 「뉴스 알림」 칩과 함께 분류·제목을 볼 수 있습니다.",
      "동맹·시위 핀에도 동일한 뉴스 뱃지가 붙습니다. 하단 범례에서 색상 의미를 확인하세요.",
    ],
  },
  {
    title: "지역 탐색 · 뉴스",
    steps: [
      "상단 「충돌지역」「대륙간 갈등」 메뉴에서 대만·한반도·중동 등으로 이동합니다.",
      "지역을 선택하면 카메라가 이동하며 Intel 뉴스 시트가 해당 전장으로 필터링되어 열립니다.",
      "「주요전선」 탭으로 빠르게 주요 분쟁 지역으로 이동할 수 있습니다.",
    ],
  },
  {
    title: "지도 조작",
    steps: [
      "드래그: 회전 · 스크롤: 줌 · 빈 바다를 더블클릭: 해당 지점으로 확대",
      "GDELT 뉴스 핀·분쟁 구역 클릭: 해당 지역으로 줌 + Intel 시트(전장 필터)",
      "속보 히어로 바 또는 📰 아이콘: Intel 뉴스 전체 화면 · 중클릭도 동일",
      "기사·속보 카드의 🎯 지도: 시트 닫고 해당 전장으로 fly-to",
      "✕ 지도로 / 하단 닫기: 전체 화면 닫고 지구본 복귀",
      "우상단 ≡ : 레이어 패널 · 자료출처(NASA FIRMS · ADS-B · MarineTraffic) · 도움말 · 주요전선 탭",
    ],
  },
];

const ECONOMY_GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "제재 · 에너지 · 물류 레이어",
    steps: [
      "≡ 버튼 → 「인프라 · 시장」에서 제재·파이프라인·LNG·해운·초크포인트를 켭니다.",
      "물류 리스크 핀에 마우스를 올리면 Brent·VIX 등 관련 시장 라벨이 표시됩니다.",
      "경제 모드에서는 GDELT·Telegram fetch가 없습니다 — 경제 RSS와 티커를 사용하세요.",
    ],
  },
  {
    title: "하단 티커 · 경제 Intel",
    steps: [
      "하단 compact 패널에 주요 증시·VIX·유가 티커가 표시됩니다.",
      "📈 버튼으로 경제 RSS·증시 embed Intel 시트를 엽니다.",
      "뉴스 티어: 공식·와이어 / 시장 매체 / 미확인 속보",
    ],
  },
  {
    title: "Geo Markets Nav",
    steps: [
      "상단 검색·메뉴에서 호르무즈·수에즈·금융 허브·TSMC 등으로 이동합니다.",
      "항목 클릭 시 우측 EconomyRegionPanel에서 관련 RSS·티커를 봅니다.",
      "「주요 허브」 탭으로 빠르게 초크포인트·금융 도시로 이동할 수 있습니다.",
    ],
  },
  {
    title: "지도 조작",
    steps: [
      "드래그: 회전 · 스크롤: 줌 · 더블클릭: 해당 지점 확대",
      "상단 「지정학 | 경제·시장」 스위치로 보기 모드를 전환합니다.",
      "모드 전환 시 레이어·nav·하단 Intel이 함께 바뀝니다.",
    ],
  },
];

export function FeatureGuidePanel({ open, viewerMode = "conflict", onClose }: FeatureGuidePanelProps) {
  if (!open) return null;
  const sections = viewerMode === "economy" ? ECONOMY_GUIDE_SECTIONS : GUIDE_SECTIONS;

  return (
    <>
      <button
        type="button"
        aria-label="사용 안내 닫기"
        className="absolute inset-0 z-[58] bg-[#0a1528]/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="intel-panel absolute right-3 top-14 z-[62] flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),360px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-label="기능 사용 안내"
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky-300/15 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/70">Guide</p>
            <h2 className="mt-1 text-lg font-semibold text-sky-50">기능 사용 안내</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/80 transition hover:border-sky-200/30 hover:text-sky-50"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-sky-300/12 bg-black/20 p-3">
              <h3 className="text-sm font-medium text-sky-50/95">{section.title}</h3>
              <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-[12px] leading-5 text-sky-100/75">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}

export function FeatureGuideButton({
  onClick,
  viewerMode = "conflict",
}: {
  onClick: () => void;
  viewerMode?: ViewerMode;
}) {
  const isEconomy = viewerMode === "economy";
  const { t } = useLocale();
  return (
    <HoverHint
      placement="bottom"
      title={t("hoverHelp")}
      detail={isEconomy ? t("hoverHelpHintEconomy") : t("hoverHelpHintConflict")}
    >
      <button
        type="button"
        aria-label={t("hoverHelpOpenAria")}
        onClick={onClick}
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-[11px] font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        {t("hoverHelp")}
      </button>
    </HoverHint>
  );
}
