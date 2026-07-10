# Conflict View (GeoWatch)

3D 지구본 기반 지정학·분쟁 상황 대시보드입니다. Natural Earth 지형, GDELT 뉴스, 우크라이나 전선(VIINA), NEPTUN 공중 위협, 텔레그램 OSINT, 이스라엘 공습 경보 등을 한 화면에서 탐색할 수 있습니다.

- **스택:** Next.js 14 · React 18 · TypeScript · react-globe.gl · Three.js · Tailwind CSS
- **언어:** UI 기본 한국어 (`labelLanguage: "ko"`)
- **라이선스:** 프로젝트별 데이터 출처·이용 조건은 앱 내 「데이터 출처 · 라이선스」 패널 및 [`docs/copyright-checklist.md`](docs/copyright-checklist.md) 참고

---

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

포트가 이미 사용 중이면 기존 `next dev` 프로세스를 종료한 뒤 다시 실행하세요.

```bash
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint
```

---

## 환경 변수 (`.env.local`)

| 변수 | 기본 | 설명 |
|------|------|------|
| `API_STUB_MODE` | `true` | 서버 외부 API 호출 차단, 시드 JSON 사용 |
| `NEXT_PUBLIC_API_STUB_MODE` | `true` | 클라이언트 라이브 fetch·sync 비활성 |
| `NEXT_PUBLIC_DATA_PROFILE` | `lite` | `lite`(저사양) \| `full`(고해상도·데모) |
| `VIINA_RENDERING_ONLY` | `true` | VIINA ODbL 렌더링 전용 정책 |
| `NEXT_PUBLIC_NEPTUN_ENABLED` | — | `true` 시 NEPTUN 레이어 활성 |
| `NEXT_PUBLIC_TZEVA_ADOM_ENABLED` | — | `true` 시 이스라엘 공습 경보 레이어 활성 |
| `NEXT_PUBLIC_TELEGRAM_OSINT_ENABLED` | `true` | 텔레그램 OSINT 패널 |
| `TELEGRAM_USE_EMBED` | `true` | 공개 채널 embed 스크래핑 (로그인 불필요) |
| `NEWS_TRANSLATE_KO` / `TELEGRAM_TRANSLATE_KO` | `true` | 뉴스·텔레그램 자동 한국어 번역 |
| `FIRMS_MAP_KEY` | — | NASA FIRMS 키 (있으면 stub 무시하고 화재 라이브) |
| `GEM_DATA_DIR` | — | GEM 파이프라인 원본 경로 (`npm run gem:build`) |
| `OREF_HISTORY_URL` | — | 해외 IP용 Tzeva Adom 프록시 URL |

전체 목록: [`.env.local.example`](.env.local.example)

---

## 주요 기능

### 3D 지구본 · 지도

- **지도 스타일:** 야간 / 위성 / 지형 (`mapStyle`)
- **줌 LOD:** `global` → `continent` → `regional` → `near` → `village` 단계별 레이어·포인트 수 자동 조절
- **뷰포트 컬링:** 카메라 중심·고도 기준으로 보이는 데이터만 렌더
- **지역 탐색:** 상단 「충돌지역」「대륙간 갈등」「주요전선」 탭으로 fly-to
- **Intel 뉴스 시트:** GDELT·RSS 속보, 전장 필터, 기사 카드에서 지도 이동

### 레이어 패널 (≡ 햄버거 메뉴)

토글 가능 레이어는 **기본 OFF** (성능). 아래는 카테고리별 전체 목록입니다.

#### 지도 · 지명
| 레이어 | 설명 |
|--------|------|
| 도시명 | 주요 도시 라벨 (줌별 LOD) |
| 철도 | 철도 경로 글로우 |

