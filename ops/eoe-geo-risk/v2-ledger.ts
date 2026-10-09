/**
 * D-GRF12 durable, append-only, non-trading P0/P1/P2 ledger.
 * Own tables; legacy risk_events and risk_analyses are SELECT-only here.
 * No hedge, broker or portfolio imports; no shell/network operations.
 */
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { evaluateIdentityAndLineage, type Alert, type CandidateReview } from "./identity";
import { summarizeTickerChecks, type ModelDraft } from "./exposure-gate";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const zero = (v: unknown) => Number(v) || 0;
export type ResearchCycle = {
  state: "RESEARCH_CANDIDATES_ONLY";
  schemaVersion: "eoe.geo.dgrf12-p0p1p2/1";
  sourceAlertCount: number;
  manualReviewCandidates: number;
  rejectedMentions: number;
  originalTelegramRelays: number;
  independentlyVerifiedEvents: 0;
  issuerEvidenceCertified: 0;
  acceptedFinancialSignals: 0;
  quarantinedLegacyDraftEvents: number;
  quarantinedLegacyExposureChecks: number;
  legacyExposureBlocked: number;
  pipeline: "P0_IDENTITY_P1_LINEAGE_P2_ISSUER";
  readOnlyFinance: true;
  canTrade: false;
  runSha256: string;
};
export function setupReviewLedger(db: DatabaseSync): void {
  db.exec([
    "CREATE TABLE IF NOT EXISTS dgrf12_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, observed_at TEXT NOT NULL, payload TEXT NOT NULL, payload_sha256 TEXT NOT NULL, created_at TEXT NOT NULL);",
    "CREATE TABLE IF NOT EXISTS dgrf12_candidate_receipts (run_id INTEGER NOT NULL, candidate_id TEXT NOT NULL, review_json TEXT NOT NULL, review_sha256 TEXT NOT NULL, PRIMARY KEY(run_id,candidate_id), FOREIGN KEY(run_id) REFERENCES dgrf12_runs(id));",
    "CREATE TABLE IF NOT EXISTS dgrf12_rejected_receipts (run_id INTEGER NOT NULL, id_hash TEXT NOT NULL, reason TEXT NOT NULL, text_sha256 TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES dgrf12_runs(id));",
    "CREATE TABLE IF NOT EXISTS dgrf12_legacy_ticker_receipts (run_id INTEGER NOT NULL, legacy_event_sha256 TEXT NOT NULL, ticker TEXT, reason_json TEXT NOT NULL, review_sha256 TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES dgrf12_runs(id));",
  ].join("\n"));
}
function sanitizedCandidate(c: CandidateReview) {
  return {
    candidateId: c.candidateId, identity: c.identity,
    firstObservedAtUTC: c.firstObservedAtUTC,
    lastObservedAtUTC: c.lastObservedAtUTC,
    alertCount: c.alertCount, distinctTelegramRelays: c.distinctTelegramRelays,
    originalAttributionGroups: c.originalAttributionGroups,
    eventIdentityStatus: c.eventIdentityStatus,
    sourceIndependenceStatus: c.sourceIndependenceStatus,
    verifiedSourceCount: 0,
    verifiedEvent: false,
    eligibleForFinancialModel: false,
    sourceEvidenceHashes: c.sourceEvidenceHashes,
    reasonCodes: c.reasons,
  };
}
function loadLegacyChecks(db: DatabaseSync) {
  const rows = db.prepare(
    "SELECT e.id,e.first_seen_at,a.exposures_json FROM risk_events e " +
    "JOIN risk_analyses a ON a.event_id=e.id ORDER BY e.id LIMIT 250"
  ).all() as Array<Record<string, unknown>>;
  const checks: Array<{ legacyEventSha256: string; ticker: string | null;
    reasonCodes: string[]; approved: false; }> = [];
  let legacyRows=0;
  for (const row of rows) {
    let drafts: ModelDraft[]=[];
    try {
      const data: unknown=JSON.parse(String(row.exposures_json));
      if (Array.isArray(data)) {
        drafts=data.slice(0, 40).filter(x => x && typeof x === "object")
          .map((x: Record<string,unknown>) => ({
            ticker: String(x.ticker ?? ""), direction: String(x.direction ?? ""),
            verified: x.verified === true,
          }));
      }
    } catch { continue; }
    legacyRows++;
    // This is deliberately NOT coupled to a v2 candidate; legacy coarse event
    // grouping is insufficient evidence of a unique external incident ID.
    const grouped = summarizeTickerChecks(drafts, null, String(row.first_seen_at));
    for (const result of grouped.checks) {
      checks.push({
        legacyEventSha256: sha(String(row.id)),
        ticker: result.normalizedTicker,
        reasonCodes: result.reasonCodes,
        approved: false,
      });
    }
  }
  return {legacyRows,checks};
}

