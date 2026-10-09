import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateIdentityAndLineage, extractIncident } from "./identity";
import { checkTickerDraft, summarizeTickerChecks } from "./exposure-gate";
import type { Alert } from "./identity";

const at = (id: string, channel: string, text: string, receivedAt="2026-10-08T20:16:00.000Z"): Alert => (
  {id,channelUsername:channel,text,receivedAt});
const strike = "RSAF conducted airstrikes on Yemen's capital, Sanaa, which is controlled by the Houthi movement.";

test("P0: historic Gaza blockade quote is not a new shipping risk", () => {
  const x=extractIncident(at("QudsNen/241500","QudsNen",
    "Former UNRWA spokesperson Chris Gunness challenged the Israeli narrative surrounding October 7 since 1967, and the blockade imposed on Gaza in 2007."));
  assert.equal(x.status,"REJECTED");
  assert.equal(x.reason,"HISTORICAL_COMMENTARY_NOT_NEW_INCIDENT");
});
test("P0: Jerusalem UK consulate story has a diplomatic, not stock sanction identity", () => {
  const x=extractIncident(at("QudsNen/241498","QudsNen",
    "Israeli Foreign Minister Gideon Sa'ar said Israel forced British diplomats out of the UK consulate in occupied Jerusalem, in retaliation for Britain's sanctions on settlements, and stripped the consulate of consular status."));
  assert.equal(x.eventType,"diplomatic_status_change");
  assert.equal(x.location,"jerusalem");
  assert.equal(x.mechanism,"consular_status_change");
  assert.equal(x.status,"CANDIDATE");
});
test("P0: Sanaa airstrike is separated from US embassy Yemen security alert", () => {
  const result=evaluateIdentityAndLineage([
    at("Alsaa_plus_EN/33474","Alsaa_plus_EN",strike),
    at("middle_east_spectator/782","middle_east_spectator",
      "The U.S. Embassy in Jerusalem issued a security alert citing a situation between Yemen and Saudi Arabia"),
  ]);
  assert.equal(result.acceptedForManualReview.length,1);
  assert.equal(result.acceptedForManualReview[0].identity.eventType,"airstrike_claim");
  assert.equal(result.acceptedForManualReview[0].identity.actor,"saudi_arabia");
  assert.equal(result.acceptedForManualReview[0].eventIdentityStatus,"PROVISIONAL");
  assert.equal(result.acceptedForManualReview[0].verifiedSourceCount,0);
});
test("P0: same city and actor but different strike facilities have different IDs", () => {
  const a=evaluateIdentityAndLineage([
    at("A/123","A","Saudi Arabia conducted airstrikes on Sanaa airport early today"),
    at("B/124","B","Saudi Arabia conducted airstrikes on Sanaa refinery early today"),
  ]);
  assert.equal(a.acceptedForManualReview.length,2);
  assert.notEqual(a.acceptedForManualReview[0].candidateId,a.acceptedForManualReview[1].candidateId);
});
test("P0: cross-2h boundary stays separate, no unsafe automatic merge", () => {
  const out=evaluateIdentityAndLineage([
    at("A/1","A",strike,"2026-10-08T19:59:00Z"),
    at("B/2","B",strike,"2026-10-08T20:03:00Z"),
  ]);
  assert.equal(out.acceptedForManualReview.length,2);
});
test("P0: no geography or actor means quarantine, even strong keywords", () => {
  const out=evaluateIdentityAndLineage([
    at("A/1","A","Breaking: Airstrike was reported near unspecified military positions early today"),
    at("B/2","B","Explosions and missiles were widely reported across the region this evening"),
  ]);
  assert.equal(out.acceptedForManualReview.length,0);
  assert.ok(out.rejected.length>=2);
});
test("P1: distinct Telegram relays of same attributed source are not independent", () => {
  const out=evaluateIdentityAndLineage([
    at("A/1","A",strike+" via @SharedOrigin"),
    at("B/2","B",strike+" from @SharedOrigin"),
  ]);
  const event=out.acceptedForManualReview[0];
  assert.equal(event.distinctTelegramRelays,2);
  assert.equal(event.originalAttributionGroups,1);
  assert.equal(event.sourceIndependenceStatus,"ATTRIBUTION_COLLISION");
  assert.equal(event.verifiedSourceCount,0);
  assert.equal(event.eligibleForFinancialModel,false);
});
test("P1: separate unsourced Telegram channels never count as verified origins", () => {
  const out=evaluateIdentityAndLineage([
    at("A/1","A",strike),
    at("B/2","B","Reports confirm Saudi air force conducted airstrikes in Sanaa, Yemen."),
  ]);
  assert.equal(out.acceptedForManualReview.length,1);
  const event=out.acceptedForManualReview[0];
  assert.equal(event.distinctTelegramRelays,2);
  assert.equal(event.verifiedEvent,false);
  assert.equal(event.verifiedSourceCount,0);
  assert.equal(event.sourceIndependenceStatus,"NOT_PROVEN");
});
test("P1: same ID with tampered divergent body cannot be counted twice", () => {
  const out=evaluateIdentityAndLineage([
    at("A/1","A",strike),
    at("A/1","A","Saudi Arabia conducted airstrikes on Sanaa airport; different body."),
  ]);
  assert.equal(out.acceptedForManualReview.length,0);
  assert.ok(out.rejected.some(x=>x.reason==="SAME_POST_ID_TEXT_CHANGED"));
});
test("P1: output IDs and lineage hashes deterministic under shuffled intake", () => {
  const posts=[
    at("A/1","A",strike),
    at("B/2","B","Saudi Arabia conducted airstrikes on Sanaa, Yemen.", "2026-10-08T20:17:00Z"),
  ];
  const one=evaluateIdentityAndLineage(posts).acceptedForManualReview[0];
  const two=evaluateIdentityAndLineage([...posts].reverse()).acceptedForManualReview[0];
  assert.equal(one.candidateId,two.candidateId);
  assert.deepEqual(one.sourceEvidenceHashes,two.sourceEvidenceHashes);
});
test("P2: fabricated, delisted or unconfirmed tickers cannot pass", () => {
  const x=checkTickerDraft({ticker:"BRIT",direction:"down",verified:true},null,"2026-10-08T20:16:00Z");
  assert.equal(x.state,"BLOCKED");
  assert.ok(x.reasonCodes.includes("PIT_LISTING_CERTIFICATE_UNAVAILABLE"));
  assert.ok(x.reasonCodes.includes("MODEL_SELF_VERIFICATION_IGNORED"));
  const bad=checkTickerDraft({ticker:"$$$DONK",direction:"up"},null,"2026-10-08T20:16:00Z");
  assert.equal(bad.normalizedTicker,null);
  assert.equal(bad.tradeAllowed,false);
});
test("P2: even a syntactically valid real ticker is no causal issuer evidence", () => {
  const x=checkTickerDraft({ticker:"XOM",direction:"up"},null,"2026-10-08T20:16:00Z");
  assert.ok(x.reasonCodes.includes("SPECIFIC_EVENT_NOT_INDEPENDENTLY_VERIFIED"));
  assert.ok(x.reasonCodes.includes("CAUSAL_ISSUER_TRANSMISSION_EVIDENCE_MISSING"));
  assert.equal(x.verified,false);
});
test("P2: multi-draft result is never permitted into PRE", () => {
  const out=summarizeTickerChecks([
    {ticker:"HON",direction:"down"},{ticker:"RTN",direction:"down"},
    {ticker:"BAES.L",direction:"down"},{ticker:"LMT.N",direction:"down"},
    {ticker:"FSUK",direction:"watch"},
  ],null,"2026-10-08T20:16:00Z");
  assert.equal(out.checkedDraftCount,5);
  assert.equal(out.blocked,5);
  assert.equal(out.verifiedFinancialSignals,0);
  assert.equal(out.tradeAllowed,false);
});
