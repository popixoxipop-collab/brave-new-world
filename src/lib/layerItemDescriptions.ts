/** 레이어 토글 호버용 한 줄 설명 (한국어) */
export const LAYER_ITEM_DESCRIPTIONS: Partial<Record<string, string>> = {
  "city-labels": "켜면 주요 도시의 이름이 지도 위에 표시됩니다.",
  rail: "켜면 주요 철도망이 지도에 빛으로 표시됩니다.",
  ukraine: "켜면 우크라이나 전선의 점령·접촉선 상황을 볼 수 있습니다.",
  neptun:
    "켜면 우크라이나를 향하는 러시아 드론·미사일의 실제 궤적을 볼 수 있습니다.",
  "neptun-previous-trails":
    "켜면 이전에 관측된 드론·미사일 궤적 잔상을 함께 볼 수 있습니다.",
  disputes: "켜면 전쟁·외교 긴장 구역을 표시합니다.",
  "war-zones": "켜면 실전투·폭격급 전쟁구역을 빨간 빗금 상자로 표시합니다.",
  "diplomatic-tension": "켜면 외교적 긴장구역을 주황 빗금 상자로 표시합니다.",
  "conflict-zones":
    "켜면 분쟁+GDELT 밀도로 추정한 전쟁지역 데모(외부 AI API 없음)를 표시합니다.",
  "arms-embargo": "켜면 무기 금수 조치가 적용된 구역을 표시합니다.",
  ucdp: "켜면 무력 충돌 사건(UCDP) 위치를 점으로 표시합니다.",
  "gdelt-war": "켜면 전투·군사 충돌 관련 뉴스 위치를 표시합니다.",
  "gdelt-diplomatic": "켜면 외교·회담 관련 뉴스 위치를 표시합니다.",
  "gdelt-alliance": "켜면 동맹·협력 관련 뉴스 위치를 표시합니다.",
  "gdelt-protest": "켜면 시위·사회 불안 관련 뉴스 위치를 표시합니다.",
  "telegram-osint": "켜면 공개 텔레그램 채널의 실시간 OSINT 알림을 표시합니다.",
  "tzeva-adom": "켜면 이스라엘 공습 경보(체바 아돔) 발생 지역을 표시합니다.",
  "oil-pipelines": "켜면 주요 원유 파이프라인 노선을 표시합니다.",
  "gas-pipelines": "켜면 주요 천연가스 파이프라인 노선을 표시합니다.",
  "lng-terminals": "켜면 LNG 수출입 터미널 위치를 표시합니다.",
  resources: "켜면 주요 천연자원·광물 관련 거점을 표시합니다.",
  nuclear: "켜면 원자력 발전소·관련 시설 위치를 표시합니다.",
  shipping: "켜면 주요 해상 운송 항로를 표시합니다.",
  cables: "켜면 해저 통신 케이블 경로를 표시합니다.",
  airports: "켜면 주요 공항 위치를 표시합니다.",
  ports: "켜면 주요 항만 위치를 표시합니다.",
  ixp: "켜면 인터넷 교환점(IXP) 위치를 표시합니다.",
  "logistics-risk": "켜면 물류·공급망 리스크가 큰 거점을 표시합니다.",
  ais: "켜면 실시간 선박 위치(AIS)를 지도에 표시합니다.",
  "military-bases": "켜면 주요 군사기지 위치를 표시합니다.",
  "military-air": "켜면 군사 항공기 활동(ADS-B)을 표시합니다.",
  intel: "켜면 주목할 인텔 핫스팟 위치를 표시합니다.",
  refugee: "켜면 난민 캠프·대규모 인구 이동 관련 지점을 표시합니다.",
  firms:
    "켜면 위성 열감지(화재·폭발 징후)를 표시합니다. 원인(산불/전투/훈련)은 미분류이며, 분쟁·전선과 겹쳐도 전투/훈련 미구분으로만 표시합니다.",
  cyber: "켜면 사이버 공격·침해 관련 사건 위치를 표시합니다.",
  election: "켜면 선거·정치 리스크와 관련된 사건 위치를 표시합니다.",
  space: "켜면 우주 발사·관련 활동 위치를 표시합니다.",
  economic: "켜면 주요 경제·금융 중심지 위치를 표시합니다.",
  "ai-dc": "켜면 AI·데이터센터 관련 거점 위치를 표시합니다.",
  sanctions: "켜면 제재 대상 국가·기업과 관련된 지점을 표시합니다.",
};

export function getLayerItemDescription(itemId: string): string | undefined {
  return LAYER_ITEM_DESCRIPTIONS[itemId];
}
