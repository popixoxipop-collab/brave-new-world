"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { GUEST_POLICY_COPY } from "@/lib/auth/guestPolicy";
import { AUTH_SESSION_POLICY_COPY } from "@/lib/auth/sessionPolicy";
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

const ACCOUNT_GUIDE_SECTIONS: GuideSection[] = [
  {
    title: GUEST_POLICY_COPY.ko.title,
    steps: [...GUEST_POLICY_COPY.ko.steps],
  },
  {
    title: AUTH_SESSION_POLICY_COPY.ko.title,
    steps: [...AUTH_SESSION_POLICY_COPY.ko.steps],
  },
];


const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "전쟁구역 · 외교적 긴장구역",
    steps: [
      "화면 오른쪽 위 ≡(메뉴) 버튼을 눌러 레이어 패널을 열고 「전쟁구역」이나 「외교적 긴장구역」을 켭니다. (레이어 = 지도 위에 겹쳐 보여 주는 정보층)",
      "지도 위 빗금 친 상자에 마우스를 올리면 그 지역 이름·위험 등급·한 줄 요약이 뜹니다.",
      "상자를 클릭하면 오른쪽에 한국어 설명, 얽혀 있는 나라·세력, 자세한 메모가 열립니다.",
      "색으로 구분합니다 — 빨강은 실제 전쟁 중, 주황은 외교적으로 팽팽한 긴장 상태. 지도를 가까이 확대하면 더 좁은 세부 지역이 먼저 보입니다.",
    ],
  },
  {
    title: "AI 전쟁지역 (맛보기)",
    steps: [
      "레이어 패널에서 「AI 전쟁지역 (데모)」을 켜면, 분쟁 지역과 뉴스에서 전투 언급이 몰리는 곳에 붉은 원이 그려집니다. (뉴스 분석은 전 세계 기사를 자동 수집·분석하는 공개 데이터 GDELT를 사용)",
      "외부 AI 서비스 없이 앱이 자체 규칙으로 대략 판단하는 맛보기(데모) 기능입니다. 중동에 들어가도 자동으로 켜지지는 않습니다.",
      "원 위에 마우스를 올리면 지역 이름, 긴장 정도, 이 판단을 얼마나 믿을 만한지(신뢰도)를 보여 줍니다.",
      "원을 클릭하면 그 지역으로 화면이 이동하고 오른쪽에 자세한 설명 창이 열립니다.",
    ],
  },
  {
    title: "축 관계망 · 반서방국 충돌사",
    steps: [
      "「축 관계망」을 켜면 이란·중국·러시아·북한 같은 중심 나라(허브)와 그 상대들(스포크)이 곡선으로 이어져 표시됩니다.",
      "위쪽 허브 메뉴 → 「반서방국 충돌사」를 열면 역사 속 11개 충돌 현장(전바오섬·랑선·갈완·츠힌발리 등)을 설명합니다. 카드를 누르면 화면이 부드럽게 그 현장으로 이동하며 옛 문서 느낌의 설명 카드(양피지)가 펼쳐집니다.",
      "오른쪽 위 「주요전장」 목록에서 대만·한반도·우크라이나·중동 같은 충돌지로 한 번에 이동할 수 있습니다.",
      "이어 주는 곡선의 색은 관계의 종류입니다 — 자금 후원 · 무기 지원 · 에너지 · 복합(하이브리드) · 외교.",
    ],
  },
  {
    title: "뉴스 알림 핀 (GDELT)",
    steps: [
      "「뉴스 · 전투·충돌」「뉴스 · 외교 긴장」「뉴스 · 시위」 칩(작은 토글 버튼)을 누르면 관련 뉴스 알림이 켜집니다. (전 세계 기사를 자동 분석하는 공개 데이터 GDELT 기반)",
      "지도에는 빨강·주황·회색 위치 핀이 찍히고, 화면 아래쪽에 「뉴스」 표시가 함께 뜹니다.",
      "핀에 마우스를 올리면 「뉴스 알림」 표시와 함께 뉴스 종류·제목을 볼 수 있습니다.",
      "동맹·시위를 나타내는 핀에도 같은 뉴스 표시가 붙습니다. 색이 무슨 뜻인지는 화면 아래 범례(색상 설명표)에서 확인하세요.",
    ],
  },
  {
    title: "지역 탐색 · 뉴스",
    steps: [
      "화면 위쪽 「충돌지역」「대륙간 갈등」 메뉴에서 대만·한반도·중동 등으로 이동합니다.",
      "지역을 고르면 화면이 그쪽으로 이동하고, 그 지역 뉴스만 모은 정보 요약 창(인텔 시트)이 열립니다.",
      "「주요전선」 탭을 쓰면 대표적인 분쟁 지역으로 빠르게 갈 수 있습니다.",
    ],
  },
  {
    title: "지도 조작법",
    steps: [
      "드래그하면 지구본이 돌고, 스크롤하면 확대·축소되며, 빈 바다를 두 번 클릭하면 그 지점으로 확대됩니다.",
      "뉴스 핀이나 분쟁 상자를 클릭하면 그 지역으로 확대되면서 관련 뉴스 요약 창(인텔 시트)이 열립니다.",
      "위쪽 속보 바 또는 📰 아이콘을 누르면 뉴스가 전체 화면으로 열립니다. (마우스 가운데 버튼 클릭도 같은 동작)",
      "기사·속보 카드의 🎯(지도) 버튼을 누르면 창을 닫고 그 현장으로 화면이 날아갑니다.",
      "「✕ 지도로」 또는 아래쪽 닫기를 누르면 전체 화면을 닫고 지구본으로 돌아옵니다.",
      "오른쪽 위 ≡ 메뉴에는 레이어 패널, 자료 출처(NASA FIRMS=위성 화재·열 감지, ADS-B=항공기가 쏘는 위치 신호, MarineTraffic=선박 위치 추적), 도움말, 주요전선 탭이 들어 있습니다.",
    ],
  },
  ...ACCOUNT_GUIDE_SECTIONS,
];

