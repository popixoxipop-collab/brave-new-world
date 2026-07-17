# geo-risk-desk — Event-Driven Geopolitical Risk Desk

**정체성**: 지도 위 지정학 이벤트(초크포인트 봉쇄·제재·전선 이동)를 감지해, 그 사건의
포트폴리오 영향 초안(노출 티커+방향, 근거 링크)을 사람 서명 전 단계까지 자동 생성하는
리스크 데스크. "무슨 일이 났나"가 아니라 **"그래서 내 돈에 무슨 일이 났나"**를 판다.

3-repo 통합:
```
geowatch(fork)   → 이벤트 스트림 + 지도 + 카드 UI      (popixoxipop-collab/brave-new-world)
financial-svc    → 분석 system prompt + skill 절차(인용)  (Anthropic 공식 fork, 실행코드 아님)
Finance repo     → 실제 모의 포트폴리오 포지션(읽기전용)   (/Volumes/D50/Finance, Alpaca+KIS)
       ↓
  geo-risk-desk 라우터 (Cloudflare worker + 새 D1 테이블)
```

---

## ★ 조사 결과 — Fable 요약(가설) vs 실제 코드(증거), 2026-07-17

Fable의 결합 아이디어는 방향은 옳으나 배선 가정 6건이 실제 코드와 어긋났다(Explore 2회
검증). **이 표를 신뢰하고 재조사하지 말 것.**

| Fable 가정 | 실제 코드 | 파일 근거 |
|---|---|---|
| OFAC 레이어가 D1에 ingest | **정적 JSON, 국가 12행, 개별 SDN 없음** | geowatch `public/data/lite/sanctions-entities.json`, `src/app/api/layers/sanctions-entities/route.ts:12` |
| 이벤트 diff 감지 가능 | **diff 로직 전무**, full-snapshot upsert(ON CONFLICT), 48h prune. Telegram만 `received_at`으로 diffable | `workers/cron-ingest/src/db.ts:26,69,108`; `schema.ts:362` telegram_alerts |
| KYC Screener로 "OFAC entity→상장사 노출" | KYC는 **forward onboarding**(고객서류 스크리닝), reverse-exposure 아님. holdings 데이터셋 없음 | fin-svc `managed-agent-cookbooks/kyc-screener/agent.yaml`, `plugins/agent-plugins/kyc-screener/skills/*` |
| 10개 실행가능 에이전트 | **markdown 프롬프트+skill.md+YAML 매니페스트**. 실행코드=QC 스크립트 3개뿐 | fin-svc `plugins/agent-plugins/*/agents/*.md`, `validate_dcf.py` |
| 11개 data connector 작동 | **MCP URL만** — 데이터·auth·클라이언트 없음, 전부 유료 구독 | fin-svc `plugins/vertical-plugins/financial-analysis/.mcp.json` |
| `/v1/agents` headless 배포 | **forward-dated preview**(opus-4-7, `managed-agents-2026-04-01` beta) — 오늘 안 돎 | fin-svc `scripts/deploy-managed-agent.sh:29`, `orchestrate.py:4-6,67` |

### 재사용 가능한 진짜 자산 (좋은 소식)
- geowatch **Cloudflare cron worker(10분)** + D1 + drizzle 실동작 (`wrangler.ingest.toml`, `workers/cron-ingest/`)
- **Claude Messages 호출 경로 이미 존재**(BYOK) — `src/lib/llm/claudeMessages.ts` `callClaudeMessages`, `ANTHROPIC_API_KEY`+`ANTHROPIC_MODEL`(`src/lib/llm/anthropicEnv.ts:11`)
- **risk+ticker 카드가 이미 financial-exposure 카드** — `EconInsightBrief.marketLinks`(`direction:up/down/watch`), `src/data/econInsightBriefs.ts:10-15`; 렌더 `EconInsightParchment.tsx`; resolve `resolveCriticalNodeBrief.ts:43`
- `submarine_tunnels` 테이블에 이미 `relatedTickers`+`riskNote` 컬럼 (`schema.ts:271`)
- 카드 주입점: `Selection` 유니온(`components/globe/types.ts:13`) + `AnalysisPanel.tsx`; static-point 클릭은 `GlobeDashboard.tsx:7495 handleGlobePointClick`에 분기 추가(현재 sanctions 클릭은 no-op)
- 레이어 플래그: `src/lib/layerPrefs.ts`(show* boolean), Ultra-Lite cap 12 `layerExclusiveCap.ts:10`
- fin-svc에서 인용할 것: system prompt 본문, skill 절차(comps/dcf/kyc-rules), prompt-injection 방어 패턴(`kyc-doc-parse/SKILL.md:7` `<untrusted_document>`), xlsx QC 스크립트

---

## 핵심 결정 (사용자 승인 2026-07-17)

**D1 — geowatch fork 위 통합** (별도 repo/재구현 아님)
- WHY: 지도·D1·카드 계약(marketLinks)·cron worker·Claude 경로가 이미 있어 재사용이 압도적. 새로 지으면 이 전부를 재구현.
- COST: 9000줄 `GlobeDashboard.tsx` 위 작업, upstream(kangps7675-tiger)과 분기 관리.
- EXIT: fork가 무거워지면 라우터만 별도 서비스로 분리(D1은 HTTP API로 노출).

