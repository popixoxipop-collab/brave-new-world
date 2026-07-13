# Cloudflare 배포 (MapLibre 앱 + Cron Ingest)

MapLibre는 브라우저에서 돌아가며, Next.js 앱을 Cloudflare Workers에 올리면 맵 UI도 함께 배포됩니다.

## 구성

| 파일 | 역할 |
|------|------|
| `wrangler.jsonc` | Next.js 앱 (`conflict-view`) — OpenNext |
| `wrangler.ingest.toml` | Cron ingest Worker (`conflict-view-ingest`) — FIRMS/GDELT → D1 |
| `open-next.config.ts` | OpenNext Cloudflare 어댑터 설정 |

두 Wrangler 설정이 루트에 공존합니다. ingest 스크립트는 `-c wrangler.ingest.toml`을 명시합니다.

## Next 앱 배포 (MapLibre UI)

```bash
# 0) 의존성 (OneDrive 동기화 중이면 일시 중지 권장 — TAR/ENOTEMPTY 오류 방지)
npm install -D @opennextjs/cloudflare@1.15.1

# 1) Cloudflare 로그인 (최초 1회)
npx wrangler login

# 2) 로컬에서 Workers 런타임 미리보기
npm run cf:app:preview

# 3) 배포 → https://conflict-view.<your-subdomain>.workers.dev
npm run cf:app:deploy
```

- 패키지: `@opennextjs/cloudflare@1.15.1` (Next.js 14.2.x 호환). 최신 1.16+는 Next 15+ 전용
- 정적 청크 캐시: `public/_headers`
- 프로젝트가 OneDrive 아래에 있으면 `npm install`이 깨질 수 있습니다. 동기화 일시 중지 후 재설치하세요.

### 주의

- API 중 `fs`로 `public/data`를 읽는 라우트는 Workers에서 동작이 제한될 수 있습니다. 배포 후 해당 API를 점검하세요.
- Worker 업로드 한도(무료 gzip ~3 MiB / 유료 ~10 MiB)를 넘으면 Paid 플랜 또는 번들 축소가 필요합니다.
- Next 15+로 올리면 `@opennextjs/cloudflare`를 최신으로 올릴 수 있습니다.

## Cron Ingest

```bash
npm run cf:ingest:deploy
# secret: npx wrangler secret put NASA_FIRMS_API_KEY -c wrangler.ingest.toml
```

자세한 내용은 [`workers/cron-ingest/README.md`](workers/cron-ingest/README.md)를 참고하세요.

## R2 정적 데이터 (public/data)

대용량 `public/data/{lite,full}` 은 Workers 번들이 아니라 **R2**에 올리는 것을 권장합니다.

### 1회 활성화 (대시보드)

Cloudflare Dashboard → **R2** → **Enable R2**  
(미활성 시 `wrangler r2` 가 code 10042 로 실패합니다.)

### 업로드

```bash
npm run cf:r2:create          # 버킷 conflict-view-data
npm run cf:r2:upload:dry      # 목록만
npm run cf:r2:upload          # lite+full JSON(+gz) put
# npm run cf:r2:upload -- --with-textures
```

버킷 public 도메인(또는 Worker 프록시)을 붙인 뒤:

```bash
# .env / Workers vars
NEXT_PUBLIC_DATA_CDN=https://<your-r2-public-host>
```

`dataPath()` 가 CDN을 prefix 합니다. 비우면 기존 `/data/...` (로컬·ASSETS).

### wrangler.jsonc 바인딩 (앱에서 R2 직접 읽을 때)

```jsonc
"r2_buckets": [
  { "binding": "DATA_BUCKET", "bucket_name": "conflict-view-data" }
]
```

버킷 생성 후에만 추가하세요.
