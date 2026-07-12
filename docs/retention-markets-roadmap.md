# 재방문 · 시장 해석 로드맵 (추후 설계)

> **상태:** P0 일부 구현 — `theaterAssets` · watchlist(localStorage) · Yahoo 딥링크 · 「오늘 핫한 곳」규칙 기반 3줄 · 투자 권유 아님 고지. TradingView 임베드·증권 딥링크·일일 cron은 미구현.  
> **포지션:** 매매 앱이 아니라 **지정학/초크포인트 → 시장 리스크 해석기**  
> **관련:** `src/lib/theaterAssets.ts` · `src/lib/watchlistPrefs.ts` · `src/lib/news/todayBriefing.ts` · `IntelRelatedMarketsPanel` · `heroHighlightSymbols`

---

## 1. 한 줄 포지션

투자를 “직접” 붙인다고 방문이 꾸준해지지 않는다.  
사람은 **여기서 뭘 결정하나**에 다시 온다 → **내 전장/허브 + 오늘 핫한 곳 + (선택) 관련 심볼 해석**.

---

## 2. 현실적으로 가능한 것 / 과한 것

### 해도 됨 (초기~중기)

| 항목 | 설명 |
|------|------|
| 공개/준공개 시세 | 이미 Yahoo류 (`/api/stock-tickers`). 관심종목 watchlist 확장 |
| TradingView 위젯 | 차트 임베드 — **제휴·이용약관 확인 후**. 주문 아님 |
| 전장·초크포인트 → 심볼 매핑 | 해석용 테이블. “사라”가 아니라 “관련 자산 후보” |
| 증권/토스 딥링크 | “관련 자산 보기”로 외부 앱 열기 (제휴 가능 시) |

### 초기엔 하지 말 것

| 항목 | 이유 |
|------|------|
| 앱 내 주문·계좌 연동 | 증권사 제휴·라이선스·규제 비용 |
| 유명 투자 앱 API 무단 연동 | 심사·계약 없이 불가에 가까움 |
| 매매 추천 카피 | 규제·신뢰·브랜드 리스크 |

---

## 3. 재방문 레버 (투자 API보다 우선)

우선순위 높은 것부터.

### 3.1 내 허브 / 전장 저장

- localStorage (또는 로그인 전제 시 서버): `preferredTheater` · `preferredEconHub` · `watchSymbols[]`
- 부팅 시: 저장 지역 fly-to + 관련 심볼 스트립 하이라이트
- 기존: ModePicker / viewPackages theater·hub 선택과 연결 가능

### 3.2 하루 1회 “오늘 핫한 곳” 브리핑

- 입력: GDELT/RSS 히어로 · FIRMS/경보 신호 · (추후) news-digest
- 출력: 맵 카메라 프리셋 1개 + **3줄** (사람이 쓰거나 LLM digest)
- 갱신: cron / `data:sync` 1일 1회
- UI: 입장 후 또는 벨 옆 “Today” 칩

### 3.3 사운드 = 옵션, 조용한 기본

- 기본: 음소거 또는 매우 낮은 ambient (이미 벨·입장 주의창 있음)
- SNS용 “살벌한 소리”는 **명시적 opt-in** 유지
- 재방문 UX는 조용한 맵이 담당

### 3.4 관련 자산 보기 (후순위 딥링크)

- 심볼 클릭 → TradingView 심볼 URL 또는 국내 증권/토스 검색 딥링크
- 카피: 「외부에서 보기 · 투자 권유 아님」

---

## 4. 전장 → 심볼 매핑 (해석 테이블)

기존 `STOCK_TICKER_SYMBOLS` / `heroHighlightSymbols`를 **명시적 테이블**로 승격.

```ts
// 추후: src/lib/theaterAssets.ts (예시)
type TheaterAssetMap = Record<
  string, // NewsTheater | chokepoint id
  { symbols: string[]; noteKo: string; noteEn: string }
>;
```

예시 방향:

| 키 | 심볼 예 | 노트 |
|----|---------|------|
| middle-east / hormuz | CL=F, BZ=F, 에너지 ETF | 해상 초크·원유 민감 |
| china-taiwan | 반도체·운임 관련 | 물류·칩 서플라이 |
| russia-ukraine | 곡물·유럽 가스 민감 심볼 | 해석용, 추천 아님 |
| global | VIX, 달러·금 | 매크로 스트레스 |

UI: Intel 관련 시장 패널 · 경제 허브 패널에 “왜 이 심볼?” 한 줄.

---

## 5. TradingView · 시세

| Phase | 내용 |
|-------|------|
| 지금 | Yahoo 티커 스트립 + 전장 하이라이트 |
| P1 | watchlist (localStorage) |
| P2 | 심볼 상세에 TradingView embed (약관 OK 시) |
| P3 | theaterAssets 노트 + digest `relatedSymbols` 연결 |

---

## 6. LLM과의 경계

- 요약·전장 태그·(선택) relatedSymbols → [llm-news-digest.md](./llm-news-digest.md)
- 심볼 매핑의 **정본**은 코드 테이블 (LLM이 심볼을 “발명”하지 않게)
- digest의 symbols는 테이블 ∩ 기사 근거만

---

## 7. 소액 수익과의 연결 (참고)

트래픽 검증 후:

- 주간 브리핑(맵 스냅샷 + 3줄) 소액 / 후원
- 스폰서·임베드 협업
- **매매 중개 수수료는 후순위·계약 전제**

상세 수익화는 README가 아니라 운영 메모로 분리 유지.

---

## 8. 비목표

- Conflict View = 증권 앱
- 푸시로 매수 타이밍 알림
- Telegram 기반 자동 트레이딩 시그널

---

## 9. 수용 기준 (재방문)

- [ ] 재방문 시 저장된 전장/허브로 복귀
- [ ] “오늘 핫한 곳”이 24h 내 갱신되거나 stale 표시
- [ ] 기본 세션이 무음/저음으로도 사용 가능
- [ ] 심볼 UI에 투자 권유 아님 고지
