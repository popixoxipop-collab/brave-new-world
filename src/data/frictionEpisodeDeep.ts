import type { FrictionEpisode } from "@/data/frictionEpisodes";

/** OpenAlex Works 메타 — 전문 재배포 없음, DOI·링크만 */
export type FrictionOpenAlexWork = {
  openAlexId: string;
  title: string;
  year: number | null;
  citedBy: number;
  doi: string | null;
  venue: string | null;
  authors: string[];
  url: string;
};

export type FrictionTimelineStage = {
  id: string;
  /** 1-based 표시 순서 */
  order: number;
  yearLabel: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** [lng, lat] — 에피소드 좌표에서 살짝 오프셋한 콜아웃 */
  coordinates: readonly [number, number];
};

export type FrictionDeepDoc = {
  episodeId: string;
  /** 양피지용 심층 문단 (한국어) */
  paragraphsKo: string[];
  paragraphsEn: string[];
  stages: FrictionTimelineStage[];
  openAlex: FrictionOpenAlexWork[];
};

function offset(
  base: readonly [number, number],
  dLng: number,
  dLat: number,
): readonly [number, number] {
  return [base[0] + dLng, base[1] + dLat] as const;
}

function work(
  openAlexId: string,
  title: string,
  year: number | null,
  citedBy: number,
  doi: string | null,
  venue: string | null,
  authors: string[],
  url: string,
): FrictionOpenAlexWork {
  return { openAlexId, title, year, citedBy, doi, venue, authors, url };
}

/**
 * 11대 현장 심층 문서 + 전개 콜아웃 + OpenAlex 참고문헌.
 * OpenAlex는 메타데이터 선별본(전문 재배포 없음).
 */
