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
  "gdelt-alliance": "켜면 서방 동맹 마찰·IRN·중·러·북 축 관계 뉴스 위치를 표시합니다.",
  "gdelt-protest": "켜면 시위·사회 불안 관련 뉴스 위치를 표시합니다.",
  "axis-network":
    "켜면 이란·중국·러시아·북한 중심 외교·군수·하이브리드 관계망(스포크 포함)을 호로 표시합니다.",
  "telegram-osint": "켜면 공개 텔레그램 채널의 실시간 OSINT 알림을 표시합니다.",
  "tzeva-adom": "켜면 이스라엘 공습 경보(체바 아돔) 발생 지역을 표시합니다.",
  "oil-pipelines": "켜면 주요 송유관 노선을 표시합니다.",
  "gas-pipelines": "켜면 주요 천연가스 파이프라인 노선을 표시합니다.",
  "lng-terminals": "켜면 LNG 수출입 터미널 위치를 표시합니다.",
  resources: "켜면 주요 천연자원·광물 관련 거점을 표시합니다.",
  nuclear: "켜면 원자력 발전소·관련 시설 위치를 표시합니다.",
  shipping: "켜면 주요 해상 운송 항로를 표시합니다.",
  cables: "켜면 주요 해저 통신 케이블 경로를 표시합니다.",
  tunnels:
    "켜면 주요 해저터널(유로터널·세이칸 등)을 클라우드 로그에서 불러와 표시합니다. 토글 시에만 조회합니다.",
  airports: "켜면 주요 공항 위치를 표시합니다.",
  ports: "켜면 주요 항만 위치를 표시합니다.",
  ixp: "켜면 인터넷 교환점(IXP) 위치를 표시합니다.",
  "logistics-risk": "켜면 물류·공급망 리스크가 큰 거점을 표시합니다.",
  "critical-nodes":
    "켜면 Critical Node Atlas(MIT) 기반 해상·케이블·에너지·금융·기술 병목을 표시합니다.",
  ais: "켜면 AIS 선박을 표시합니다. 지정학=군용 함정, 지경학=민간 화물·탱커·여객선.",
  "military-bases": "켜면 주요 군사기지 위치를 표시합니다.",
  "air-traffic":
    "켜면 민간 항공기 운항(ADS-B)을 표시합니다. 군용은 제외하며 지경학 모드 경제활동 레이어입니다.",
  "military-air":
    "켜면 군사 항공기(ADS-B)가 기종별 탑다운 실루엣(전투기·헬기·폭격기·급유기 등)으로 표시됩니다. 클릭하면 상세.",
  intel: "켜면 주목할 인텔 핫스팟 위치를 표시합니다.",
  refugee: "켜면 난민 캠프·대규모 인구 이동 관련 지점을 표시합니다.",
  firms:
    "켜면 NASA FIRMS 열감지를 표시합니다. 전쟁 뉴스 핀 근처는 폭격·화재 추정으로 펄스·사운드가 납니다.",
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
