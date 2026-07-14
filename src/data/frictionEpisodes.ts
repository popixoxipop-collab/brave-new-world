/**
 * 반서방·권위주의 진영 내부 분쟁 외교사 — 11대 큐레이션 에피소드.
 * coordinates: [lng, lat] (GeoJSON). 내부 fly는 lat/lng로 변환.
 * 브리핑은 공개 기록·표준 명칭·연도 위주. 문학적 수식 배제.
 */

import type { AxisHubId } from "@/data/axisNetwork";

export type FrictionLens = "china" | "russia" | "iran" | "north_korea" | "global";

export type FrictionEpisode = {
  id: string;
  title: string;
  lens: FrictionLens;
  /** [경도, 위도] */
  coordinates: readonly [number, number];
  /** MapLibre 계열 줌 — globe altitude로 환산 */
  zoom: number;
  pitch: number;
  bearing: number;
  historicalYear: number;
  yearEnd?: number;
  locationName: string;
  briefing: string;
  /** soft fly 시 펄스 링 반경 스케일 */
  radiusScale: number;
  parties: string[];
  note?: string;
};

export const FRICTION_EPISODES: readonly FrictionEpisode[] = [
  {
    id: "sino-soviet-border-1969",
    title: "중소 국경 분쟁 (1969)",
    lens: "china",
    coordinates: [133.84, 46.64],
    zoom: 7,
    pitch: 45,
    bearing: 0,
    historicalYear: 1969,
    locationName: "우수리강 전바오섬 (다만스키 섬)",
    parties: ["CHN", "SUN"],
    radiusScale: 1.6,
    briefing:
      "1969년 3월, 중국과 소련 국경 부대가 우수리강(흑룡강)의 전바오섬(소련명 다만스키)에서 교전했습니다. 섬의 귀속과 국경 해석을 둘러싼 충돌로 양측 수십~수백 명 규모의 사상자가 발생했다는 기록이 있습니다. 같은 해 추가 국경 교전과 외교·군사 대치가 이어졌으며, 공산권 내부의 중소 분열이 무력 충돌로 드러난 사례로 기록됩니다.",
  },
  {
    id: "sino-vietnamese-war-1979",
    title: "중월전쟁 (1979)",
    lens: "china",
    coordinates: [106.76, 21.85],
    zoom: 6.5,
    pitch: 45,
    bearing: -10,
    historicalYear: 1979,
    locationName: "베트남 랑선(Lạng Sơn) 국경 지대",
    parties: ["CHN", "VNM"],
    radiusScale: 2.2,
    briefing:
      "1979년 2월 17일, 중국 인민해방군이 베트남 북부 국경을 공격하며 전쟁이 시작되었습니다. 배경에는 베트남의 캄보디아 개입(크메르 루주 축출), 소수민족·보트피플 문제, 소련–베트남 조약 등이 겹칩니다. 주요 교전은 약 한 달간 지속된 뒤 중국군이 철수했다고 발표했으며, 양측 사상자 규모는 수만 명대라는 추정치가 문헌에 제시됩니다.",
  },
  {
    id: "galwan-valley-clash-2020",
    title: "갈완 계곡 충돌 (2020)",
    lens: "china",
    coordinates: [78.2, 34.37],
    zoom: 8,
    pitch: 50,
    bearing: 15,
    historicalYear: 2020,
    locationName: "라다크 갈완 계곡 · 실질통제선(LAC)",
    parties: ["CHN", "IND"],
    radiusScale: 1.4,
    note: "인도는 민주주의 국가. ‘반서방국간’ 순수 사례는 아니나 중국 허브 국경 마찰의 공개 기록이다.",
    briefing:
      "2020년 6월 15~16일, 인도·중국이 실질통제선(LAC) 부근 갈완 계곡에서 충돌했습니다. 양측은 총기 사용 제한 합의 하에서 육탄·둔기 중심의 난투로 보도되었습니다. 인도 측은 장교·사병 20명 사망을 공식 발표했고, 중국 측은 이후 자체 발표에서 4명 사망을 인정했습니다. 이후 양국은 전방 배치와 회담을 병행하며 관계가 냉각되었습니다.",
  },
  {
    id: "russo-georgian-war-2008",
    title: "러시아–조지아 전쟁 (2008)",
    lens: "russia",
    coordinates: [43.96, 42.22],
    zoom: 7.5,
    pitch: 40,
    bearing: -5,
    historicalYear: 2008,
    locationName: "남오세티야 츠힌발리(Tskhinvali)",
    parties: ["RUS", "GEO"],
    radiusScale: 1.8,
    briefing:
      "2008년 8월, 조지아군과 남오세티야 분리 세력 간 전투가 확대된 뒤 러시아가 군사 개입했습니다. 교전은 수일 단위로 전개되었고, 이후 러시아는 압하지야·남오세티야의 독립을 승인했습니다. 조지아와 유엔 회원국 다수는 이를 자국 영토로 간주합니다. 사상자·이재민 규모는 수천~수만 명대 추정치가 국제기구·보도에 제시되었습니다.",
  },
  {
    id: "nagorno-karabakh-war-2020",
    title: "제2차 나고르노-카라바흐 전쟁 (2020)",
    lens: "russia",
    coordinates: [46.75, 39.76],
    zoom: 7,
    pitch: 45,
    bearing: 10,
    historicalYear: 2020,
    locationName: "슈샤(Şuşa / Shusha)",
    parties: ["AZE", "ARM"],
    radiusScale: 1.7,
    briefing:
      "2020년 9월 27일부터 약 44일간, 아제르바이잔과 아르메니아(및 아르차흐/나고르노-카라바흐 측)가 전면전에 들어갔습니다. 아제르바이잔이 전장을 유리하게 이끌었고, 11월 러시아 중재 공동성명으로 휴전이 성사되었습니다. 군 사망자는 수천 명대로 집계·추정되며, 드론·정밀타격이 전장 양상에 미친 영향이 널리 보고되었습니다. 러시아는 CSTO·중재자 역할로 관여했으나 당사자 간 전쟁은 아닙니다.",
  },
  {
    id: "iran-iraq-war-1980",
    title: "이란–이라크 전쟁 (1980–1988)",
    lens: "iran",
    coordinates: [48.43, 30.43],
    zoom: 6.5,
    pitch: 45,
    bearing: 0,
    historicalYear: 1980,
    yearEnd: 1988,
    locationName: "샤트알아랍(Shatt al-Arab / Arvand Rud) 수로",
    parties: ["IRN", "IRQ"],
    radiusScale: 2.4,
    briefing:
      "1980년 9월, 이라크가 이란을 침공하며 전쟁이 시작되어 1988년 유엔 결의 598호 수용으로 종결되었습니다. 개전 명분·배경에는 샤트알아랍 수로·국경 해석, 1979년 이란 이슬람혁명 이후 지역 안보 인식이 포함됩니다. 사망·부상 합계는 문헌마다 다르나 수십만~백만 명대 추정치가 제시되며, 화학무기 사용 등도 국제 조사·판결 기록에 남았습니다.",
  },
  {
    id: "tunb-islands-dispute-1971",
    title: "톰브·아부무사 제도 점령 (1971)",
    lens: "iran",
    coordinates: [55.27, 26.26],
    zoom: 8.5,
    pitch: 55,
    bearing: -20,
    historicalYear: 1971,
    locationName: "페르시아만 큰 톰브(Greater Tunb)",
    parties: ["IRN", "ARE"],
    radiusScale: 1.3,
    briefing:
      "1971년 11월 30일, 영국의 페르시아만 철군 일정에 맞춰 이란이 큰 톰브·작은 톰브(및 관련 조치로 아부무사)에 병력을 상륙·통제했습니다. 직후 성립한 아랍에미리트(UAE)는 영유권을 주장해 왔으며, 이란은 실효 지배를 유지하고 있습니다. 해협·도서 주권 문제는 양국·걸프 외교에서 반복되는 의제입니다.",
  },
  {
    id: "cambodian-vietnamese-war-1978",
    title: "베트남–캄보디아 전쟁 (1978–1979)",
    lens: "global",
    coordinates: [104.91, 11.55],
    zoom: 7,
    pitch: 45,
    bearing: 0,
    historicalYear: 1978,
    yearEnd: 1979,
    locationName: "캄보디아 프놈펜",
    parties: ["VNM", "KHM"],
    radiusScale: 2.0,
    briefing:
      "1978년 12월, 베트남군이 캄보디아(민주캄푸치아·크메르 루주)를 침공했습니다. 1979년 1월 프놈펜이 함락되고 친베트남 정권이 수립되었습니다. 선행 국경 교전과 크메르 루주 학살·외교 배치가 배경으로 정리됩니다. 이 개입은 1979년 중월전쟁의 직접 계기 중 하나로 널리 서술됩니다.",
  },
  {
    id: "eritrean-ethiopian-war-1998",
    title: "에티오피아–에리트레아 전쟁 (1998–2000)",
    lens: "global",
    coordinates: [37.94, 14.53],
    zoom: 7.5,
    pitch: 40,
    bearing: 5,
    historicalYear: 1998,
    yearEnd: 2000,
    locationName: "바드메(Badme) 일대",
    parties: ["ETH", "ERI"],
    radiusScale: 1.9,
    briefing:
      "1998년 5월 바드메 등 국경 지대 관할을 둘러싼 충돌이 전면전으로 확대되어 2000년 알제 협정으로 휴전했습니다. 참호전·대량 병력 투입이 특징이며, 사망자는 수만 명대 추정치가 제시됩니다. 국경 획정은 이후 중재·이행 과정을 거쳤고, 분쟁의 초점은 영토·주권·물류 접근에 있었습니다.",
  },
  {
    id: "sino-north-korean-border-clash-1969",
    title: "조·중 국경 긴장 (1960년대 말)",
    lens: "north_korea",
    coordinates: [128.05, 42.01],
    zoom: 7.5,
    pitch: 45,
    bearing: 0,
    historicalYear: 1969,
    locationName: "백두산(장백산) 일대 국경",
    parties: ["PRK", "CHN"],
    radiusScale: 1.5,
    note: "개별 교전의 시·공간 세부는 공개 1차 자료가 제한적이다. 중소 분열·문화대혁명기 조중 관계 악화와 국경 긴장 보도·연구를 반영한다.",
    briefing:
      "1960년대 말, 중소 분쟁과 중국 문화대혁명 국면에서 북한–중국 관계도 악화되었습니다. 연구·회고 자료는 국경 지대 긴장, 선전 공세, 소규모 마찰 보고를 언급하나, 전바오섬 규모의 공개 전면전으로 문서화된 단일 사건은 아닙니다. 1969년 중소 국경 교전과 같은 시기에 ‘혈맹’ 관계 안에서도 불신이 쌓였다는 점이 이 렌즈의 요지입니다.",
  },
  {
    id: "ussr-north-korea-maritime-friction-1980s",
    title: "북·소 통항·주권 마찰 (1980년대)",
    lens: "north_korea",
    coordinates: [130.65, 42.43],
    zoom: 8,
    pitch: 40,
    bearing: -10,
    historicalYear: 1985,
    locationName: "두만강 하구 · 동해 접경 해역",
    parties: ["PRK", "SUN"],
    radiusScale: 1.6,
    note: "특정 일자 해전이라기보다 냉전기 소련 태평양함대·통항·어업·영공 관련 주권 민감성이 반복된 구간을 대표 좌표로 둔다.",
    briefing:
      "냉전기 소련은 태평양 방면 해군·항공 활동을 확대했고, 북한은 영해·영공·기지 접근을 둘러싼 주권 민감성을 드러냈습니다. 공개 자료는 어업·통항·정보 수집 등에 대한 마찰·교섭 기록을 남기며, 단일한 1985년 ‘해전’으로 고정하기는 어렵습니다. 오늘날 러–북 군수 밀착과 대조되는, 종속 관계에 대한 경계 사례로 읽습니다.",
  },
] as const;

