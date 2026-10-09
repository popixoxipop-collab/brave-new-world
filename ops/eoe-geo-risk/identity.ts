/**
 * D-GRF12 P0/P1: strict, fail-closed identity and information-origin review.
 *
 * This REPLACES the old event_class|geography grouping for the *research
 * candidate plane*, not the original append-only risk_events or the actual
 * fund PRE. Distinct Telegram relays are never assumed to be independent
 * first-hand reporting. Source text is untrusted input; it cannot authorize
 * a verified event, a financial impact, or an order.
 */
import { createHash } from "node:crypto";

export type Alert = {
  id: string; channelUsername: string; text: string; receivedAt: string;
};
export type EventType =
  | "diplomatic_status_change"
  | "airstrike_claim"
  | "shipping_disruption_claim"
  | "infrastructure_attack_claim"
  | "sanctions_action_claim"
  | "unknown";
export type Extracted = {
  eventType: EventType;
  actor: string | null;
  target: string | null;
  location: string | null;
  mechanism: string | null;
  specificIncidentRef: string | null;
  status: "CANDIDATE" | "REJECTED";
  reason: string;
  textHash: string;
  receivedAt: string;
  relayChannel: string;
  originalAttribution: string | null;
  linkHost: string | null;
  normalizedText: string;
};
export type CandidateReview = {
  candidateId: string;
  identity: { eventType: EventType; actor: string; target: string;
    location: string; mechanism: string; timeBucketUTC: string; };
  firstObservedAtUTC: string;
  lastObservedAtUTC: string;
  alertCount: number;
  distinctTelegramRelays: number;
  originalAttributionGroups: number;
  sourceEvidenceHashes: string[];
  eventIdentityStatus: "PROVISIONAL" | "EXACT_EXTERNAL_INCIDENT_ID";
  sourceIndependenceStatus: "NOT_PROVEN" | "ATTRIBUTION_COLLISION";
  verifiedSourceCount: 0;
  verifiedEvent: false;
  eligibleForFinancialModel: false;
  reasons: string[];
};
export type P0P1Review = {
  acceptedForManualReview: CandidateReview[];
  rejected: Array<{ idHash: string; reason: string; textHash: string }>;
  intake: number;
  duplicatedPostIds: number;
  policyVersion: "eoe.geo.identity-lineage/2";
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const hourMs = 2 * 60 * 60 * 1000;
const longDatedHistory = /\b(?:since\s+(?:19|20)\d{2}|back\s+in\s+(?:19|20)\d{2}|in\s+2007\b|decades\s+of|historical\s+(?:account|narrative|overview)|anniversary|remembering|look(?:ing)?\s+back|former\s+unrwa\s+spokesperson|quoted\s+from\s+20\d\d)\b/i;
const quotesHistory = /\b(?:argued|commentary|challenged\s+the\s+narrative|questioned\s+the\s+invocation)\b/i;
const incidentAction = /\b(?:conducted|carried\s+out|launched|struck|hit|attack(?:ed|s)?|reports?\s+of|confirm(?:ed|s)?)\b/i;
const strikes = /\b(?:airstrike|airstrikes|air\s+strike|missile\s+strike|drone\s+strike|bombard(?:ment|ed)|bombed|struck)\b/i;

function normText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/https?:\/\/\S+/gu, " ")
    .replace(/@\w+/gu, " ").replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim().slice(0, 1500);
}
function normalizeOrg(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 64);
}
function originalAttribution(text: string): string | null {
  // An @handle is only an attribution when explicit provenance is present.
  // "via @foo", "source: @foo", "credit @foo" or final repost signature.
  const m = text.match(/\b(?:via|from|source:|credit:|by)\s+@([A-Za-z][\w]{2,60})\b/i);
  const suffix = text.match(/(?:^|\s)@([A-Za-z][\w]{2,60})\s*$/);
  return normalizeOrg(m?.[1] || suffix?.[1] || "") || null;
}
function originHost(text: string): string | null {
  const m = text.match(/https?:\/\/([a-z0-9.-]+)(?:\/|$)/i);
  const host = m?.[1]?.toLowerCase().replace(/^www\./, "") || null;
  return host && !/^(t\.me|telegram\.me|x\.com|twitter\.com)$/.test(host) ? host : null;
}
function chooseLocation(x: string): string | null {
  const locs: Array<[RegExp,string]> = [
    [/\b(?:sanaa|sana['’]?a|sana city|capital of yemen)\b/i, "sanaa_yemen"],
    [/\b(?:abqaiq)\b/i, "abqaiq_saudi_arabia"],
    [/\b(?:jerusalem)\b/i, "jerusalem"],
    [/\b(?:rafah)\b/i, "rafah_gaza"],
    [/\b(?:gaza)\b/i, "gaza"],
    [/\b(?:hormuz|strait of hormuz)\b/i, "strait_of_hormuz"],
    [/\b(?:bab[\s-]+el[\s-]+mandeb)\b/i, "bab_el_mandeb"],
    [/\b(?:suez(?:\s+canal)?)\b/i, "suez_canal"],
    [/\b(?:red sea)\b/i, "red_sea"],
    [/\b(?:taiwan strait)\b/i, "taiwan_strait"],
    [/\b(?:kiev|kyiv)\b/i, "kyiv_ukraine"],
  ];
  return locs.find(([p]) => p.test(x))?.[1] || null;
}
function chooseFacility(x: string): string | null {
  const types: Array<[RegExp,string]> = [
    [/\b(?:airport|airbase|airfield)\b/i,"aviation_facility"],
    [/\b(?:refinery|oil terminal|processing plant|oil processing)\b/i,"petroleum_facility"],
    [/\b(?:port|harbor|seaport)\b/i,"seaport"],
    [/\b(?:embassy|consulate)\b/i,"diplomatic_facility"],
    [/\b(?:hospital|school|residential building)\b/i,"civilian_site"],
    [/\b(?:military base|weapons depot)\b/i,"military_facility"],
  ];
  return types.find(([p]) => p.test(x))?.[1] || null;
}
function chooseActor(x: string): string | null {
  const actors: Array<[RegExp,string]> = [
    [/\b(?:rsaf|saudi\s+(?:arabia|air\s+force|military)|saudi-led)\b/i,"saudi_arabia"],
    [/\b(?:uk|britain|british|united kingdom)\b/i,"united_kingdom"],
    [/\b(?:israel(?:i)?|idf)\b/i,"israel"],
    [/\b(?:houthis?|ansar\s+allah)\b/i,"houthi"],
    [/\b(?:pakistan(?:i)?)\b/i,"pakistan"],
    [/\b(?:russia(?:n)?|putin)\b/i,"russia"],
    [/\b(?:ukraine|ukrainian)\b/i,"ukraine"],
    [/\b(?:iran(?:ian)?)\b/i,"iran"],
    [/\b(?:usa|u\.s\.|united states|american)\b/i,"united_states"],
  ];
  return actors.find(([p]) => p.test(x))?.[1] || null;
}
/** Reserved for future *externally issued* incident IDs; do NOT derive from post IDs. */
function externalIncidentRef(_text: string): string | null { return null; }

export function extractIncident(alert: Alert): Extracted {
  const x = (alert.text || "").slice(0, 2400);
  const normalizedText = normText(x);
  const common = {
    receivedAt: alert.receivedAt,
    relayChannel: alert.channelUsername,
    textHash: hash(x),
    normalizedText,
    originalAttribution: originalAttribution(x),
    linkHost: originHost(x),
    specificIncidentRef: externalIncidentRef(x),
  };
  const reject = (reason: string): Extracted => ({
    ...common, eventType: "unknown", actor: null, target: null, location: null,
    mechanism: null, status: "REJECTED", reason,
  });
  const dt = Date.parse(alert.receivedAt);
  if (!Number.isFinite(dt) || !/^[a-zA-Z0-9_.-]{1,80}\/\d+$/.test(alert.id))
    return reject("INVALID_POST_ID_OR_TIME");
  if (x.trim().length < 20) return reject("MESSAGE_TOO_SHORT");
  if (longDatedHistory.test(x) && (quotesHistory.test(x) || /blockad|unrwa|occupation/i.test(x)))
    return reject("HISTORICAL_COMMENTARY_NOT_NEW_INCIDENT");
  const actor = chooseActor(x);
  const location = chooseLocation(x);
  // Diplomatic status is not an imposed stock-trading sanction simply because
  // older settlements sanctions are mentioned in the press article.
  if (/\b(?:consulate|consul\s+general|diplomatic\s+presence|diplomats)\b/i.test(x)
      && /\b(?:withdraw|stripp?ed|retaliat|status|consular|expel|forc(?:ed|ing)|close|reclassif)/i.test(x)) {
    const both = /\b(?:britain|british|uk\b|united kingdom)\b/i.test(x)
      && /\b(?:israel|israeli)\b/i.test(x);
    if (!both || location !== "jerusalem") return reject("DIPLOMATIC_EVENT_ACTOR_LOCATION_UNPINNED");
    return { ...common, eventType: "diplomatic_status_change", actor: "israel",
      target: "united_kingdom", location, mechanism: "consular_status_change",
      status: "CANDIDATE", reason: "DIPLOMATIC_ONLY_NONMARKET" };
  }
  if (/\b(?:strait|canal|shipping|vessel|tanker|sea)\b/i.test(x)
      && /\b(?:block(?:ed|ade)|clos(?:ed|ure)|halt(?:ed)?|disrupt(?:ed|ion)|attack(?:ed|s)?|mine(?:d)?)\b/i.test(x)) {
    if (!location || !["strait_of_hormuz","bab_el_mandeb","suez_canal","red_sea","taiwan_strait"].includes(location))
      return reject("CHOKEPOINT_SPECIFIC_LOCATION_MISSING");
    if (!actor) return reject("CHOKEPOINT_ACTOR_UNIDENTIFIED");
    return { ...common, eventType: "shipping_disruption_claim", actor,
      target: "maritime_transit", location, mechanism: "shipping_restriction",
      status: "CANDIDATE", reason: "UNVERIFIED_SHIPPING_REPORT" };
  }
  if (strikes.test(x) && incidentAction.test(x)) {
    if (!location) return reject("MILITARY_EVENT_TARGET_LOCATION_MISSING");
    if (!actor) return reject("MILITARY_EVENT_ACTOR_MISSING");
    // Avoid spurious exact identity across two strikes by the same army at the
    // same location; an externally anchored incident id is still mandatory.
    return { ...common, eventType: "airstrike_claim", actor,
      target: location + ":" + (chooseFacility(x) || "unspecified_site"), location, mechanism: "kinetic_strike",
      status: "CANDIDATE", reason: "INCIDENT_IDENTITY_UNVERIFIED" };
  }
  if (/\b(?:explosion|sabotage|pipeline\s+attack|refinery\s+attack|power\s+plant\s+attack)\b/i.test(x)) {
    if (!actor || !location) return reject("INFRA_ATTACK_ACTOR_OR_LOCATION_UNKNOWN");
    return { ...common, eventType: "infrastructure_attack_claim", actor,
      target: location + ":" + (chooseFacility(x) || "unspecified_site"), location, mechanism: "physical_damage",
      status: "CANDIDATE", reason: "INCIDENT_IDENTITY_UNVERIFIED" };
  }
  if (/\b(?:sanction(?:ed|s)?|embargo|asset freeze|export controls?)\b/i.test(x)
      && /\b(?:impos(?:ed|es)|announc(?:ed|es)|new|targeted|expand(?:ed|s)?)\b/i.test(x)) {
    if (!actor || !location) return reject("SANCTION_ACTOR_OR_LOCATION_UNKNOWN");
    return { ...common, eventType: "sanctions_action_claim", actor, target: location,
      location, mechanism: "legal_trade_restriction",
      status: "CANDIDATE", reason: "LEGAL_EVENT_INDEPENDENT_SOURCE_REQUIRED" };
  }
  return reject("NO_SPECIFIC_ACTION_IDENTITY");
}

function similarity(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(s => s.length > 2));
  const B = new Set(b.split(" ").filter(s => s.length > 2));
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const t of A) if (B.has(t)) i++;
  return i / (A.size + B.size - i);
}
function originGroup(ev: Extracted): string {
  if (ev.originalAttribution) return "attribution:" + ev.originalAttribution;
  if (ev.linkHost) return "linked:" + ev.linkHost;
  return "relay:" + normalizeOrg(ev.relayChannel);
}

export function evaluateIdentityAndLineage(alerts: Alert[]): P0P1Review {
  const unique = new Map<string, Alert>();
  const poisonedIds = new Set<string>();
  const reject: P0P1Review["rejected"] = [];
  for (const a of alerts) {
    if (!a || typeof a.id !== "string" || poisonedIds.has(a.id)) continue;
    const original = unique.get(a.id);
    if (original && original.text !== a.text) {
      reject.push({ idHash: hash(a.id), textHash: hash(a.text),
                    reason: "SAME_POST_ID_TEXT_CHANGED" });
      unique.delete(a.id);
      poisonedIds.add(a.id); // permanently quarantine this source identity
    } else if (!original) unique.set(a.id, a);
  }
  const groups = new Map<string, Extracted[]>();
  for (const a of unique.values()) {
    const item = extractIncident(a);
    if (item.status !== "CANDIDATE") {
      reject.push({ idHash: hash(a.id), textHash: item.textHash, reason: item.reason });
      continue;
    }
    // This 2h bucket is a *review grouping only*. Never equate it to a specific
    // event or independent corroboration. No cross-window automatic merge.
    const bucket = Math.floor(Date.parse(item.receivedAt) / hourMs);
    const key = [item.eventType,item.actor,item.target,item.location,
                 item.mechanism,bucket].join("|");
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const reviews: CandidateReview[] = [];
  for (const [key, items] of groups) {
    const sorted = items.sort((a,b) => a.receivedAt.localeCompare(b.receivedAt));
    const originSets = new Map<string, string[]>();
    for (const item of sorted) {
      let origin = originGroup(item);
      // Two near-verbatim relay posts carry a common information origin.
      // Use the first item's origin as the union representative.
      for (const [g, texts] of originSets) {
        if (texts.some(t => similarity(t,item.normalizedText) >= 0.82)) {
          origin = g;
          break;
        }
      }
      originSets.set(origin,[...(originSets.get(origin)||[]),item.normalizedText]);
    }
    const identity = sorted[0];
    const relayCount = new Set(sorted.map(i=>normalizeOrg(i.relayChannel))).size;
    const noIndependentOrig = originSets.size < relayCount;
    const status: CandidateReview["sourceIndependenceStatus"] =
      noIndependentOrig ? "ATTRIBUTION_COLLISION" : "NOT_PROVEN";
    const reasons = [
      "INCIDENT_UNIQUE_EXTERNAL_ID_MISSING",
      "INDEPENDENT_ORIGIN_EVIDENCE_NOT_PRESENT",
      "TELEGRAM_RELAYS_ARE_NOT_INDEPENDENT_REPORTERS",
      "STOCK_EXPOSURE_UNVERIFIED",
    ];
    if (noIndependentOrig) reasons.push("SYNDICATED_OR_REPOSTED_ATTRIBUTION");
    if (identity.eventType === "diplomatic_status_change")
      reasons.push("DIPLOMATIC_NOT_SANCTIONS_TRADING_EVENT");
    reviews.push({
      candidateId: "geo2:" + hash(key).slice(0, 40),
      identity: {
        eventType: identity.eventType, actor: identity.actor!,
        target: identity.target!, location: identity.location!,
        mechanism: identity.mechanism!,
        timeBucketUTC: new Date(Math.floor(Date.parse(identity.receivedAt)/hourMs)*hourMs).toISOString(),
      },
      firstObservedAtUTC: identity.receivedAt,
      lastObservedAtUTC: sorted[sorted.length-1].receivedAt,
      alertCount: sorted.length,
      distinctTelegramRelays: relayCount,
      originalAttributionGroups: originSets.size,
      sourceEvidenceHashes: [...new Set(sorted.map(i => i.textHash))].sort(),
      eventIdentityStatus: "PROVISIONAL",
      sourceIndependenceStatus: status,
      verifiedSourceCount: 0,
      verifiedEvent: false,
      eligibleForFinancialModel: false,
      reasons,
    });
  }
  return {
    policyVersion: "eoe.geo.identity-lineage/2",
    intake: alerts.length,
    duplicatedPostIds: alerts.length - unique.size,
    acceptedForManualReview: reviews.sort((a,b) => b.firstObservedAtUTC.localeCompare(a.firstObservedAtUTC)),
    rejected: reject,
  };
}