export function recordResearchCycle(db: DatabaseSync, alerts: Alert[], observedAt: string): ResearchCycle {
  const review=evaluateIdentityAndLineage(alerts);
  const legacy=loadLegacyChecks(db);
  const sanitized=review.acceptedForManualReview.map(sanitizedCandidate);
  const distinctRelays=new Set(alerts.map(x=>x.channelUsername)).size;
  const unsigned= {
    schemaVersion: "eoe.geo.dgrf12-p0p1p2/1" as const,
    state: "RESEARCH_CANDIDATES_ONLY" as const,
    sourceAlertCount: alerts.length,
    manualReviewCandidates: sanitized.length,
    rejectedMentions: review.rejected.length,
    originalTelegramRelays: distinctRelays,
    independentlyVerifiedEvents: 0 as const,
    issuerEvidenceCertified: 0 as const,
    acceptedFinancialSignals: 0 as const,
    quarantinedLegacyDraftEvents: legacy.legacyRows,
    quarantinedLegacyExposureChecks: legacy.checks.length,
    legacyExposureBlocked: legacy.checks.length,
    pipeline: "P0_IDENTITY_P1_LINEAGE_P2_ISSUER" as const,
    readOnlyFinance: true as const,
    canTrade: false as const,
  };
  const runSha256=sha(JSON.stringify({
    observedAt, unsigned, candidates:sanitized, rejected:review.rejected, legacy:legacy.checks,
  }));
  const payload={...unsigned,runSha256};
  // Append-only receipts, no event overwrite; one ACID unit per 600s cycle.
  db.exec("BEGIN IMMEDIATE");
  try {
    const res=db.prepare("INSERT INTO dgrf12_runs(observed_at,payload,payload_sha256,created_at) VALUES(?,?,?,?)")
      .run(observedAt, JSON.stringify(payload), sha(JSON.stringify(payload)), new Date().toISOString());
    const runId=Number(res.lastInsertRowid);
    const putCandidate=db.prepare(
      "INSERT INTO dgrf12_candidate_receipts(run_id,candidate_id,review_json,review_sha256) VALUES(?,?,?,?)");
    for (const c of sanitized) {
      const text=JSON.stringify(c);
      putCandidate.run(runId,c.candidateId,text,sha(text));
    }
    const putReject=db.prepare(
      "INSERT INTO dgrf12_rejected_receipts(run_id,id_hash,reason,text_sha256) VALUES(?,?,?,?)");
    for (const r of review.rejected) putReject.run(runId,r.idHash,r.reason,r.textHash);
    const putTicker=db.prepare(
      "INSERT INTO dgrf12_legacy_ticker_receipts(run_id,legacy_event_sha256,ticker,reason_json,review_sha256) VALUES(?,?,?,?,?)");
    for (const r of legacy.checks) {
      const text=JSON.stringify(r.reasonCodes);
      putTicker.run(runId,r.legacyEventSha256,r.ticker,text,sha(text));
    }
    db.exec("COMMIT");
  } catch(err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return payload;
}

export function latestReview(db: DatabaseSync, max=20) {
  const fail = (state: string) =>
    ({state,readOnlyFinance:true,canTrade:false,acceptedFinancialSignals:0,candidates:[]});
  const run=db.prepare("SELECT id,observed_at,payload,payload_sha256 FROM dgrf12_runs ORDER BY id DESC LIMIT 1")
    .get() as Record<string,unknown>|undefined;
  if (!run) return {
    schemaVersion:"eoe.geo.dgrf12-p0p1p2/1",
    ...fail("NO_REVIEW_CYCLE"),
  };
  const payload=String(run.payload);
  if (sha(payload)!==run.payload_sha256) return fail("SHA_INTEGRITY_FAILURE");
  let data: ResearchCycle;
  try { data=JSON.parse(payload) as ResearchCycle; }
  catch { return fail("SHA_INTEGRITY_FAILURE"); }
  if (data.canTrade!==false || data.acceptedFinancialSignals!==0 ||
      data.independentlyVerifiedEvents!==0 || data.issuerEvidenceCertified!==0 ||
      data.state!=="RESEARCH_CANDIDATES_ONLY" ||
      data.readOnlyFinance!==true || data.schemaVersion!=="eoe.geo.dgrf12-p0p1p2/1")
    return fail("UNTRUSTED_REVIEW_AUTHORITY");
  // Verify EVERY receipt before slicing output. Otherwise callers could
  // request max=1 and miss a tampered or deleted record on a later page.
  const candidateRows=db.prepare(
    "SELECT candidate_id,review_json,review_sha256 FROM dgrf12_candidate_receipts WHERE run_id=? ORDER BY rowid"
  ).all(Number(run.id)) as Array<Record<string,unknown>>;
  const rejectedRows=db.prepare(
    "SELECT id_hash,reason,text_sha256 FROM dgrf12_rejected_receipts WHERE run_id=? ORDER BY rowid"
  ).all(Number(run.id)) as Array<Record<string,unknown>>;
  const tickerRows=db.prepare(
    "SELECT legacy_event_sha256,ticker,reason_json,review_sha256 FROM dgrf12_legacy_ticker_receipts WHERE run_id=? ORDER BY rowid"
  ).all(Number(run.id)) as Array<Record<string,unknown>>;
  if (candidateRows.length>1000 || rejectedRows.length>5000 || tickerRows.length>5000)
    return fail("SHA_INTEGRITY_FAILURE");
  const candidates: Array<Record<string,unknown>>=[];
  const rejected=[];
  const legacy=[];
  const blocked:Record<string,number>={};
  try {
    for (const row of candidateRows) {
      if (sha(String(row.review_json))!==row.review_sha256)
        return fail("SHA_INTEGRITY_FAILURE");
      const c=JSON.parse(String(row.review_json));
      if (c.candidateId!==row.candidate_id || c.verifiedEvent!==false ||
          c.eligibleForFinancialModel!==false || c.verifiedSourceCount!==0)
        return fail("UNTRUSTED_REVIEW_AUTHORITY");
      candidates.push(c);
    }
    for (const row of rejectedRows) {
      const idHash=String(row.id_hash),reason=String(row.reason),textHash=String(row.text_sha256);
      if (!/^[0-9a-f]{64}$/.test(idHash) || !/^[0-9a-f]{64}$/.test(textHash))
        return fail("SHA_INTEGRITY_FAILURE");
      rejected.push({idHash,textHash,reason});
    }
    for (const row of tickerRows) {
      const text=String(row.reason_json);
      if (sha(text)!==row.review_sha256) return fail("SHA_INTEGRITY_FAILURE");
      const reasonCodes=JSON.parse(text);
      if (!Array.isArray(reasonCodes) || !reasonCodes.every((x:unknown)=>typeof x==="string"))
        return fail("SHA_INTEGRITY_FAILURE");
      for(const reason of reasonCodes) blocked[reason]=(blocked[reason]||0)+1;
      legacy.push({
        legacyEventSha256:String(row.legacy_event_sha256),
        ticker:row.ticker == null ? null : String(row.ticker),
        reasonCodes,approved:false,
      });
    }
    const unsigned:Record<string,unknown>={...data};
    delete unsigned.runSha256;
    const digest=sha(JSON.stringify({
      observedAt:String(run.observed_at),unsigned,candidates,rejected,legacy,
    }));
    if (digest!==data.runSha256 ||
        data.manualReviewCandidates!==candidateRows.length ||
        data.rejectedMentions!==rejectedRows.length ||
        data.quarantinedLegacyExposureChecks!==tickerRows.length ||
        data.legacyExposureBlocked!==tickerRows.length)
      return fail("SHA_INTEGRITY_FAILURE");
  } catch { return fail("SHA_INTEGRITY_FAILURE"); }
  const reasons:Record<string,number>={};
  for (const r of rejected) reasons[r.reason]=(reasons[r.reason]||0)+1;
  const limit=Math.max(1,Math.min(50,max));
  return {
    ...data,lastObservedAtUTC:String(run.observed_at),
    rejectedReasonCounts:reasons,
    legacyBlockedReasonCounts:blocked,
    candidates:candidates.slice(0,limit),
  };
}