const ECONOMY_GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "제재 · 에너지 · 물류 레이어",
    steps: [
      "≡(메뉴) 버튼 → 「인프라 · 시장」에서 제재, 송유관(파이프라인), LNG(액화천연가스), 해운 항로, 초크포인트를 켭니다. (초크포인트 = 세계 무역이 반드시 지나가는 좁은 길목, 예: 호르무즈 해협)",
      "물류 위험 핀에 마우스를 올리면 Brent(브렌트유 = 국제 유가 기준)·VIX(공포지수 = 시장이 얼마나 불안한지) 같은 관련 시장 수치가 함께 뜹니다.",
      "경제 모드에서는 실시간 속보·텔레그램 수집이 없습니다. 대신 경제 뉴스(RSS = 여러 매체 기사를 한곳에 모아 받는 방식)와 시세 표시줄(티커)을 사용하세요.",
    ],
  },
  {
    title: "하단 시세줄 · 경제 정보",
    steps: [
      "화면 아래 좁은 패널에 주요 증시·VIX(공포지수)·유가가 흐르는 시세 표시줄(티커)로 나옵니다.",
      "📈 버튼을 누르면 경제 뉴스와 증시 화면을 모은 정보 요약 창(인텔 시트)이 열립니다.",
      "뉴스는 신뢰도 등급으로 나뉩니다 — 공식·통신사 / 시장 전문 매체 / 아직 확인 안 된 속보.",
    ],
  },
  {
    title: "경제 지도 이동 (Geo Markets)",
    steps: [
      "위쪽 검색·메뉴에서 호르무즈 해협·수에즈 운하·금융 중심 도시·TSMC(세계 최대 대만 반도체 기업) 등으로 이동합니다.",
      "항목을 클릭하면 오른쪽 경제 지역 패널에서 관련 뉴스(RSS)와 시세(티커)를 봅니다.",
      "「주요 허브」 탭으로 초크포인트(무역 길목)나 금융 도시로 빠르게 이동할 수 있습니다.",
    ],
  },
  {
    title: "지도 조작법",
    steps: [
      "드래그하면 회전, 스크롤하면 확대·축소, 두 번 클릭하면 그 지점으로 확대됩니다.",
      "위쪽 「지정학 | 경제·시장」 스위치로 보기 모드를 바꿉니다.",
      "모드를 바꾸면 레이어, 위쪽 메뉴, 아래쪽 정보 창이 함께 바뀝니다.",
    ],
  },
  ...ACCOUNT_GUIDE_SECTIONS,
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
