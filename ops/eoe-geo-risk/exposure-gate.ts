/**
 * D-GRF12 P2: draft ticker/issuer grounding. Zero trust for language-model
 * tickers and rationales; a price/quote response alone is not issuer or
 * causal-exposure evidence. There is deliberately NO capital-eligible path.
 */
import type { CandidateReview } from "./identity";

export type ModelDraft = { ticker: string; direction: string;
  rationale?: string; verified?: boolean };
export type ListingCertificate = {
  ticker: string;
  exchange: string;
  issuerLegalName: string;
  validFromUTC: string;
  validToUTC: string | null;
  listingDocumentURL: string;
  listingDocumentSHA256: string;
  issuerLEI: string;
};
export type EventTransmissionCertificate = {
  candidateId: string;
  ticker: string;
  issuerLEI: string;
  mechanism: "supply_chain" | "revenue_exposure" | "logistics" | "energy_supply" | "other";
  primaryDocumentURL: string;
  primaryDocumentSHA256: string;
  evidencePublishedUTC: string;
  humanReviewStatus: "REVIEWED" | "UNREVIEWED";
};
export type TickerCheck = {
  normalizedTicker: string | null;
  state: "BLOCKED" | "PENDING_INDEPENDENT_AUDIT";
  reasonCodes: string[];
  verified: false;
  tradeAllowed: false;
};
const exchangeCodes = new Set(["XNYS","XNAS","XASE","XLON","XKRX","XHKG","XTKS"]);
const shaFormat = /^[0-9a-f]{64}$/i;
const tickerPattern = /^[A-Z0-9]{1,5}(?:[.-][A-Z]{1,2})?$/;
const https = (value: string) => {
  try { const u = new URL(value); return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password; }
  catch { return false; }
};
function at(text: string): number {
  const val = Date.parse(text);
  return Number.isFinite(val) ? val : NaN;
}

export function checkTickerDraft(
  draft: ModelDraft, candidate: CandidateReview | null, eventUTC: string,
  listings: readonly ListingCertificate[] = [],
  transmissions: readonly EventTransmissionCertificate[] = [],
): TickerCheck {
  const sym = String(draft.ticker ?? "").trim().toUpperCase();
  const reasons: string[] = [];
  if (!tickerPattern.test(sym)) reasons.push("INVALID_TICKER_FORMAT");
  if (draft.direction !== "up" && draft.direction !== "down" && draft.direction !== "watch")
    reasons.push("INVALID_DIRECTION");
  // Models may hallucinate e.g. BRIT, FSUK, historic delisted RTN. A plausible
  // spelling or quote history NEVER establishes an investable instrument.
  const listing = listings.find(x => x.ticker === sym);
  const eventAt = at(eventUTC);
  if (!listing) reasons.push("PIT_LISTING_CERTIFICATE_UNAVAILABLE");
  else if (
    !exchangeCodes.has(listing.exchange) ||
    !listing.issuerLegalName || !/^[A-Z0-9]{18}[0-9]{2}$/.test(listing.issuerLEI) ||
    !shaFormat.test(listing.listingDocumentSHA256) ||
    !https(listing.listingDocumentURL) ||
    !Number.isFinite(eventAt) ||
    !(at(listing.validFromUTC) <= eventAt &&
      (listing.validToUTC == null || eventAt < at(listing.validToUTC)))
  ) reasons.push("PIT_LISTING_CERTIFICATE_INVALID_OR_OUT_OF_WINDOW");
  if (!candidate || candidate.verifiedEvent !== true ||
      candidate.verifiedSourceCount < 2 || candidate.eventIdentityStatus !== "EXACT_EXTERNAL_INCIDENT_ID") {
    reasons.push("SPECIFIC_EVENT_NOT_INDEPENDENTLY_VERIFIED");
  }
  const transmission = transmissions.find(x => x.ticker === sym &&
    x.candidateId === candidate?.candidateId);
  if (!transmission) reasons.push("CAUSAL_ISSUER_TRANSMISSION_EVIDENCE_MISSING");
  else if (
    !listing || transmission.issuerLEI !== listing.issuerLEI ||
    transmission.humanReviewStatus !== "REVIEWED" ||
    !https(transmission.primaryDocumentURL) ||
    !shaFormat.test(transmission.primaryDocumentSHA256) ||
    !(at(transmission.evidencePublishedUTC) <= eventAt)
  ) reasons.push("CAUSAL_ISSUER_TRANSMISSION_NOT_TIME_VERIFIED");
  if (draft.verified === true)
    reasons.push("MODEL_SELF_VERIFICATION_IGNORED");
  // Even all independently pinned references are a human-research shortlist,
  // never a stock-direction or PRE approval by this module.
  return {
    normalizedTicker: tickerPattern.test(sym) ? sym : null,
    state: reasons.length ? "BLOCKED" : "PENDING_INDEPENDENT_AUDIT",
    reasonCodes: reasons.length ? [...new Set(reasons)] : ["HUMAN_MARKET_IMPACT_AUDIT_REQUIRED"],
    verified: false,
    tradeAllowed: false,
  };
}
export function summarizeTickerChecks(
  drafts: readonly ModelDraft[], candidate: CandidateReview | null, eventUTC: string,
  listings: readonly ListingCertificate[] = [],
  transmissions: readonly EventTransmissionCertificate[] = [],
) {
  const results = drafts.slice(0, 50).map(d =>
    checkTickerDraft(d,candidate,eventUTC,listings,transmissions));
  return {
    checkedDraftCount: results.length,
    blocked: results.filter(x => x.state === "BLOCKED").length,
    pendingHumanMarketAudit: results.filter(x => x.state === "PENDING_INDEPENDENT_AUDIT").length,
    verifiedFinancialSignals: 0,
    tradeAllowed: false,
    checks: results,
  };
}
