import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { setupReviewLedger,recordResearchCycle,latestReview } from "./v2-ledger";
import type { Alert } from "./identity";

function fixture() {
  const db=new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON;");
  db.exec("CREATE TABLE risk_events (id TEXT PRIMARY KEY,first_seen_at TEXT NOT NULL,status TEXT NOT NULL);");
  db.exec("CREATE TABLE risk_analyses (event_id TEXT PRIMARY KEY,exposures_json TEXT NOT NULL);");
  db.prepare("INSERT INTO risk_events VALUES(?,?,?)")
    .run("telegram:historical-blockade","2026-10-09T00:03:00Z","analyzed");
  db.prepare("INSERT INTO risk_analyses VALUES(?,?)")
    .run("telegram:historical-blockade",JSON.stringify([
      {ticker:"BRIT",direction:"down",verified:true},
      {ticker:"XOM",direction:"up",verified:false},
      {ticker:"GIBBERISH!",direction:"watch",verified:false},
    ]));
  setupReviewLedger(db);
  return db;
}
const posts: Alert[]=[
  {id:"QudsNen/241500",channelUsername:"QudsNen",
   text:"Former UNRWA spokesperson questioned occupation since 1967 and Gaza blockade imposed in 2007.",
   receivedAt:"2026-10-09T00:03:16Z"},
  {id:"Alsaa_plus_EN/33474",channelUsername:"Alsaa_plus_EN",
   text:"RSAF conducted airstrikes on Yemen's capital, Sanaa controlled by the Houthi movement",
   receivedAt:"2026-10-08T20:16:00Z"},
  {id:"QudsNen/241498",channelUsername:"QudsNen",
   text:"Israeli Foreign Minister announced British diplomats out of UK consulate in Jerusalem. British consular status withdrawn.",
   receivedAt:"2026-10-08T22:02:18Z"},
];

test("P0/P1/P2 ledger on original regression set, 0 financial signals", () => {
  const db=fixture();
  const out=recordResearchCycle(db,posts,"2026-10-09T04:00:00Z");
  assert.equal(out.manualReviewCandidates,2);
  assert.equal(out.rejectedMentions,1);
  assert.equal(out.quarantinedLegacyDraftEvents,1);
  assert.equal(out.quarantinedLegacyExposureChecks,3);
  assert.equal(out.legacyExposureBlocked,3);
  assert.equal(out.acceptedFinancialSignals,0);
  const read=latestReview(db);
  assert.equal(read.state,"RESEARCH_CANDIDATES_ONLY");
  assert.equal(read.candidates.length,2);
  assert.equal(read.candidates.every(x => x.verifiedEvent===false),true);
  assert.equal(read.legacyBlockedReasonCounts["PIT_LISTING_CERTIFICATE_UNAVAILABLE"],3);
  assert.equal(read.rejectedReasonCounts["HISTORICAL_COMMENTARY_NOT_NEW_INCIDENT"],1);
  assert.equal(db.prepare("SELECT COUNT(*) as n FROM risk_events").get().n,1);
  assert.equal(db.prepare("SELECT status FROM risk_events").get().status,"analyzed");
  db.close();
});
test("append-only research runs, no legacy rows ever updated", () => {
  const db=fixture();
  const first=recordResearchCycle(db,posts,"2026-10-09T04:00:00Z");
  const second=recordResearchCycle(db,posts,"2026-10-09T04:10:00Z");
  assert.notEqual(first.runSha256,second.runSha256);
  assert.equal(db.prepare("SELECT count(*) AS n FROM dgrf12_runs").get().n,2);
  assert.equal(db.prepare("SELECT count(*) AS n FROM risk_analyses").get().n,1);
  db.close();
});
test("modifying an append-only receipt fails closed on read", () => {
  const db=fixture();
  recordResearchCycle(db,posts,"2026-10-09T04:00:00Z");
  db.exec("UPDATE dgrf12_candidate_receipts SET review_json='{}';");
  const out=latestReview(db);
  assert.equal(out.state,"SHA_INTEGRITY_FAILURE");
  assert.equal(out.canTrade,false);
  assert.equal(out.acceptedFinancialSignals,0);
  db.close();
});
test("modifying top-level ledger fails closed", () => {
  const db=fixture();
  recordResearchCycle(db,posts,"2026-10-09T04:00:00Z");
  db.exec("UPDATE dgrf12_runs SET payload='{}';");
  const out=latestReview(db);
  assert.equal(out.state,"SHA_INTEGRITY_FAILURE");
  assert.equal(out.canTrade,false);
  db.close();
});
test("missing review table state is unknown and cannot be traded", () => {
  const db=fixture();
  const out=latestReview(db);
  assert.equal(out.state,"NO_REVIEW_CYCLE");
  assert.equal(out.canTrade,false);
  assert.equal(out.acceptedFinancialSignals,0);
  db.close();
});