**D2 — Hybrid 데이터** (무료 방향성 real + 정밀 숫자 mock, "unverified" 라벨)
- WHY: 유료 MCP(LSEG/S&P) 구독 없이 "달러 숫자" grounding 불가. 무료(yfinance)로 방향성(up/down)은 real, DCF/comps 정밀값은 placeholder로 UI만 완성 후 유료 연결 시 교체.
- COST: 데모의 "포트폴리오 -2.7%" 숫자가 당장은 mock. 정직성 위해 unverified 회색 처리 필수.
- EXIT: 유료 MCP 키 확보 시 mock 자리에 Messages API remote-MCP connector 연결.

**D3 — 포트폴리오 소스 = Finance repo 실 포지션** (읽기전용)
- WHY: mock CSV보다 라이브 모의 포트폴리오(Alpaca paper+KIS, phase4/wfo/vrp)가 데모를 real하게. 사용자가 지적.
- COST: Finance repo 결합. §17 account-pair-guard(Alpaca+KIS 함께) 준수 필수, 라이브 봇 무영향.
- EXIT: 결합이 위험하면 Finance 포지션 스냅샷을 주기적 export한 정적 JSON만 읽기.

**D4 — 배포 = Cloudflare worker** (자원 확인됨)
- WHY: geowatch가 이미 Cloudflare/D1. 동일 스택에 라우터 cron step 추가가 최소 마찰.
- COST: Cloudflare 계정/과금 의존. EXIT: 로컬 Node 스크립트로 루프 증명 가능(worker 없이도 개발).

**D5 — 분석 호출 = Messages API + system prompt inline** (Managed Agents 아님)
- WHY: `/v1/agents`는 forward-dated preview(오늘 불가). fin-svc의 system prompt+skill을 inline해 Messages API로 직접 호출이 유일한 오늘-가능 경로.
- COST: 멀티-subagent 오케스트레이션을 직접 구현. EXIT: Managed Agents GA 시 deploy-managed-agent.sh 경로로 이전.

**D6 — 이벤트 소스 = Telegram 우선** (변화감지 net-new)
- WHY: Telegram만 `received_at`으로 cursor-diffable. GDELT/AIS/ADS-B는 upsert 덮어쓰기라 first-seen 컬럼 추가 필요.
- COST: Telegram 단일소스 신뢰도 문제(허위정보). 2-source corroboration 룰로 트리거 게이트.
- EXIT: GDELT에 first-seen 컬럼 추가 시 소스 확대.

---

## 재조정 Tier 로드맵 (실제 코드 기반)

### Tier 1 — 루프 증명 (이벤트 diff → Claude 방향성 판정 → 카드)
1. 새 D1 테이블 `risk_events`(first-seen cursor) + `risk_analyses`(라우터 출력)
2. 라우터: Telegram `telegram_alerts` diff(received_at > cursor) → 2-source 게이트 → Claude Messages(fin-svc equity-research system prompt inline)로 "노출 티커+방향+근거" JSON 판정
3. 포트폴리오 필터: Finance 포지션(읽기전용)과 교집합만 승격
4. 카드: 판정을 `EconInsightBrief.marketLinks` 형태로 D1 저장 → `handleGlobePointClick`에 분기 추가 → 지도에 pin+parchment 카드
5. grounding 루프: geowatch 로컬 실행(npm run dev)해서 실제 카드 렌더 관찰

### Tier 2 — 포트폴리오 인지 이벤트 퍼널
- 2단 분류(경량 룰+Haiku → severity×포트폴리오 관련도 상위만 full run)
- chokepoint 플레이북(Hormuz/Bab el-Mandeb/Suez/Malacca/Taiwan) 사전 템플릿
- Risk Queue UI(영향순 랭킹) + Earnings 역인덱싱(경영진이 언급한 지리)

### Tier 3 — 문샷
- 공급망 digital twin(MIT Atlas/케이블/파이프라인 × 종목 물리 발자국, 2·3차 노출 전파)
- 과거 이벤트 백테스트(Abqaiq 2019/Ever Given 2021/Nord Stream 2022)로 전파계수 데이터 보정
- IC-memo 완전 자동 초안

## 짓지 말 것 (Fable 경고)
자동매매/alpha bot(규제 즉사) · 전쟁결과 확률예측 · 리테일/무료티어 · 커넥터 재개발 ·
chat-first UI(지도가 해자) · 범용 뉴스요약.

## 죽음의 3대 문제 → 완화
1. **라이브 지정학 위 환각 금융주장** → grounding 계약을 아키텍처로 강제: 수치는 source ID 필수, 미인용은 "unverified" 회색. OSINT도 2-source corroboration.
2. **데이터 라이선스**(adsb.fi 비상업/AIS/LSEG 재배포금지) → BYO-entitlement, 화면엔 파생분석물만. 레이어별 재배포 안전성 감사표.
3. **신호/소음+비용** → 2단 깔때기 + chokepoint 사전 템플릿 캐시.