export function episodeLat(ep: FrictionEpisode): number {
  return ep.coordinates[1];
}

export function episodeLng(ep: FrictionEpisode): number {
  return ep.coordinates[0];
}

/** react-globe altitude ≈ f(MapLibre zoom) */
export function altitudeFromEpisodeZoom(zoom: number): number {
  return Math.max(0.38, Math.min(1.25, 5.5 / zoom));
}

export function lensForHub(hubId: AxisHubId): FrictionLens {
  if (hubId === "CHN") return "china";
  if (hubId === "RUS") return "russia";
  if (hubId === "IRN") return "iran";
  return "north_korea";
}

export function episodesForHub(
  hubId: AxisHubId,
  includeGlobal = true,
): FrictionEpisode[] {
  const lens = lensForHub(hubId);
  return FRICTION_EPISODES.filter(
    (e) => e.lens === lens || (includeGlobal && e.lens === "global"),
  );
}

export function frictionEpisodeById(id: string): FrictionEpisode | undefined {
  return FRICTION_EPISODES.find((e) => e.id === id);
}

export function hubColorForLens(lens: FrictionLens): string {
  if (lens === "china") return "rgba(230, 180, 34, 0.92)";
  if (lens === "russia") return "rgba(96, 165, 250, 0.92)";
  if (lens === "iran") return "rgba(16, 185, 129, 0.92)";
  if (lens === "north_korea") return "rgba(255, 0, 85, 0.92)";
  return "rgba(167, 139, 250, 0.9)";
}

/** 에피소드 좌표 주변 국소 전쟁구역 폴리곤 ([lng, lat] ring) */
export function frictionEpisodeWarGeometry(ep: FrictionEpisode): {
  type: "Polygon";
  coordinates: number[][][];
} {
  const lat = episodeLat(ep);
  const lng = episodeLng(ep);
  const halfLng = Math.max(0.28, 0.22 * ep.radiusScale);
  const halfLat = halfLng * 0.72;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - halfLng, lat - halfLat],
        [lng + halfLng, lat - halfLat],
        [lng + halfLng, lat + halfLat],
        [lng - halfLng, lat + halfLat],
        [lng - halfLng, lat - halfLat],
      ],
    ],
  };
}