#### 분쟁 · 영토
| 레이어 | 설명 |
|--------|------|
| **우크라이나 전선** | VIINA 기반 RU/UA 점령·경합 폴리곤, 전선 범례, 정착지 라벨 |
| **우크라 드론·미사일** | [NEPTUN](https://neptun.in.ua) 공중 위협·공습 경보 (UAV, 순항/탄도 미사일, KAB 등) |
| 지나간 드론·미사일 궤적 | 사라진 위협의 보존 이동 경로 (WebSocket delta 아카이브) |
| 영토 분쟁·긴장 지역 | 한반도·대만·남중국해 등 Natural Earth 분쟁 구역 |
| AI 전쟁지역 | GDELT·분쟁 데이터 휴리스틱 데모 (외부 AI API 없음) |
| 무기 금수 | UN 등 무기 금수 구역 |
| 분쟁 사건 | UCDP GED 검증 분쟁 사건 |
| 뉴스 · 전투·충돌 / 외교 긴장 / 동맹 갈등 / 시위 | GDELT Geo 2.0 위치 핀·히트맵 |
| **텔레그램 채널** | 중동·우크라이나 공개 채널 OSINT (70+ 채널, embed 수집) |
| **이스라엘 공습 경보** | Pikud HaOref Tzeva Adom (경보 지역·히스토리) |

#### 에너지 · 자원
기름 파이프 · 가스관 · LNG 터미널 · 광물·자원지 · 원자력 시설 (GEM·정적 빌드)

#### 운송 · 통신
항로 · 해저 케이블 · 공항 · 항구 · 인터넷 교환점 · **선박 위치 (AIS)**

#### 군사 · 안보
미군 기지 · **군사 항공기 (adsb.fi)** · 정보 수집 거점 · 난민 캠프 · **미 해군 항공모함** (갑판 실루엣 마커)

#### 실시간 · 사건
위성 화재 (NASA FIRMS) · 사이버 공격 · 선거 사건 · 우주 발사 (Launch Library 2)

#### 경제 · 제재
경제 중심지 · AI 데이터센터 · 제재 대상 (OFAC·UN·EU·UK)

---

## 신규·핵심 모듈 상세

### VIINA — 우크라이나 전선

- **데이터:** VIINA (ODbL) — **렌더링 전용**, 공개 API/export 금지
- **API:** `GET /api/render/ukraine-control` (화면 출력용 가공 데이터만)
- **UI:** 전선 폴리곤, 개요/상세 LOD, `UkraineFrontLegend`, 클릭 시 정착지 정보
- **빌드:** `npm run viina:build` / `npm run viina:build:full`
- **정책:** [`docs/copyright-checklist.md`](docs/copyright-checklist.md) · `src/lib/licensing/viinaPolicy.ts`

### NEPTUN — 우크라이나 드론·미사일

- **소스:** [neptun.in.ua](https://neptun.in.ua) 공개 API + WebSocket
- **위협 유형:** UAV(샤헤드), 정찰, 순항 미사일, **탄도 미사일**, KAB, MiG-31K
- **API:** `GET /api/neptun` (REST 폴링 ≤5초, stub 시 `public/data/*/neptun-seed.json`)
- **클라이언트:** `useNeptunStream` — live WS / stub 2분 폴링, remove 시 아카이브 보존
- **렌더:** 줌 LOD별 궤적 모드 — `flat`(개요) / `low`(저고도) / `elevated`(상세·예측 항로)
- **UI:** `NeptunLayerPanel`(햄버거 내 경보·트랙 목록), `NeptunThreatDetailPanel`(우측 상세), 한글 유형명·Google 번역
- **최적화:** 뷰포트 필터, 궤적 점 수 제한·캐시, 카메라 이동 중 path 갱신 스킵

관련 파일:

```
src/lib/neptun.ts
src/lib/neptunLod.ts
src/lib/neptunTracks.ts
src/lib/neptunFlightArc.ts
src/lib/neptunDisplay.ts
src/hooks/useNeptunStream.ts
src/components/NeptunLayerPanel.tsx
src/components/NeptunThreatDetailPanel.tsx
public/data/lite/neptun-seed.json
public/data/neptun-seed.json
```

### Telegram OSINT

- **채널 목록:** `src/data/telegramChannels.ts` — 중동 30+ · 우크라이나 40+ 공개 채널
- **수집:** embed 스크래핑 (기본) 또는 Telethon (`scripts/telegram-osint/`)
- **API:** `/api/telegram-alerts`, `/api/telegram-alerts/sync`, `/api/telegram-alerts/ingest`
- **UI:** `TelegramOsintPanel` — **LLM·뉴스 파이프라인과 완전 분리** (정책: `telegramOsintPolicy.ts`)

### Tzeva Adom — 이스라엘 공습 경보

- **소스:** Pikud HaOref AlertsHistory (비공식 JSON)
- **API:** `GET /api/tzeva-adom` (기본 3초 폴링)
- **UI:** `TzevaAdomPanel`, 지도 마커·히스토리

### GDELT 뉴스 · Intel

- **API:** `GET /api/gdelt` (전투·외교·사이버·선거 테마)
- **스트림:** `GET /api/news-stream` (RSS·번역)
- **UI:** `GdeltAlertPanel`, `RegionNewsPanel`, `BottomIntelStack`

### 기타 실시간 레이어

| API | 내용 |
|-----|------|
| `/api/ais` | AISstream 선박 위치 프록시 |
| `/api/adsb-mil` | adsb.fi 군용기 |
| `/api/firms-fires` | NASA FIRMS 화재 (뷰포트 bbox) |
| `/api/us-carriers` | 미 해군 항공모함 위치 |
| `/api/space-launches` | Launch Library 2 |
| `/api/intel-hotspots` | 설정 가능 GeoJSON 핫스팟 |
| `/api/stock-tickers` | Yahoo Finance 티커 스트립 |
| `/api/data-sync` | 스냅샷 동기화 상태·트리거 |

### 정적·캐시 레이어 API

`/api/layers/conflict-zones` · `arms-embargo-zones` · `ai-data-centers` · `economic-centers` · `sanctions-entities` · `ukraine-control`

---

## 성능 · 최적화 정책

| 항목 | 동작 |
|------|------|
| **stub 모드** | 외부 API 대신 `public/data/*-seed.json` · 프로필 JSON 사용 |
| **lite / full** | `NEXT_PUBLIC_DATA_PROFILE` — 지오메트리·이벤트 밀도 분리 |
| **레이어 기본 OFF** | `layerPrefs` v17 — NEPTUN 등 무거운 레이어는 사용자가 켤 때만 fetch |
| **뷰포트 LOD** | NEPTUN·VIINA·정적 포인트 — tier별 최대 개수·반경 |
| **NEPTUN fetch** | 우크라 극동부 뷰 또는 전선 레이어 ON 시에만 |
| **궤적 렌더** | 모드별 점 budget(6~14), elevated 캐시, path 애니메이션 OFF |

---

## 데이터 프로필 · 빌드 스크립트

### 프로필

- `public/data/lite/` — 노트북·개발용 경량 JSON
- `public/data/full/` — 고해상도·데모용

`dataPath("app-data.json")` → `/data/{profile}/app-data.json`

### 자주 쓰는 명령

```bash
# GDELT 수집 + 앱 데이터
npm run gdelt:fetch
npm run data:build:lite
npm run data:build:full
npm run data:refresh          # GDELT + full 빌드

# GEM 에너지 레이어
npm run gem:build

# VIINA 우크라이나
npm run viina:build
npm run viina:build:full

# 라이브 스냅샷 동기화
npm run data:sync
npm run data:sync:full

# 텔레그램 (선택)
npm run telegram:sync
npm run dev:live              # dev + 텔레그램 동기화

# 해안선·국경·정적 extras
npm run coastlines:build
npm run borders:build
npm run static:build
```

---

## 프로젝트 구조

```
src/
  app/                    # Next.js App Router
    api/                  # REST API 라우트 (39개)
    page.tsx              # 메인 대시보드
  components/
    GlobeDashboard.tsx    # 지구본·레이어·패널 통합
    NeptunLayerPanel.tsx
    NeptunThreatDetailPanel.tsx
    UkraineFrontLegend.tsx
    TelegramOsintPanel.tsx
    TzevaAdomPanel.tsx
    LayerCategoryPanel.tsx
    ...
  hooks/
    useNeptunStream.ts
    useLayerPrefsController.ts
    useDataSync.ts
    ...
  lib/
    neptun*.ts            # NEPTUN 타입·LOD·궤적·표시
    viinaLod.ts
    layerPrefs.ts         # localStorage 레이어 설정 (v17)
    globeLod.ts
    apiStubMode.ts
    licensing/            # VIINA·Telegram 정책
    news/                 # RSS·번역 파이프라인
  data/
    telegramChannels.ts   # OSINT 채널 카탈로그
    sourceCatalog.ts      # 레이어별 출처 메타
    navRegions.ts         # 지역 탐색 프리셋
public/
  data/                   # lite / full / live / 시드 JSON
scripts/                  # 데이터 빌드·동기화·VIINA·텔레그램
docs/
  copyright-checklist.md
  us-carrier-deck-icon.md
IRONSIGHT/                # 참고용 별도 OSINT 대시보드 (Nobler Works, MIT)
```

---

## UI 조작 요약

| 동작 | 결과 |
|------|------|
| 드래그 / 스크롤 | 지구본 회전 · 줌 |
| 빈 바다 더블클릭 | 해당 지점 확대 |
| 분쟁 구역·뉴스 핀 클릭 | fly-to + Intel 시트 |
| NEPTUN 트랙 클릭 | 해당 위치 이동 + 우측 상세 패널 |
| 우크라 전선 ON | 하단 UI 전선 모드, 우크라이나 범례 |
| NEPTUN ON | 우크라이나(49°N, 32°E) 자동 fly-to |
| ≡ 메뉴 | 레이어 · 출처 · 도움말 · 주요전선 |
| 중클릭 (빈 지도) | Intel 뉴스 시트 열기 |

---

## 법적·데이터 주의

- **VIINA:** ODbL 렌더링 전용 — GeoJSON export·공개 API 금지. 출처 표기 필수.
- **NEPTUN:** 비공식 정보 피드 — 공식 경보 시스템 대체 불가.
- **Telegram OSINT:** 공개 채널만. AI 요약 컨텍스트에 **포함하지 않음**.
- **GDELT·UCDP·FIRMS·adsb.fi 등:** 각 제공자 이용 약관·attribution 준수.

상세: [`docs/copyright-checklist.md`](docs/copyright-checklist.md)

---

## IRONSIGHT 서브프로젝트

[`IRONSIGHT/`](IRONSIGHT/) — Nobler Works의 Leaflet 기반 OSINT 대시보드 참고 구현체입니다. 중동/우크라이나 전장 토글, 텔레그램 카탈로그 등의 아이디어 출처로 포함되어 있으며, 메인 앱(`src/`)과는 별도 실행입니다.

---

## 개발 메모

- Windows·OneDrive 경로에서는 `next.config.mjs`가 dev 시 webpack 메모리 캐시를 사용합니다 (청크 404 방지).
- `npm run dev:clean` — `.next` 삭제 후 dev 재시작.
- 레이어 설정은 브라우저 `localStorage` 키 `geowatch-layers-v17`에 저장됩니다.
- TypeScript·ESLint는 Next.js 기본 설정을 따릅니다.

---

## 크레딧 · 데이터 출처 (요약)

Natural Earth · GDELT · VIINA (ODbL) · NEPTUN · Global Energy Monitor · TeleGeography · OurAirports · NGA WPI · UCDP · NASA FIRMS · adsb.fi · Pikud HaOref · Telegram 공개 채널 · Wikidata / OpenStreetMap · OFAC / UN / EU 제재 목록

앱 내 「데이터 출처 · 라이선스」 패널에서 레이어별 상세 attribution을 확인할 수 있습니다.
