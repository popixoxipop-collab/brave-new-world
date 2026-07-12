"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

const LETTER_KO = {
  title: "환영합니다!",
  paragraphs: [
    "존경하는 탐험가께.",
    "당신은 지금, 지구의 표면을 한눈에 내려다보는 관측대에 들어섰습니다. 이 자리에서는 국경선과 전선, 해로와 파이프라인, 속보와 침묵이 한 화면 위에서 서로 겹쳐집니다. Conflict View는 단정한 결론을 강요하지 않습니다. 다만 보이는 것을 더 선명하게, 흩어진 것을 한곳에 모아, 당신이 스스로 판단할 수 있도록 돕습니다.",
    "세상은 종종 하나의 이야기로 정리되기를 원합니다. 그러나 지정학은 여러 줄기가 한꺼번에 흐르는 강과 같습니다. 한쪽에서는 포화가 울리고, 다른 쪽에서는 회담이 이어지며, 바다 위에서는 선박이 항로를 바꾸고, 케이블과 에너지 관은 보이지 않는 힘으로 대륙을 잇습니다. 이 지구본은 그 복잡한 결을 지도의 언어로 옮겨 놓았습니다.",
    "이곳에서 당신은 두 갈래의 문 앞에 서게 됩니다.",
    "지정학의 창은 전선과 분쟁, 군사·외교의 긴장을 따라갑니다. 우크라이나의 접촉선, 공중의 궤적, 속보의 불꽃, 전장의 조용한 윤곽을 들여다보는 길입니다.",
    "지경학의 창은 에너지와 물류, 항로와 시장, 제재와 허브의 맥을 따라갑니다. 호르무즈와 수에즈, 케이블과 파이프라인, 자본과 공급망이 교차하는 지점을 읽는 길입니다.",
    "어느 문을 열든, 당신은 원하는 방식으로 관측을 이어갈 수 있습니다. 레이어를 켜고 끄며 시야를 좁히거나 넓히고, 관심 지역으로 날아가며, 뉴스와 데이터를 번갈아 살피십시오. 처음에는 낯설어도, 손끝의 선택 하나하나가 곧 당신만의 렌즈가 됩니다.",
    "부디 성급히 닫지 마십시오. 지도는 답을 주기보다, 올바른 질문을 떠올리게 하는 도구입니다. 오늘 당신이 이 관측대에서 건져 올리는 통찰이, 세상의 소란 속에서도 방향을 잃지 않는 나침반이 되기를 바랍니다.",
    "우리는 당신의 방문을 진심으로 환영합니다. 이제, 편지를 접고—어느 창으로 들어설지 선택해 주십시오.",
  ],
  signOff: "Conflict View\n지구본 관측대에서",
};

const LETTER_EN = {
  title: "Welcome!",
  paragraphs: [
    "Dear explorer,",
    "You have stepped into an observatory that looks down upon the surface of the Earth. Here borders and front lines, sea lanes and pipelines, breaking news and silence overlap on a single screen. Conflict View does not force a tidy conclusion. It only gathers what is scattered and sharpens what is visible, so that you may judge for yourself.",
    "The world often longs to be told as one story. Yet geopolitics is a river of many currents at once. Guns thunder in one place while talks continue in another; ships change course at sea; cables and energy lines bind continents with invisible force. This globe renders that tangled grain in the language of maps.",
    "Here you stand before two doors.",
    "The window of geopolitics follows front lines and disputes, and the tension of arms and diplomacy—Ukraine’s contact line, trails in the sky, sparks of breaking news, the quiet outline of the battlefield.",
    "The window of geoeconomics follows energy and logistics, routes and markets, sanctions and hubs—Hormuz and Suez, cables and pipelines, the crossings of capital and supply chains.",
    "Whichever door you open, you may observe as you wish. Toggle layers to narrow or widen your view, fly to places of interest, and move between news and data. At first it may feel unfamiliar, but each choice at your fingertips becomes a lens of your own.",
    "Do not close it too quickly. A map does not so much give answers as invite the right questions. May the insight you draw from this observatory today be a compass that holds its bearing amid the world’s noise.",
    "We welcome your visit with sincere regard. Now fold the letter—and choose which window you will enter.",
  ],
  signOff: "Conflict View\nFrom the Globe Observatory",
};

type WelcomeParchmentLetterProps = {
  lang: LabelLanguage;
  onContinue: () => void;
};

export function WelcomeParchmentLetter({ lang, onContinue }: WelcomeParchmentLetterProps) {
  const letter = lang === "en" ? LETTER_EN : LETTER_KO;
  const fontStyle =
    lang === "en"
      ? { fontFamily: "var(--font-letter-en), Caveat, cursive" as const }
      : { fontFamily: 'var(--font-letter-ko), "Nanum Pen Script", cursive' as const };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#02040a]/92 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-letter-title"
    >
      <div
        className="welcome-parchment relative flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        style={fontStyle}
      >
        <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-7 py-8 sm:px-12 sm:py-10">
          <h1
            id="welcome-letter-title"
            className="shrink-0 text-center text-4xl leading-tight text-[#3d2a18] sm:text-5xl"
            style={{ fontWeight: 700 }}
          >
            {letter.title}
          </h1>
          <div className="mx-auto mt-3 h-px w-24 shrink-0 bg-[#8b6914]/45" aria-hidden />
          <div className="mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain text-[1.15rem] leading-relaxed text-[#3f2e1c] sm:text-[1.28rem] sm:leading-[1.75]">
            {letter.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="whitespace-pre-wrap">
                {p}
              </p>
            ))}
            <p className="whitespace-pre-line pb-1 text-right text-[1.05rem] leading-relaxed text-[#5a4428]">
              {letter.signOff}
            </p>
          </div>
        </div>
        <div className="relative shrink-0 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-6 py-4 text-center">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full border border-[#8b6914]/50 bg-[#efe0b8] px-6 py-2.5 text-lg text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0]"
            style={fontStyle}
          >
            {t("welcomeLetterCta", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