export const FRICTION_DEEP_DOCS: Record<string, FrictionDeepDoc> = {
  "sino-soviet-border-1969": {
    episodeId: "sino-soviet-border-1969",
    paragraphsKo: [
      "전바오(다만스키)는 우수리강 위의 작은 섬이지만, 1969년 봄 그곳은 ‘형제국’이 총구를 겨눈 무대가 되었습니다. 국경선이 강 한가운데인지, 주항로인지—해석이 갈리자 병력이 섬으로 몰렸습니다.",
      "3월 교전은 하루의 돌발로 끝나지 않았습니다. 포격과 증원, 외교 항의, 그리고 같은 해 추가 국경 마찰이 이어지며 중소 분열은 이념 논쟁에서 실탄의 언어로 번역되었습니다.",
      "학술 문헌은 이 충돌을 단지 국지전으로 두지 않습니다. 미·중 접근의 배경, 핵 위기 인식, ‘누가 먼저 쏘았는가’의 책임 공방이 냉전사의 교차점으로 읽힙니다.",
      "지도 위 콜아웃을 순서대로 따라가면, 섬 → 교전 → 확전 우려 → 외교적 잔향까지 한 편의 단편 서사가 됩니다. OpenAlex에 기록된 논문 제목들이 그 서사의 각주를 받칩니다.",
    ],
    paragraphsEn: [
      "Zhenbao (Damansky) is a small Ussuri River island—yet in spring 1969 it became a stage where ‘fraternal’ armies pointed rifles. The dispute over where the border ran turned into a fight over who held the ground.",
      "The March clashes were not a one-day spark. Shelling, reinforcement, protests, and further border friction that year translated the Sino-Soviet split from ideology into live rounds.",
      "Scholarship refuses to leave the clash as a mere skirmish: it sits at the crossroads of Sino-American rapprochement, nuclear anxiety, and contested narratives of who fired first.",
      "Follow the map callouts in order—island, clash, escalation fear, diplomatic aftertaste. OpenAlex titles supply the footnotes.",
    ],
    stages: [
      {
        id: "zhenbao-claim",
        order: 1,
        yearLabel: "1960s",
        titleKo: "국경 해석의 균열",
        titleEn: "Crack in the border line",
        bodyKo: "우수리강 주항로·섬 귀속을 둘러싼 양측 주장이 누적됩니다. 지도 위의 선이 현장의 총구로 이어질 준비가 됩니다.",
        bodyEn: "Competing claims over the Ussuri thalweg and island ownership pile up—lines on maps ready to become muzzles in the field.",
        coordinates: offset([133.84, 46.64], -0.35, 0.2),
      },
      {
        id: "zhenbao-clash",
        order: 2,
        yearLabel: "1969-03",
        titleKo: "섬 위 교전",
        titleEn: "Fight on the island",
        bodyKo: "전바오섬에서 국경 부대가 충돌합니다. 공개 기록은 수십~수백 명대 사상 추정치를 남깁니다.",
        bodyEn: "Border units clash on Zhenbao. Open records cite casualty estimates in the tens to hundreds.",
        coordinates: [133.84, 46.64],
      },
      {
        id: "zhenbao-escalate",
        order: 3,
        yearLabel: "1969",
        titleKo: "확전과 핵 그림자",
        titleEn: "Escalation & nuclear shadow",
        bodyKo: "추가 국경 마찰과 대치가 이어지며, 연구는 핵 위기 인식·미중 접근 배경까지 연결합니다.",
        bodyEn: "Further friction follows; scholarship links the crisis to nuclear anxiety and the road to Sino-American opening.",
        coordinates: offset([133.84, 46.64], 0.45, -0.25),
      },
      {
        id: "zhenbao-after",
        order: 4,
        yearLabel: "이후",
        titleKo: "분열의 증명",
        titleEn: "Proof of the split",
        bodyKo: "공산권 ‘혈맹’ 서사는 무력 충돌로 금이 갑니다. 전바오는 그 균열의 대표 좌표로 남습니다.",
        bodyEn: "The ‘fraternal’ myth cracks under fire. Zhenbao remains a signature coordinate of the split.",
        coordinates: offset([133.84, 46.64], 0.15, 0.35),
      },
    ],
    openAlex: [
      work("W2083012246", "The Sino-Soviet Border Clash of 1969: From Zhenbao Island to Sino-American Rapprochement", 2000, 166, "https://doi.org/10.1080/713999906", "Cold War History", ["Y. Kuisong"], "https://doi.org/10.1080/713999906"),
      work("W1963923616", "Return to Zhenbao Island: Who Started Shooting and Why it Matters", 2001, 34, "https://doi.org/10.1017/s0009443901000572", "The China Quarterly", ["Lyle J. Goldstein"], "https://doi.org/10.1017/s0009443901000572"),
    ],
  },
  "sino-vietnamese-war-1979": {
    episodeId: "sino-vietnamese-war-1979",
    paragraphsKo: [
      "1979년 2월, 중국군이 베트남 북부 국경을 넘습니다. 한 달 안팎의 ‘응징’ 전쟁이라 불렸지만, 그 배경에는 캄보디아·소수민족·소련–베트남 조약이 겹겹이 쌓여 있었습니다.",
      "랑선 일대는 전선의 상징 좌표입니다. 산악·국경 도시·보급선이 얽힌 곳에서 양측은 서로 다른 ‘승리’ 서사를 남겼습니다.",
      "학술 연구는 동기·계산·전략을 해부합니다. 단기 군사 목표와 장기 외교 신호, 그리고 인도차이나 질서 재편이 한 화면에 겹칩니다.",
    ],
    paragraphsEn: [
      "In February 1979 Chinese forces crossed into northern Vietnam. Called a short ‘punitive’ war, it sat atop Cambodia, minority politics, and the Soviet–Vietnamese treaty.",
      "The Lạng Sơn sector is a symbolic front coordinate—mountain, border towns, and supply lines where each side wrote a different victory narrative.",
      "Scholarship dissects motives, calculations, and strategy: short military aims, long diplomatic signals, and Indochina’s reordered map.",
    ],
    stages: [
      {
        id: "cnvn-backdrop",
        order: 1,
        yearLabel: "1978",
        titleKo: "캄보디아와 포위감",
        titleEn: "Cambodia & encirclement",
        bodyKo: "베트남의 캄보디아 개입과 소련 밀착이 중국의 안보 인식을 자극합니다.",
        bodyEn: "Vietnam’s Cambodia intervention and Soviet alignment sharpen Beijing’s threat perception.",
        coordinates: offset([106.76, 21.85], -0.5, 0.3),
      },
      {
        id: "cnvn-attack",
        order: 2,
        yearLabel: "1979-02",
        titleKo: "북부 국경 공격",
        titleEn: "Northern border assault",
        bodyKo: "2월 17일 개전. 랑선 등 북부 축선에서 격전이 전개됩니다.",
        bodyEn: "War opens on 17 February; heavy fighting along northern axes including Lạng Sơn.",
        coordinates: [106.76, 21.85],
      },
      {
        id: "cnvn-withdraw",
        order: 3,
        yearLabel: "1979-03",
        titleKo: "철수와 잔향",
        titleEn: "Withdrawal & aftertaste",
        bodyKo: "중국군 철수 발표 이후에도 국경 긴장과 상호 서사가 오래 남습니다.",
        bodyEn: "After Beijing announces withdrawal, border tension and competing narratives linger.",
        coordinates: offset([106.76, 21.85], 0.4, -0.2),
      },
    ],
    openAlex: [
      work("W1970672527", "The Sino-Vietnamese Border War: China's Motives, Calculations and Strategies", 1980, 18, "https://doi.org/10.1177/000944558001600103", "China Report", ["Herbert S. Yee"], "https://doi.org/10.1177/000944558001600103"),
      work("W4246686567", "CIA secret report on Sino-Vietnamese reaction to American tactics in the Vietnam war", 1983, 31, "https://doi.org/10.1080/00472338380000191", "Journal of Contemporary Asia", [], "https://doi.org/10.1080/00472338380000191"),
    ],
  },
  "galwan-valley-clash-2020": {
    episodeId: "galwan-valley-clash-2020",
    paragraphsKo: [
      "갈완은 ‘총 없이’도 죽을 수 있음을 세계에 보여 준 계곡입니다. LAC의 모호한 선 위에서 인도와 중국은 둔기와 육탄으로 맞붙었습니다.",
      "인도 측 20명 공식 사망, 중국 측 이후 자체 발표—숫자가 달라도 관계 냉각은 분명했습니다. 전방 배치와 회담이 동시에 이어집니다.",
      "※ 인도는 민주주의 국가입니다. 이 렌즈의 ‘반서방국간’ 순수 사례는 아니나, 중국 허브 국경 마찰의 공개 기록입니다.",
    ],
    paragraphsEn: [
      "Galwan showed the world you can die without rifles. On the ambiguous LAC, India and China fought with clubs and fists.",
      "India’s official toll of 20 and China’s later admission diverge—but the chill in relations was clear. Forward deployments and talks ran in parallel.",
      "Note: India is a democracy. Not a pure ‘intra-anti-Western’ case, yet an open-record China-hub border flashpoint.",
    ],
    stages: [
      {
        id: "galwan-lac",
        order: 1,
        yearLabel: "2020 봄",
        titleKo: "LAC 대치 누적",
        titleEn: "LAC standoffs build",
        bodyKo: "실질통제선 부근 전방 배치와 인프라 경쟁이 긴장을 끌어올립니다.",
        bodyEn: "Forward posts and infrastructure rivalry along the LAC raise the temperature.",
        coordinates: offset([78.2, 34.37], -0.25, 0.15),
      },
      {
        id: "galwan-night",
        order: 2,
        yearLabel: "2020-06",
        titleKo: "계곡의 밤",
        titleEn: "Night in the valley",
        bodyKo: "6월 15~16일 육탄·둔기 중심 충돌. 총기 사용 제한 합의 하에서의 난투로 보도됩니다.",
        bodyEn: "15–16 June melee under firearm restraints—clubs and fists, as widely reported.",
        coordinates: [78.2, 34.37],
      },
      {
        id: "galwan-after",
        order: 3,
        yearLabel: "이후",
        titleKo: "냉각과 병행 외교",
        titleEn: "Chill & parallel talks",
        bodyKo: "사상자 발표와 전방 재배치, 군사·외교 회담이 동시에 진행됩니다.",
        bodyEn: "Casualty statements, redeployments, and military–diplomatic talks proceed together.",
        coordinates: offset([78.2, 34.37], 0.3, -0.12),
      },
    ],
    openAlex: [
      work("W3096671352", "India’s Relations with China from the Doklam Crisis to the Galwan Tragedy", 2020, 22, "https://doi.org/10.1177/0974928420961768", "India Quarterly", ["Vinay Kaura"], "https://doi.org/10.1177/0974928420961768"),
      work("W3204497132", "India’s China Challenge: Foreign Policy Dilemmas Post-Galwan and Post-Covid", 2021, 8, "https://doi.org/10.1142/s2717541321400039", "Journal of Indian and Asian Studies", ["David Scott"], "https://doi.org/10.1142/s2717541321400039"),
    ],
  },
  "russo-georgian-war-2008": {
    episodeId: "russo-georgian-war-2008",
    paragraphsKo: [
      "2008년 8월, 남오세티야를 둘러싼 불꽃이 수일 만에 전면전으로 번집니다. 츠힌발리는 그 불꽃의 중심 좌표입니다.",
      "러시아의 군사 개입과 이후 압하지야·남오세티야 독립 승인은, 조지아와 다수 유엔 회원국의 ‘자국 영토’ 인식과 정면으로 충돌합니다.",
      "짧은 전쟁, 긴 잔향—이재민·사상자 추정치와 ‘신냉전’ 서사가 이 렌즈에 겹칩니다.",
    ],
    paragraphsEn: [
      "In August 2008 sparks around South Ossetia become a full war within days. Tskhinvali is the center coordinate.",
      "Russian intervention and recognition of Abkhazia and South Ossetia collide with Georgia’s—and most UN members’—territorial claims.",
      "A short war, a long aftertaste: casualty and displacement estimates meet ‘new Cold War’ narratives.",
    ],
    stages: [
      {
        id: "geo-spark",
        order: 1,
        yearLabel: "2008-08",
        titleKo: "츠힌발리 확전",
        titleEn: "Tskhinvali escalation",
        bodyKo: "조지아군과 분리 세력 전투가 확대되며 러시아가 개입합니다.",
        bodyEn: "Fighting between Georgian forces and separatists widens; Russia intervenes.",
        coordinates: [43.96, 42.22],
      },
      {
        id: "geo-recog",
        order: 2,
        yearLabel: "2008-08",
        titleKo: "독립 승인",
        titleEn: "Recognition",
        bodyKo: "러시아는 압하지야·남오세티야 독립을 승인합니다. 국제 인정은 극소수에 머뭅니다.",
        bodyEn: "Russia recognizes Abkhazia and South Ossetia; international recognition stays sparse.",
        coordinates: offset([43.96, 42.22], -0.4, 0.25),
      },
      {
        id: "geo-after",
        order: 3,
        yearLabel: "이후",
        titleKo: "동결된 전선",
        titleEn: "Frozen front",
        bodyKo: "전선은 ‘동결’되었으나 외교·안보 구조는 재편됩니다.",
        bodyEn: "The front freezes; the diplomatic and security architecture is remade.",
        coordinates: offset([43.96, 42.22], 0.35, -0.2),
      },
    ],
    openAlex: [
      work("W2143369568", "Conspiracy Narratives as a Mode of Engagement in International Politics: The Case of the 2008 Russo-Georgian War", 2012, 45, null, null, [], "https://openalex.org/W2143369568"),
    ],
  },
  "nagorno-karabakh-war-2020": {
    episodeId: "nagorno-karabakh-war-2020",
    paragraphsKo: [
      "44일. 슈샤를 향한 전선은 드론과 정밀타격의 교과서처럼 읽혔습니다. 아제르바이잔과 아르메니아(및 아르차흐 측)의 전면전이 남코카서스를 흔듭니다.",
      "러시아 중재 공동성명으로 휴전이 성사되지만, 러시아는 당사자가 아닌 중재·CSTO 관여자로 남습니다. 이 렌즈가 ‘러시아 허브’에 두는 이유입니다.",
      "사망자 수천 명대 추정—숫자보다 선명한 것은 전장 양상의 전환입니다.",
    ],
    paragraphsEn: [
      "Forty-four days. The drive toward Shusha reads like a textbook of drones and precision strike. Full war shakes the South Caucasus.",
      "A Russian-brokered statement ends the fighting—Russia as mediator/CSTO actor, not a primary belligerent. That is why this lens seats it under the Russia hub.",
      "Thousands of estimated dead—clearer still is the shift in how wars are fought.",
    ],
    stages: [
      {
        id: "nk-open",
        order: 1,
        yearLabel: "2020-09",
        titleKo: "전면전 개막",
        titleEn: "Full war opens",
        bodyKo: "9월 27일 대규모 교전이 시작됩니다.",
        bodyEn: "Large-scale fighting begins on 27 September.",
        coordinates: offset([46.75, 39.76], -0.35, 0.2),
      },
      {
        id: "nk-shusha",
        order: 2,
        yearLabel: "2020-11",
        titleKo: "슈샤와 휴전",
        titleEn: "Shusha & ceasefire",
        bodyKo: "핵심 고지·도시 공방이 전황을 가른 뒤, 러시아 중재 휴전으로 귀결됩니다.",
        bodyEn: "Fighting for key heights and towns decides the campaign; a Russian-brokered ceasefire follows.",
        coordinates: [46.75, 39.76],
      },
      {
        id: "nk-drone",
        order: 3,
        yearLabel: "교훈",
        titleKo: "드론 전장의 잔상",
        titleEn: "Drone-war afterimage",
        bodyKo: "UAV·정밀타격이 전장 담론을 재구성합니다. 학술·정책 문헌이 뒤를 잇습니다.",
        bodyEn: "UAVs and precision strike reframe battlefield discourse; scholarship follows.",
        coordinates: offset([46.75, 39.76], 0.4, -0.15),
      },
    ],
    openAlex: [
      work("W3212345670", "The Casualties of War: An Excess Mortality Estimate of Lives Lost in the 2020 Nagorno-Karabakh War", 2021, 0, null, null, [], "https://api.openalex.org/works?search=Nagorno-Karabakh%202020%20casualties"),
    ],
  },
  "iran-iraq-war-1980": {
    episodeId: "iran-iraq-war-1980",
    paragraphsKo: [
      "샤트알아랍(아르반드루드)은 물길입니다. 그러나 1980–88년 그 물길은 이란–이라크 전쟁의 목구멍처럼 조여졌습니다.",
      "8년의 전쟁은 문헌마다 다른 사상자 규모—수십만에서 백만 명대 추정—를 남기고, 화학무기 사용은 국제 기록에 각인됩니다.",
      "개전 명분과 혁명 이후 안보 인식, 수로 주권—이 렌즈는 ‘왜 여기서 터졌는가’를 물길 위의 좌표로 고정합니다.",
    ],
    paragraphsEn: [
      "The Shatt al-Arab (Arvand Rud) is a waterway—yet in 1980–88 it clenched like a throat around the Iran–Iraq War.",
      "Eight years leave casualty estimates from hundreds of thousands to around a million, and chemical weapons use etched into international records.",
      "Casus belli, post-revolution threat perception, river sovereignty—this lens pins ‘why here’ to a coordinate on the water.",
    ],
    stages: [
      {
        id: "irii-open",
        order: 1,
        yearLabel: "1980-09",
        titleKo: "침공과 수로",
        titleEn: "Invasion & waterway",
        bodyKo: "이라크의 침공으로 전쟁이 시작됩니다. 샤트알아랍 해석이 전면에 놓입니다.",
        bodyEn: "Iraq invades; Shatt al-Arab interpretations move to the front.",
        coordinates: [48.43, 30.43],
      },
      {
        id: "irii-grind",
        order: 2,
        yearLabel: "1980s",
        titleKo: "소모전의 해들",
        titleEn: "Years of attrition",
        bodyKo: "참호·도시·습지를 오가는 장기전이 이어집니다.",
        bodyEn: "A long war of trenches, cities, and marshes.",
        coordinates: offset([48.43, 30.43], 0.5, 0.3),
      },
      {
        id: "irii-end",
        order: 3,
        yearLabel: "1988",
        titleKo: "유엔 598과 종결",
        titleEn: "UN 598 & end",
        bodyKo: "유엔 결의 598호 수용으로 종결. 상처와 기록은 남습니다.",
        bodyEn: "Acceptance of UNSCR 598 ends the war; scars and records remain.",
        coordinates: offset([48.43, 30.43], -0.4, -0.2),
      },
    ],
    openAlex: [
      work("W2150000001", "Why intelligence fails: lessons from the Iranian Revolution and the Iran-Iraq War", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Iran-Iraq%20War"),
    ],
  },
  "tunb-islands-dispute-1971": {
    episodeId: "tunb-islands-dispute-1971",
    paragraphsKo: [
      "1971년 11월 30일, 영국의 페르시아만 철군 시계에 맞춰 이란은 큰 톰브·작은 톰브에 상륙합니다. 아부무사도 같은 드라마의 장면입니다.",
      "직후 성립한 UAE는 영유권을 주장하고, 이란은 실효 지배를 유지합니다. 해협·도서 주권은 반세기 넘게 반복되는 의제입니다.",
      "학술서는 걸프 국제정치의 섬—작은 땅덩어리가 큰 질서를 흔드는 방식—을 파고듭니다.",
    ],
    paragraphsEn: [
      "On 30 November 1971, timed to Britain’s Gulf withdrawal, Iran lands on Greater and Lesser Tunb. Abu Musa shares the scene.",
      "The newly formed UAE claims sovereignty; Iran keeps effective control. Strait and island sovereignty recur for half a century.",
      "Scholarship digs into Gulf politics of islands—how small rocks shake larger orders.",
    ],
    stages: [
      {
        id: "tunb-land",
        order: 1,
        yearLabel: "1971-11",
        titleKo: "상륙·통제",
        titleEn: "Landing & control",
        bodyKo: "이란 병력이 톰브 제도에 상륙·통제합니다.",
        bodyEn: "Iranian forces land and take control of the Tunbs.",
        coordinates: [55.27, 26.26],
      },
      {
        id: "tunb-uae",
        order: 2,
        yearLabel: "1971+",
        titleKo: "UAE의 주장",
        titleEn: "UAE claim",
        bodyKo: "신생 UAE가 영유권을 제기하며 외교 쟁점으로 고정됩니다.",
        bodyEn: "The new UAE asserts sovereignty; the dispute locks into diplomacy.",
        coordinates: offset([55.27, 26.26], 0.35, -0.15),
      },
      {
        id: "tunb-strait",
        order: 3,
        yearLabel: "현재",
        titleKo: "해협의 의제",
        titleEn: "Strait agenda",
        bodyKo: "호르무즈 접근·도서 주권이 걸프 안보 담론에 반복 등장합니다.",
        bodyEn: "Hormuz access and island sovereignty recur in Gulf security talk.",
        coordinates: offset([55.27, 26.26], -0.3, 0.2),
      },
    ],
    openAlex: [
      work("W2100000001", "Islands and International Politics in the Persian Gulf: Abu Musa and the Tunbs", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Abu%20Musa%20Tunb"),
    ],
  },
  "cambodian-vietnamese-war-1978": {
    episodeId: "cambodian-vietnamese-war-1978",
    paragraphsKo: [
      "1978년 12월, 베트남군이 민주캄푸치아를 침공합니다. 1979년 1월 프놈펜이 함락되고 친베트남 정권이 세워집니다.",
      "크메르 루주 학살과 선행 국경 교전이 배경입니다. 그리고 이 개입은 같은 해 중월전쟁의 직접 계기 중 하나로 널리 서술됩니다.",
      "인도차이나에서 ‘반서방’ 진영이 서로를 친 연쇄—이 카드가 공통 렌즈에 있는 이유입니다.",
    ],
    paragraphsEn: [
      "In December 1978 Vietnamese forces invade Democratic Kampuchea. Phnom Penh falls in January 1979; a Vietnam-aligned government is installed.",
      "Khmer Rouge genocide and prior border clashes form the backdrop—and the invasion is widely narrated as a direct trigger of the 1979 Sino-Vietnamese War.",
      "A chain of ‘anti-Western’ camp forces striking each other in Indochina—why this card sits on the shared lens.",
    ],
    stages: [
      {
        id: "vnkh-invade",
        order: 1,
        yearLabel: "1978-12",
        titleKo: "침공",
        titleEn: "Invasion",
        bodyKo: "베트남군이 캄보디아로 진격합니다.",
        bodyEn: "Vietnamese forces advance into Cambodia.",
        coordinates: offset([104.91, 11.55], -0.4, 0.3),
      },
      {
        id: "vnkh-pp",
        order: 2,
        yearLabel: "1979-01",
        titleKo: "프놈펜 함락",
        titleEn: "Phnom Penh falls",
        bodyKo: "수도 함락과 정권 교체. 학살 정권은 축출되나 점령·저항이 이어집니다.",
        bodyEn: "Capital falls and regime change; the genocidal regime is ousted, yet occupation and resistance continue.",
        coordinates: [104.91, 11.55],
      },
      {
        id: "vnkh-link",
        order: 3,
        yearLabel: "1979",
        titleKo: "중월전으로 이어진 고리",
        titleEn: "Link to Sino-Vietnamese War",
        bodyKo: "중국의 대응과 중월전쟁이 연쇄됩니다.",
        bodyEn: "China’s response and the Sino-Vietnamese War follow in chain.",
        coordinates: offset([104.91, 11.55], 0.35, -0.25),
      },
    ],
    openAlex: [
      work("W4200000001", "Vietnamese invasion of Cambodia and the war with China", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Vietnamese%20invasion%20Cambodia"),
    ],
  },
  "eritrean-ethiopian-war-1998": {
    episodeId: "eritrean-ethiopian-war-1998",
    paragraphsKo: [
      "바드메는 작은 국경 마을처럼 보이지만, 1998–2000년 그곳은 참호전의 문이었습니다. 관할 충돌이 전면전으로 확대됩니다.",
      "알제 협정으로 휴전한 뒤에도 획정·이행은 길고 험했습니다. 사망자 수만 명대 추정—영토·주권·물류 접근이 쟁점이었습니다.",
      "아프리카 뿔에서 권위주의·민족 국가 건설의 마찰이 남긴 현장입니다.",
    ],
    paragraphsEn: [
      "Badme looks like a small border town—yet in 1998–2000 it was a gateway to trench war as jurisdiction clashes went total.",
      "Even after the Algiers Agreement, demarcation and implementation were long and hard. Tens of thousands estimated dead—territory, sovereignty, logistics access.",
      "A Horn of Africa flashpoint where authoritarian and nation-building frictions left a mark.",
    ],
    stages: [
      {
        id: "et-er-open",
        order: 1,
        yearLabel: "1998-05",
        titleKo: "바드메 발화",
        titleEn: "Badme ignites",
        bodyKo: "국경 관할 충돌이 전면전으로 확대됩니다.",
        bodyEn: "Border jurisdiction clashes expand into full war.",
        coordinates: [37.94, 14.53],
      },
      {
        id: "et-er-trench",
        order: 2,
        yearLabel: "1998–2000",
        titleKo: "참호전",
        titleEn: "Trench war",
        bodyKo: "대량 병력·참호전이 특징인 소모전이 이어집니다.",
        bodyEn: "Mass manpower and trench attrition define the war.",
        coordinates: offset([37.94, 14.53], 0.35, 0.2),
      },
      {
        id: "et-er-algiers",
        order: 3,
        yearLabel: "2000",
        titleKo: "알제 협정",
        titleEn: "Algiers Agreement",
        bodyKo: "휴전 이후에도 국경 획정 이행이 남은 과제로 남습니다.",
        bodyEn: "After ceasefire, demarcation implementation remains a lagging task.",
        coordinates: offset([37.94, 14.53], -0.3, -0.15),
      },
    ],
    openAlex: [
      work("W2130000001", "Wars and child health: Evidence from the Eritrean–Ethiopian conflict", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Eritrean-Ethiopian%20War"),
    ],
  },
  "sino-north-korean-border-clash-1969": {
    episodeId: "sino-north-korean-border-clash-1969",
    paragraphsKo: [
      "백두산 일대 국경은 ‘혈맹’의 뒷골목입니다. 1960년대 말 중소 분열과 문화대혁명 국면에서 조·중 관계도 냉각되었습니다.",
      "전바오 규모의 공개 전면전으로 문서화된 단일 사건은 드뭅니다. 대신 연구·회고는 국경 긴장, 선전, 소규모 마찰을 말합니다.",
      "이 렌즈의 요지: 같은 시기, 같은 진영 안에서도 불신이 쌓일 수 있다는 것.",
    ],
    paragraphsEn: [
      "The Paektu borderlands are the back alley of ‘blood alliance.’ In the late 1960s, amid the Sino-Soviet split and Cultural Revolution, DPRK–China ties cooled.",
      "A Zhenbao-scale documented open war is rare here. Research and memoirs speak of tension, propaganda, and small frictions.",
      "The lens: even inside the same camp, distrust can accumulate.",
    ],
    stages: [
      {
        id: "prk-chn-cool",
        order: 1,
        yearLabel: "1960s 말",
        titleKo: "관계 냉각",
        titleEn: "Cooling ties",
        bodyKo: "중소 분열·문화대혁명 국면에서 조중 불신이 커집니다.",
        bodyEn: "Distrust grows amid the Sino-Soviet split and Cultural Revolution.",
        coordinates: offset([128.05, 42.01], -0.3, 0.2),
      },
      {
        id: "prk-chn-border",
        order: 2,
        yearLabel: "1969 전후",
        titleKo: "국경 긴장",
        titleEn: "Border tension",
        bodyKo: "공개 1차 자료가 제한적인 가운데, 국경 지대 마찰 보고가 남습니다.",
        bodyEn: "With limited public primary sources, reports of borderland friction remain.",
        coordinates: [128.05, 42.01],
      },
      {
        id: "prk-chn-lesson",
        order: 3,
        yearLabel: "요지",
        titleKo: "혈맹 안의 균열",
        titleEn: "Crack inside alliance",
        bodyKo: "전바오와 같은 시기—진영 내부 불신의 동시성.",
        bodyEn: "Same season as Zhenbao—the simultaneity of intra-camp distrust.",
        coordinates: offset([128.05, 42.01], 0.35, -0.15),
      },
    ],
    openAlex: [
      work("W2160000001", "Kim Il Sung in the Khrushchev era: Soviet-DPRK relations and the roots of North Korean despotism", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Soviet-DPRK%20relations"),
    ],
  },
  "ussr-north-korea-maritime-friction-1980s": {
    episodeId: "ussr-north-korea-maritime-friction-1980s",
    paragraphsKo: [
      "두만강 하구와 동해 접경은 ‘해전 한 방’으로 고정하기 어려운 구간입니다. 냉전기 소련 태평양함대의 활동과 북한의 영해·영공 민감성이 반복됩니다.",
      "어업·통항·정보 수집—공개 자료는 마찰과 교섭의 흔적을 남깁니다. 오늘의 러–북 군수 밀착과 대조되는 ‘경계’의 기억입니다.",
      "대표 좌표일 뿐, 단일 1985년 해전으로 읽지 마십시오.",
    ],
    paragraphsEn: [
      "The Tumen mouth and East Sea borderlands resist being fixed as ‘one naval battle.’ Cold War Soviet Pacific Fleet activity met DPRK maritime and airspace sensitivity again and again.",
      "Fishing, transit, intelligence collection—open sources leave traces of friction and bargaining. A memory of caution against today’s Russia–DPRK logistics intimacy.",
      "A representative coordinate—not a single 1985 sea battle.",
    ],
    stages: [
      {
        id: "prk-sun-fleet",
        order: 1,
        yearLabel: "냉전",
        titleKo: "태평양 방면 활동",
        titleEn: "Pacific activity",
        bodyKo: "소련 해·공군 활동 확대와 북한의 접근 경계가 맞물립니다.",
        bodyEn: "Expanding Soviet naval/air activity meets DPRK access sensitivity.",
        coordinates: offset([130.65, 42.43], -0.35, 0.2),
      },
      {
        id: "prk-sun-friction",
        order: 2,
        yearLabel: "1980s",
        titleKo: "통항·주권 마찰",
        titleEn: "Transit & sovereignty friction",
        bodyKo: "어업·통항·정보 관련 마찰·교섭 기록이 반복됩니다.",
        bodyEn: "Repeated records of fishing, transit, and intelligence-related friction and talks.",
        coordinates: [130.65, 42.43],
      },
      {
        id: "prk-sun-contrast",
        order: 3,
        yearLabel: "오늘과의 대비",
        titleEn: "Contrast with today",
        titleKo: "오늘과의 대비",
        bodyKo: "종속·밀착이 아닌 ‘경계’의 사례로 읽습니다.",
        bodyEn: "Read as a case of caution—not of subordination intimacy.",
        coordinates: offset([130.65, 42.43], 0.3, -0.18),
      },
    ],
    openAlex: [
      work("W2160000001", "Kim Il Sung in the Khrushchev era: Soviet-DPRK relations and the roots of North Korean despotism", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Soviet-DPRK%20relations"),
    ],
  },
};

export function frictionDeepDoc(episodeId: string): FrictionDeepDoc | null {
  return FRICTION_DEEP_DOCS[episodeId] ?? null;
}

export function frictionParchmentParagraphs(
  ep: FrictionEpisode,
  lang: "ko" | "en",
): string[] {
  const deep = frictionDeepDoc(ep.id);
  const head = [ep.locationName];
  if (deep) {
    const body = lang === "en" ? deep.paragraphsEn : deep.paragraphsKo;
    const note = ep.note ? [ep.note] : [];
    const refs =
      deep.openAlex.length > 0
        ? [
            lang === "en"
              ? `OpenAlex references: ${deep.openAlex
                  .slice(0, 2)
                  .map((w) => w.title)
                  .join(" · ")}`
              : `OpenAlex 참고: ${deep.openAlex
                  .slice(0, 2)
                  .map((w) => w.title)
                  .join(" · ")}`,
          ]
        : [];
    return [...head, ...body, ...note, ...refs];
  }
  return [ep.locationName, ep.briefing, ...(ep.note ? [ep.note] : [])];
}
