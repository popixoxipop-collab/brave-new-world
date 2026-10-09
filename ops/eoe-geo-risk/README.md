# EOE Geo-Risk Desk (Shadow / read-only)

Source: Brave New World main pinned at `80d398ce88b5c798a252c1f17021c25a17375ad6` (July D-GRF detector, router, collector and analysis prompt reused).

## Purpose

Runs **on EOE**: directly requests the public Telegram OSINT preview, GDELT 15-minute export and open ADS-B feeds, stores real responses in local SQLite and exposes a loopback-only, GET-only normalized geopolitical event bus at `http://127.0.0.1:38471/api/geo-risk/events`. Cloudflare Workers or D1 are **not dependencies** of this service. `/health`, `/latest`, `/telegram?limit=40` are read-only data-source probes consumed by the Finance Shadow collector.

Run via `com.eoe.geo-risk-desk` LaunchAgent with 600-second interval inside `desk.ts`. All paths and service credentials remain on EOE. `state/` is ignored by Git (local SQLite WAL and logs). Only `127.0.0.1` is listened on, not the host's tailnet/public IP. No HTTP POST actions, PRE weights, OMS intents, broker integrations or trade authority are implemented.

EOE uses the existing cached **DeepSeek-V2-Lite-Chat 4-bit** model via a second loopback-only MLX service at `127.0.0.1:38472` (`com.eoe.geo-risk-mlx` LaunchAgent). The research detector/LLM router remain from the July source; the generated JSON uses local Metal inference. Model attempts are limited to **2 per cycle and 12/day** and budget counters persist in SQLite. The deployed and authored Geo-Risk service is now **MLX-only**, with no external NVIDIA model adapter or `.env` credentials reader in `desk.ts`; `GEO_EOE_LLM_MODE=mlx` selects local analysis and any other value fails closed to detector-only mode. Local model quality is not assumed to prove the event or market direction. HTTP model failures do not become analyzed market signals. Even a successful model result is only an *unverified analyst draft*: event bus outputs `verified:false` and all exposure `verified:false` until independent market/source evidence exists. This is deliberate: a model cannot self-verify a financial claim. No canonical PRE action uses this event bus.

**Remaining provider inputs:** NASA FIRMS Map Key and MarineTraffic/AISstream API key were not present on EOE at deployment; these providers remain `null` in local `/latest` rather than fabricated 0 counts. The old Cloudflare collector has not been removed or written to.

Finance consumer policy: `/Users/eoe/Finance/configs/geo_layer_a_eoe_local_v1.json` SHA-pinned against exact loopback endpoint. Its `com.eoe.finance-geo-layer-a-shadow` LaunchAgent produces append-only real GET evidence every 600 seconds and projects it into read-only Command Center; source file `scripts/finance_geo_layer_a_shadow.py` explicitly allows this exact local endpoint only. The original external policy remains intact for rollback.

## Verify

```bash
launchctl list com.eoe.geo-risk-desk
launchctl list com.eoe.finance-geo-layer-a-shadow
curl -fsS http://127.0.0.1:38471/health
curl -fsS http://127.0.0.1:38471/latest
curl -fsS 'http://127.0.0.1:38471/api/geo-risk/events?max=50'
cd ops/eoe-geo-risk && npm test
```

Never publish the local SQLite database, raw Telegram messages or Finance environment file. Do not interpret raw GDELT points, aircraft records, or channel counts as corroborated events. A `0` corroborated event count is not proof that geopolitical risk is zero.

**Verification nuance:** the upstream `detectEvents` research logic can elevate a strong single-source alarm to `L2`; distinct source count 1 is *not independently corroborated*. The Finance projection still requires at least 2 corroborating channels AND a separately verified analysis, and the local generative model never sets `verified:true`. The local MLX HTTP server emits a basic-security warning; it is restricted to `127.0.0.1` and must not be exposed on public or tailnet interfaces. The Command Center GET route has not been certified deployed into the running production Command Center simply because Finance status files exist.
