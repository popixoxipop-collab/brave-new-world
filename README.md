# Conflict View

백엔드 연결 전 단계의 로컬 프론트 프로토타입입니다. 현재 범위는 3D 지구본 인터랙션, Natural Earth 실제 로컬 레이어, GDELT 실제 로컬 이벤트, AISstream 서버 프록시 기반 선박 포인트, 클릭 분석 패널입니다.

## Getting Started

개발 서버:

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## GDELT 로컬 검증

Supabase 없이 최신 15분 슬라이스를 받아 `scripts/output/events.json`, `scripts/output/events.csv`로 저장합니다.

```bash
npm run gdelt:fetch
```

## 앱 데이터 생성

Natural Earth shapefile과 GDELT 출력 파일을 합쳐 `public/data/app-data.json`을 만듭니다.

```bash
npm run data:build
```

GDELT까지 새로 받고 앱 데이터를 다시 만들려면:

```bash
npm run data:refresh
```

## 데이터 메모

- `public/data/app-data.json`: 화면이 실제로 읽는 앱 데이터
- `scripts/gdelt-fetch.js`: GDELT Event export를 로컬 파일로 변환
- `scripts/build-local-data.js`: Natural Earth shapefile + GDELT 출력 파일을 앱 데이터로 변환
- 현재 사용 레이어: 국가 검색/패널, populated places, disputed areas, 전체 도로, 전체 철도, GDELT 이벤트
- AISstream API key는 `.env.local`의 `AISSTREAM_API_KEY`로만 사용하고, 브라우저에는 노출하지 않음
- `/api/ais`: 서버가 AISstream WebSocket을 짧게 열어 PositionReport를 모은 뒤 JSON으로 반환

## 현재 의도적으로 제외

- Supabase/Auth/Realtime
- 실제 뉴스 API 및 LLM 요약
- 장시간 AIS WebSocket 브로드캐스트
- 결제/로그인

## 다음 단계 후보

- Natural Earth `physical` 레이어와 `natural_earth_vector.gpkg` 추가 변환
- `scripts/output/events.json`을 검토하는 로컬 admin 화면 추가
- 클릭 분석 패널에 실제 화이트리스트 뉴스 연결
