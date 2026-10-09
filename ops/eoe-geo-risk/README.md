# EOE Geo-Risk Desk — D-GRF12 P0–P2

**Version 0.2.0 · Shadow-only · no PRE/OMS/order authority.**

The original [Brave New World](https://github.com/popixoxipop-collab/brave-new-world) July 2026 detector/analyst research remains preserved in the repository and in the original immutable SQLite records. This EOE service is an **operational event-quality gate**, not a production trading signal.

## Local architecture

- `com.eoe.geo-risk-desk` (LaunchAgent, RunAtLoad+600s): direct Telegram, GDELT and ADS-B public collector; SQLite WAL; **127.0.0.1:38471 only**.
- `com.eoe.geo-risk-mlx`: cached DeepSeek-V2-Lite 4-bit MLX **127.0.0.1:38472**. The model was previously used to create **3 historical unverified draft analyses**, but **D-GRF12 has stopped automatic generation** until genuinely independent, uniquely identified incidents and issuer causality are established. `model.generation_enabled=false`. No external NVIDIA dependency.
- `com.eoe.finance-geo-layer-a-shadow`: Finance SHA-pinned read-only source poll (600s), publishes append-only evidence. No PRE/OMS writes.
- Finance Command Center offers read-only `GET /api/v2/observability/risk/geopolitical`, including `source_review_quality` candidate/blocked counts, with no trading permissions.

All APIs are local loopback except existing separately protected Finance Command Center tailnet route.

## P0 incident identity: `identity.ts`

- Extract typed **action, actor, target/facility, location and two-hour UTC mention window**. Examples: Saudi airstrike claimed at Sanaa and a US Embassy security alert **do not merge**; a Sanaa airport strike is separate from a refinery strike; UK consulate status change is diplomatic, **not a new stock-market sanction**.
- Retrospective Gaza blockade commentary is excluded from a new maritime choke-point disruption.
- `candidateId=geo2:sha256(extracted tuple | mention-window)` is explicitly **PROVISIONAL**. The 2h bucket is only for manual review; it is **not** proof of unique occurrence, first public release, or two independent sources. Different specific strikes near the same place may still require manual separation. Unknown languages/sites/actions are quarantined.
- Requires an externally assigned individual incident ID and actual release evidence **before upgrading identity**. Code currently grants **zero** such upgrades.
- Input is untrusted text, only SHA and sanitized identities stored in the v2 review ledger. Historical v1 event IDs and texts are not rewritten.

## P1 source lineage: `identity.ts`

- Deduplicate post IDs and poison same-ID/divergent-text collisions.
- Track Telegram relay count separately from origin attribution groups (repost signatures, `via/from @original`, reused source URLs, near-duplicate content).
- **Channel diversity is not independent reporting.** Group count cannot approve a specific incident. `verifiedSourceCount=0` and `verifiedEvent=false` until independently archived original documents, publishers/ownership, event identity, and provenance are evaluated.
- No manual verification/declassification or broker decision API is exposed.

## P2 listing and transmission: `exposure-gate.ts`

- Treat language-model ticker symbols, rationale and `verified:true` as untrusted.
- PIT listing and issuer LEI, source SHA + legal exchange identity, valid-as-of event timestamp and separately time-grounded primary transmission document **all required** even to enter a human research shortlist.
- `BRIT`, `FSUK`, `RTN`-era stale names, fictitious symbols, and real tickers with unverified causal exposure remain **BLOCKED** without independent certificates.
- The reviewer can only return `BLOCKED` or `PENDING_INDEPENDENT_AUDIT`; `verified=false`, `tradeAllowed=false` in both outcomes.
- No issuer certificates have been approved for live use; **zero** accepted financial signals.

## New durable ledger: `v2-ledger.ts`

SQLite tables (new, never replace or delete legacy rows):
- `dgrf12_runs`: append-only payload/SHA per 600-second cycle.
- `dgrf12_candidate_receipts`: SHA-pinned sanitized P0 identities and P1 source states.
- `dgrf12_rejected_receipts`: SHA-pinned reason and input digest, no message body.
- `dgrf12_legacy_ticker_receipts`: individual issuer-evidence reject reasons; existing 3 historical analyses/24 ticker drafts retained as history, never promoted.

`GET /api/geo-risk/review?max=20`: sanitized provisional incident identities, relay-vs-origin distinction, rejection summaries, legacy issuer audit; SHA-validates on read. `GET /latest`: DGRF12 summary (no OSINT bodies). `GET /api/geo-risk/events?max=50`: **verified-events-only feed**, presently `events=[]` with quarantine metadata, still compatible with Finance `source=eoe-sqlite` contract. `GET /telegram?limit=40` loopback-only. All POSTs return HTTP 405.

Important: the old `risk_events` and `risk_analyses` SQLite tables are retained **only as historical unverified archives**. The retired `class|geography` v1 router no longer runs in the service. A zero event feed is not evidence of zero geopolitical risk.

## QA / operations

```bash
cd /Users/eoe/projects/brave-new-world-eoe-geo-20261009/ops/eoe-geo-risk
npm test
launchctl list com.eoe.geo-risk-desk
launchctl list com.eoe.geo-risk-mlx
curl -fsS http://127.0.0.1:38471/health
curl -fsS http://127.0.0.1:38471/latest
curl -fsS 'http://127.0.0.1:38471/api/geo-risk/review?max=20'
curl -fsS 'http://127.0.0.1:38471/api/geo-risk/events?max=50'
```

- Focused detector+identity+lineage+issuer+SQLite tamper tests **21/21 PASS**.
- Separate port **38473** is reserved for `EOE_GEO_STAGING=1` + separate `state/dgrf12-staging.sqlite3` for non-mutating predeployment smoke.
- 2026-10-09 EOE production first new cycle: 50 Telegram alert inputs, **3 provisional/manual review**, **47 rejected**, 3 historical v1 models + **24/24 historical ticker drafts quarantined**, 0 independently verified incidents, 0 financial signals, **0 new model calls**.
- Legacy program backup: `state/desk_legacy_pre_dgrf12_20261009.ts` SHA `0c3b59b7d06256547c519977cdf9a9275e292b481090e04514007b9ef8ff74b8`.
- Legacy SQLite point-in-time backup on D50: `/Volumes/D50/FinanceGeoRisk/backup/dgrf12-precutover-20261009.sqlite3` SHA `6888d9b2f0edb9fd1ea71658138c7512cdf5a8c0a1195b0999cf1a2587029802`.
- The external Cloudflare Worker and D1 deployment were **not changed or deleted**. NASA FIRMS and AIS EOE provider keys remain unavailable. Do not claim source parity.
- Model server basic-security warning: **never publish MLX HTTP endpoint or EOE research SQLite** to the public internet/Tailnet.
- EOE internal SSD has less than 15GB free reserved space: use D50 for sizeable new research data and preserve free capacity; no new weight downloads.
- Draft branches are reviewed independently before any main merge; no automatic live promotion.

### Constraints / next

The provisional identity token and unverified media-origin relation should be resolved using **original publicly released incident documents with trusted timestamps**, not circular quotations or extra Telegram channels. Only then can PIT issuer event exposures be experimentally paired with actual forward financial outcomes in Finance, with no auto-hedge or live capital writes.
