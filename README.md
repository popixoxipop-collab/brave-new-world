# Conflict View (GeoWatch)

3D 지구본 기반 **지정학 · 지경학** 대시보드입니다. Natural Earth 지형, GDELT 뉴스, 우크라이나 전선(VIINA), NEPTUN 공중 위협, 텔레그램 OSINT, 이스라엘·우크라 공습 경보, 시장·물류 레이어를 한 화면에서 탐색할 수 있습니다.

- **스택:** Next.js 14 · React 18 · TypeScript · MapLibre GL · react-map-gl · Tailwind CSS
- **언어:** UI 기본 한국어 · 레이어 패널에서 **English** 전환 (`labelLanguage`) — 호버·범례·aria 포함
- **입장 UX:** 첫 진입 시 「반드시 읽어주세요」주의 창(성능·사운드 안내 + 벨 토글) → 환영 편지 → 도메인/모드 선택
- **출처 표기 의무:** [출처 표기 · 라이선스 공개 의무](#출처-표기--라이선스-공개-의무) · 앱 UI 「출처」 패널 · [`docs/copyright-checklist.md`](docs/copyright-checklist.md)

---

## 최근 추가·변경 요약

아래는 마지막 릴리스 커밋(`Ship dual viewer…`) 이후 작업 범위입니다.

### 입장 · UX
| 항목 | 내용 |
|------|------|
| `EntryCautionOverlay` | 첫 진입 「**반드시 읽어주세요**」 — 성능 상한·사운드 언제 나는지·벨 토글 |
| `WelcomeParchmentLetter` · `DomainGateOverlay` | 편지·도메인 게이트 문구/흐름 정리 |
| `SoundMuteControl` | 벨 on/off (입장 창·패널·고정 UI) |
| Ultra-Lite | `ultraLiteMode.ts` · 레이어 「클릭 주의」태그 (`LayerCategoryDraftHost`) |
| `layerExclusiveCap` | UI 동시 ON 상한 (일반 / Ultra-Lite) · 패키지 hard cap |

### 언어 · 호버
| 항목 | 내용 |
|------|------|
| `hoverLabels.ts` · `uiStrings.ts` | EN 모드 호버 카드·툴팁·범례·aria |
| HoverHint / MapLegend / Ukraine·Dispute 범례 | 영문 스와치·detail |
| ExplorationTabs `variant` | 허브/전선 스타일이 한글 라벨에 묶이지 않음 |

### 사운드
| 항목 | 내용 |
|------|------|
| `audioManifest.ts` | 전투·공습 **로컬 wav/mp3** · 긴장/경제/UI **Freesound ID 고정** |
| `public/audio/` | Mega Siren · combat-* 샘플 + [`README.md`](public/audio/README.md) |
| `SoundEffectsBridge` | 공습=버튼만 · 전선/긴장/항모 · 경제 파이프>DC>항구>건설 |
| `airRaidFocus.ts` · `UkraineAirRaidPanel` | fly 고도 2.0 · 지역 아웃라인 · 사이렌 10초 |
| `soundDistanceScale` · `soundPrefs` · `useSoundEnabled` | 줌 볼륨 cap · 음소거 저장 |
| `/api/sound-stream` | localSrc 우선 · Freesound 프록시 · 캐시 버스트 |

### 지도 · 전선 · 분쟁
| 항목 | 내용 |
|------|------|
| `ukraineFrontPaths.ts` | 면 채움·전투 링 제거 → **경계선·빗금·진격** |
| 전쟁구역 / 외교적 긴장구역 | 레이어 분리 토글 · `disputeHatch` 등급 |
| `theaterCombat.ts` | 우크라·중동·대만·한반도 교전 전장 bbox (사운드·콜아웃 공용) |
| 상황 콜아웃 시드 | `ukraineSituationSeed` · `asiaSituationSeed` · `middleEastSituationSeed` · `situationCalloutTypes` |
| `ukraineAlertZones.ts` | 우크라 공습 구역 매칭 |

### 성능 · 데이터 로딩
| 항목 | 내용 |
|------|------|
| `cameraBusyGuard` | 카메라 tween/드래그 중 무거운 갱신·티커 pause |
| `liveRenderGuard` · `liveSwitchGate` · `streamIngestGuard` | stub off 시 폴링·라이브 상한 보수화 |
| `disputeHatchCache` | 분쟁 빗금 경로 캐시 |
| `fetchJsonPreferGzip` · `compress-data-gzip.js` | `.json.gz` 우선 fetch · 정적 gzip 사이드카 빌드 |
| `jsonParseWorkerClient` · `src/workers/jsonParse.worker.ts` | 대용량 JSON 워커 파싱 |
| `MapGlobeView` · `useGlobeStaticLayers` · `viinaLod` | LOD·컬링·렌더 부담 완화 |
| FIRMS | `firmsSoundClassify` · 전투 열감지 교차 · 사운드 연동 |

### 기타
| 항목 | 내용 |
|------|------|
| `ViewModeSwitcher` · `viewPackages` | 지정학/지경학 패키지·하단 Intel |
| Telegram `auth_common.py` | OSINT 인증 공통 정리 |
| `.env.local.example` | `FREESOUND_API_KEY` · stub/live 가드 주석 |

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
| `API_STUB_MODE` | `true` | 서버·클라이언트 stub 정책 (외부 API 차단, 시드 JSON). `page.tsx`가 클라이언트에 주입 |
| `DATA_PROFILE` | `lite` | `lite`(저사양) \| `full`(고해상도·데모). 서버 전용 — `NEXT_PUBLIC_` 사용 금지 |
| `VIINA_RENDERING_ONLY` | `true` | VIINA ODbL 렌더링 전용 정책 |
| `NEPTUN_ENABLED` | — | `true` 시 NEPTUN 레이어·API 활성 |
| `TZEVA_ADOM_ENABLED` | — | `true` 시 이스라엘 공습 경보 레이어 활성 |
| `TELEGRAM_OSINT_ENABLED` | `true` | 텔레그램 OSINT 패널 |
| `FREESOUND_API_KEY` | — | 앰비언트·경제·부가 사운드 HQ mp3 프록시 (`/api/sound-stream`) |
| `SYNC_POLL_MS` | `300000` | `/api/data-sync` 폴링 간격(ms) |
| `TELEGRAM_USE_EMBED` | `true` | 공개 채널 embed 스크래핑 (로그인 불필요) |
| `NEWS_TRANSLATE_KO` / `TELEGRAM_TRANSLATE_KO` | `true` | 뉴스·텔레그램 자동 한국어 번역 |
| `FIRMS_MAP_KEY` | — | NASA FIRMS 키 (있으면 stub 무시하고 화재 라이브) |
| `GEM_DATA_DIR` | — | GEM 파이프라인 원본 경로 (`npm run gem:build`) |
| `OREF_HISTORY_URL` | — | 해외 IP용 Tzeva Adom 프록시 URL |

전체 목록: [`.env.local.example`](.env.local.example)

> **보안:** `NEXT_PUBLIC_` 접두사 변수는 브라우저 번들에 포함됩니다. API 키·운영 플래그는 접두사 없이 서버 전용으로 두고, 클라이언트는 `src/lib/serverEnv.ts` → `page.tsx` → `initRuntimeConfig()` 경로로만 설정을 받습니다.

---

## 주요 기능

### 뷰어 모드 (지정학 · 지경학)

| 모드 | 초점 |
|------|------|
| **지정학** | 전선·분쟁·GDELT·Telegram OSINT·공습 경보·전투 사운드 |
| **지경학** | 증시 티커·경제 RSS·파이프라인·항구·데이터센터 앰비언트 |

상단 스위치로 전환하면 레이어 패키지·nav·하단 Intel이 함께 바뀝니다. Ultra-Lite 옵션은 동시 ON 레이어 상한을 더 낮춥니다.

### 3D 지구본 · 지도

- **베이스맵:** Carto Dark Matter 단일 (레이어 가독용 다크 벡터)
- **줌 LOD:** `global` → `continent` → `regional` → `near` → `village` 단계별 레이어·포인트 수 자동 조절
- **뷰포트 컬링:** 카메라 중심·고도 기준으로 보이는 데이터만 렌더
- **지역 탐색:** 상단 「충돌지역」「대륙간 갈등」「주요전선 / 주요 허브」 탭으로 fly-to
- **Intel 뉴스 시트:** GDELT·RSS 속보, 전장 필터, 기사 카드에서 지도 이동

### 레이어 패널 (≡ 햄버거 메뉴)

토글 가능 레이어는 **기본 OFF** (성능). 아래는 카테고리별 전체 목록입니다.  
부하가 큰 레이어에는 Ultra-Lite에서 **「클릭 주의」** 태그가 붙습니다.

#### 지도 · 지명
| 레이어 | 설명 |
|--------|------|
| 도시명 | 주요 도시 라벨 (줌별 LOD) |
| 철도 | 철도 경로 글로우 |

#### 분쟁 · 영토
| 레이어 | 설명 |
|--------|------|
| **우크라이나 전선** | VIINA 기반 RU/UA 점령·주장 **경계선·빗금** (면 채움 제거), 전선 범례 |
| **우크라 드론·미사일** | [NEPTUN](https://neptun.in.ua) 공중 위협·공습 경보 (UAV, 순항/탄도 미사일, KAB 등) |
| 지나간 드론·미사일 궤적 | 사라진 위협의 보존 이동 경로 (WebSocket delta 아카이브) |
| **전쟁구역 / 외교적 긴장구역** | 분쟁 빗금 박스 — 레이어 분리 토글 |
| AI 전쟁지역 | GDELT·분쟁 데이터 휴리스틱 데모 (외부 AI API 없음) |
| 무기 금수 | UN 등 무기 금수 구역 |
| 분쟁 사건 | UCDP GED 검증 분쟁 사건 |
| 뉴스 · 전투·충돌 / 외교 긴장 / 동맹 갈등 / 시위 | GDELT Geo 2.0 위치 핀·히트맵 |
| **텔레그램 채널** | 중동·우크라이나 공개 채널 OSINT (70+ 채널, embed 수집) |
| **이스라엘 공습 경보** | Pikud HaOref Tzeva Adom (경보 지역·히스토리) |
| **우크라 공습 경보** | NEPTUN 기반 지역 칩 · 버튼 fly 시 사이렌 |

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

## 사운드 시스템

지휘소 매니페스트: [`src/data/audioManifest.ts`](src/data/audioManifest.ts) · 로컬 파일: [`public/audio/`](public/audio/) · 프록시: `GET /api/sound-stream?eventId=…`

### 재생 규칙 (체크박스 ≠ 즉시 재생)

| 소리 | 트리거 |
|------|--------|
| **공습 사이렌** (이스라엘 / 우크라) | 경보 칩·버튼으로 지역 fly 할 때만 (~10초, 로컬 Mega Siren) |
| **NEPTUN 폭발 · FIRMS 폭격 추정** | 해당 레이어 ON + 이벤트가 **뷰포트에 들어올 때** (로컬 combat wav) |
| **전선 교전음 + 포격 베드** | 지정학 · 전장 위 · regional 이하 줌 |
| **긴장 rumble** | 전쟁/고긴장 구역 위 (전선보다 낮은 우선순위) |
| **항모 갑판** | 미 항모가 화면에 있을 때 |
| **경제 앰비언트** | 지경학 · 레이어 우선순위: 파이프라인 → 데이터센터 → 항구 → 경제중심 |
| 티커 · 모드 전환 · 일반 UI 클릭 | **무음** (의도적으로 차단) |

벨 버튼으로 전역 음소거 가능. 입장 주의 창에도 동일 안내가 있습니다.

### 소스 정책

- **전투·공습:** `public/audio/*.wav|mp3` 로컬 고정 (`localSrc`) — Freesound 텍스트 검색 오매칭 방지
- **긴장·항모·경제·UI:** 큐레이션된 **`freesoundId` 고정** (검색은 ID 실패 시에만 폴백)
- 상세 ID 표: [`public/audio/README.md`](public/audio/README.md)

---

## 언어 · 호버 UX

- 레이어 패널 **KO / EN** → `labelLanguage`
- English 모드에서 HoverHint·글로브 호버 카드·path 툴팁·범례 스와치·주요 aria가 영문으로 전환
- 문자열: [`src/lib/uiStrings.ts`](src/lib/uiStrings.ts) · [`src/lib/hoverLabels.ts`](src/lib/hoverLabels.ts)

---

## 신규·핵심 모듈 상세

### VIINA — 우크라이나 전선

- **데이터:** VIINA (ODbL) — **렌더링 전용**, 공개 API/export 금지
- **API:** `GET /api/render/ukraine-control` (화면 출력용 가공 데이터만)
- **UI:** 점령·주장 **테두리·빗금·진격 화살**, `UkraineFrontLegend` (면 채움·전투 링 제거)
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

### Tzeva Adom · 우크라 공습 경보

- **이스라엘:** Pikud HaOref · `GET /api/tzeva-adom` · `TzevaAdomPanel`
- **우크라:** NEPTUN 경보 구역 · `UkraineAirRaidPanel` · `ukraineAlertZones.ts`
- 칩/버튼 fly → 지역 아웃라인 포커스 + **로컬 공습 사이렌** (`airRaidFocus.ts`)

### 전장 상황 콜아웃 (시드)

우크라 / 아시아 / 중동 ISW·IRONSIGHT형 콜아웃 시드:

- `src/data/situationCalloutTypes.ts`
- `ukraineSituationSeed.ts` · `asiaSituationSeed.ts` · `middleEastSituationSeed.ts`
- 전장 판별: `theaterCombat.ts` (사운드 앰비언트와 공용)

### GDELT 뉴스 · Intel

- **API:** `GET /api/gdelt` (전투·외교·사이버·선거 테마)
- **스트림:** `GET /api/news-stream` (RSS·번역 · 지정학/경제 토픽)
- **UI:** `GdeltAlertPanel`, `RegionNewsPanel`, `BottomIntelStack` / Intel 시트

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
| `/api/sound-stream` | 로컬 audio / Freesound HQ mp3 프록시 |
| `/api/data-sync` | 스냅샷 동기화 상태·트리거 |

### 정적·캐시 레이어 API

`/api/layers/conflict-zones` · `arms-embargo-zones` · `ai-data-centers` · `economic-centers` · `sanctions-entities` · `ukraine-control`

---

## 성능 · 최적화 정책

| 항목 | 동작 |
|------|------|
| **stub 모드** | 외부 API 대신 `public/data/*-seed.json` · 프로필 JSON 사용 |
| **live 가드** | `API_STUB_MODE=false` 시 `liveRenderGuard`가 FIRMS/AIS/ADS-B 폴링·상한을 보수화 |
| **lite / full** | `DATA_PROFILE` — 지오메트리·이벤트 밀도 분리 (서버 env → `page.tsx` 주입) |
| **gzip 데이터** | `npm`/`node scripts/compress-data-gzip.js` → `fetchJsonPreferGzip`이 `.json.gz` 우선 |
| **JSON 워커** | `jsonParse.worker.ts`로 대용량 파싱 메인 스레드 분리 |
| **레이어 기본 OFF** | `layerPrefs` — 모든 레이어 체크박스 기본 해제 |
| **동시 ON 상한** | `layerExclusiveCap` · Ultra-Lite · 보기 패키지 hard cap |
| **뷰포트 LOD** | NEPTUN·VIINA·정적 포인트 — tier별 최대 개수·반경 |
| **분쟁 빗금 캐시** | `disputeHatchCache` |
| **NEPTUN fetch** | 우크라 극동부 뷰 또는 전선 레이어 ON 시에만 |
| **궤적 렌더** | 모드별 점 budget, elevated 캐시, path 애니메이션 OFF |
| **카메라 busy** | `cameraBusyGuard` — tween/드래그 중 티커·무거운 갱신 일시정지 |

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

# 정적 JSON gzip 사이드카 (호스팅·대역폭용, 선택)
node scripts/compress-data-gzip.js all   # lite | full | all
```

---

## 프로젝트 구조

```
src/
  app/                    # Next.js App Router
    api/                  # REST API 라우트
    page.tsx              # 메인 대시보드
  components/
    GlobeDashboard.tsx    # 지구본·레이어·패널 통합
    EntryCautionOverlay.tsx · WelcomeParchmentLetter.tsx · DomainGateOverlay.tsx
    SoundEffectsBridge.tsx · SoundMuteControl.tsx
    UkraineAirRaidPanel.tsx · TzevaAdomPanel.tsx
    LayerCategoryDraftHost.tsx · LayerPanelLanguagePicker.tsx
    BottomIntelStack.tsx · MapLegend.tsx · UkraineFrontLegend.tsx
    NeptunLayerPanel.tsx · ViewModeSwitcher.tsx · ExplorationTabs.tsx
    ...
  hooks/
    useNeptunStream.ts · useSoundStream.ts · useSoundEnabled.ts
    useLayerPrefsController.ts · useGlobeStaticLayers.ts · useDataSync.ts
  workers/
    jsonParse.worker.ts   # 대용량 JSON 파싱
  lib/
    사운드: soundDistanceScale · freesound · airRaidFocus · soundPrefs
    UX/i18n: hoverLabels · uiStrings · ultraLiteMode · layerExclusiveCap
    성능: cameraBusyGuard · liveRenderGuard · liveSwitchGate · streamIngestGuard
         disputeHatchCache · fetchJsonPreferGzip · jsonParseWorkerClient
    전장: theaterCombat · ukraineAlertZones · ukraineFrontPaths · viinaLod
         disputeHatch · firmsSoundClassify
    licensing/ · news/
  data/
    audioManifest.ts
    situationCalloutTypes.ts
    ukraineSituationSeed.ts · asiaSituationSeed.ts · middleEastSituationSeed.ts
    telegramChannels.ts · sourceCatalog.ts
    navRegions.ts · econNavRegions.ts
public/
  audio/                  # 로컬 전투·공습 + README
  data/                   # lite / full / live / 시드 (± .json.gz)
scripts/
  compress-data-gzip.js
  telegram-osint/
docs/
IRONSIGHT/
```

---

## UI 조작 요약

| 동작 | 결과 |
|------|------|
| 드래그 / 스크롤 | 지구본 회전 · 줌 |
| 빈 바다 더블클릭 | 해당 지점 확대 |
| 분쟁 구역·뉴스 핀 클릭 | fly-to + Intel 시트 |
| NEPTUN 트랙 클릭 | 해당 위치 이동 + 우측 상세 패널 |
| 공습 경보 칩/버튼 | fly + 사이렌 + 지역 아웃라인 |
| 우크라 전선 ON | 경계·빗금·범례 |
| ≡ 메뉴 | 레이어 · 출처 · 도움말 · 주요전선/허브 · 언어 |
| 벨 버튼 | 사운드 on/off |
| 중클릭 (빈 지도) | Intel 뉴스 시트 열기 |

---

## 출처 표기 · 라이선스 공개 의무

> **본 절은 출처 표기·라이선스 고지·이용 제한이 있는 소스만** 다룹니다.  
> Public Domain·무료 공개 API·일반 npm 오픈소스 라이브러리는 별도 표기 의무가 없어 **목록에서 제외**했습니다.  
> 법률 자문이 아닙니다. 상세 체크리스트: [`docs/copyright-checklist.md`](docs/copyright-checklist.md) · 앱 UI **「출처」** 패널

### ODbL (Open Database License v1.0) — 출처·라이선스 링크 필수

| 대상 | 프로젝트·데이터 | 앱 내 사용 | 필수 표기 |
|------|----------------|------------|-----------|
| **VIINA** | 우크라이나 전선·점령 폴리곤 | 지구본 렌더링 전용 | 아래 문구 + VIINA·ODbL 링크 |
| **OpenStreetMap** | 미군 기지·AI DC·경제 허브 등 OSM 기반 레이어 | 파생 지도 데이터 | `© OpenStreetMap contributors` + [ODbL](https://opendatacommons.org/licenses/odbl/1-0/) |
| **OurAirports** | 공항 포인트 (덤프 빌드) | 정적 JSON | OurAirports + [ODbL](https://opendatacommons.org/licenses/odbl/1-0/) |

**VIINA 필수 문구 (ODbL 4.3)**

한국어:

> 본 지도에는 VIINA(Open Database License, ODbL v1.0)에 따라 제공된 정보가 포함됩니다. 데이터는 화면 렌더링 전용이며, 원본 추출·API 제공은 하지 않습니다.

English:

> Contains information from VIINA, which is made available here under the Open Database License (ODbL).

| | URL |
|---|-----|
| VIINA | https://github.com/zhukovyuri/VIINA |
| ODbL v1.0 | https://opendatacommons.org/licenses/odbl/1-0/ |
| OpenStreetMap copyright | https://www.openstreetmap.org/copyright |
| OurAirports 데이터 | https://ourairports.com/data/ |

**VIINA 추가 의무·금지:** Produced Work(화면 렌더)만 허용. GeoJSON/CSV export·공개 API bulk 제공 **금지**. → `src/lib/licensing/viinaPolicy.ts`

---

### CC BY 4.0 — 저작자 표시·라이선스 링크 필수

| 대상 | 데이터 | 앱 내 레이어 |
|------|--------|-------------|
| **Global Energy Monitor (GEM)** | 기름·가스 파이프, LNG 터미널 | `oil-pipelines` · `gas-pipelines` · `lng-terminals` |
| **World Bank Open Data** | GDP 등 경제 지표 (경제 중심지 스코어링) | `economic-centers` |

**표기 예시**

> Data from Global Energy Monitor, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

> World Bank Open Data, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

| | URL |
|---|-----|
| GEM | https://globalenergymonitor.org/ |
| GEM 라이선스 | https://creativecommons.org/licenses/by/4.0/ |
| World Bank 데이터 | https://data.worldbank.org/ |

---

### MIT License — 저작권·라이선스 문구 유지 (파생·참고 코드)

| 저장소 | 사용 내용 | 의무 |
|--------|-----------|------|
| **[IRONSIGHT](https://github.com/NoblerWorks-HQ/IRONSIGHT)** (Nobler Works) | 공개 Telegram 채널 카탈로그 (`src/data/telegramChannels.ts`) | Copyright (c) 2026 Nobler Works · [MIT License](https://opensource.org/licenses/MIT) 고지 유지 |

서브폴더 [`IRONSIGHT/`](IRONSIGHT/) 전체는 MIT 라이선스 적용. 채널 **게시물** 저작권은 각 Telegram 운영자 소유.

---

### 제공자 attribution · 이용약관 준수 (무료여도 표기·제한 있음)

| 제공자 | 데이터 | 표기·제한 | URL |
|--------|--------|-----------|-----|
| **NEPTUN** | 우크라 드론·미사일·공습 경보 | `NEPTUN — Карта повітряних тривог України` · 비공식 피드 | https://neptun.in.ua/ |
| **GDELT Project** | 뉴스·사이버·선거 이벤트 | GDELT 출처 표기 · [이용 약관](https://www.gdeltproject.org/about.html) · 상업 이용 별도 확인 | https://www.gdeltproject.org/ |
| **NASA FIRMS** | 위성 화재 (VIIRS) | **NASA FIRMS** attribution 필수 | https://firms.modaps.eosdis.nasa.gov/ |
| **Uppsala Conflict Data Program (UCDP)** | 분쟁 사건 (GED) | UCDP 인용·연구/상업 조건 준수 | https://ucdp.uu.se/ |
| **adsb.fi** | 군용 항공기 ADS-B | adsb.fi 출처 · [서비스 약관](https://adsb.fi/terms) (비상업 등 제한 확인) | https://adsb.fi/ |
| **TeleGeography** | 해저 케이블 지도 GeoJSON | TeleGeography / [Submarine Cable Map](https://www.submarinecablemap.com/) 표기 | https://www.submarinecablemap.com/ |
| **Pikud HaOref (Oref)** | 이스라엘 공습 경보 (비공식 JSON) | Israel Home Front Command (Oref) | `/api/tzeva-adom` |
| **The Space Devs** | 우주 발사 (Launch Library 2) | The Space Devs attribution | https://thespacedevs.com/ |
| **PeeringDB** | 인터넷 교환점 | PeeringDB [이용 약관](https://www.peeringdb.com/apiv2/)·표기 | https://www.peeringdb.com/ |
| **AISstream** | 선박 AIS (API 키) | [AISstream 약관](https://aisstream.io/) 준수 | https://aisstream.io/ |
| **Google News RSS** | Intel 뉴스 스트림 | Google 서비스 약관 | `/api/news-stream` |
| **Google Translate** (비공식) | 뉴스·NEPTUN·Telegram 한국어 UI | Google 서비스 약관 · 비공식 엔드포인트 | `src/lib/koreanTranslate.ts` |
| **Yahoo Finance** (yahoo-finance2) | 주식 티커 | Yahoo 이용 약관 · 비공식 API | `/api/stock-tickers` |
| **Freesound** | 긴장·경제·UI 앰비언트 HQ mp3 | 개별 사운드 CC 라이선스·저작자 표기 · [`audioManifest` note](src/data/audioManifest.ts) | https://freesound.org/ |

**정부·국제기구 공식 목록** (재배포·상업 조건 확인 필요): US Treasury **OFAC** · **UN** Security Council · **EU** · **UK** 제재·무기 금수 목록 → `sanctions-entities` · `arms-embargo-zones`

---

### 이용 제한·면책 (라이선스와 별도)

| 항목 | 내용 |
|------|------|
| **VIINA** | 렌더링 전용. 데이터 추출·API export 금지. |
| **NEPTUN · Tzeva Adom** | 비공식 피드. **공식 경보 시스템 대체 불가.** |
| **Telegram OSINT** | 채널 글은 운영자 소유. **AI·뉴스 요약 파이프라인에 포함 금지** (`src/lib/licensing/telegramOsintPolicy.ts`). |
| **GDELT · UCDP · adsb.fi** | 비상업·연구 목적 제한이 있을 수 있음. |
| **사운드** | 공습·전투음은 시뮬레이션 UX용. 실제 전장·경보를 대체하지 않습니다. |

---

### 코드·메타데이터 참고

라이선스·attribution 문자열 단일 출처: [`src/data/sourceCatalog.ts`](src/data/sourceCatalog.ts)  
VIINA 정책: `src/lib/licensing/viinaPolicy.ts` · IRONSIGHT: `src/lib/licensing/ironsightPolicy.ts`

**본 README에 없는 데이터** = Public Domain, 무료 공개 API, 또는 별도 표기 의무가 없는 소스로 간주합니다 (예: Natural Earth, NGA WPI, USGS, UNHCR 시드, 로컬 휴리스틱 데모 등).

---

## 개발 메모

- Windows·OneDrive 경로에서는 `next.config.mjs`가 dev 시 webpack 메모리 캐시를 사용합니다 (청크 404 방지).
- `npm run dev:clean` — `.next` 삭제 후 dev 재시작.
- 레이어 설정은 브라우저 `localStorage` (`geowatch-layers-*`)에 저장됩니다. 메이저 버전 업 시 레이어는 모두 꺼진 상태로 시작할 수 있습니다.
- 사운드 on/off는 `soundPrefs` / 벨 토글로 저장됩니다.
- TypeScript·ESLint는 Next.js 기본 설정을 따릅니다.
