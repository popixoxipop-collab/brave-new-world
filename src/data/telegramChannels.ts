/** Public Telegram channels — IRONSIGHT catalog (MIT, Nobler Works), verified Jul 2026 */

export type TelegramTheater = "middle-east" | "ukraine";

export type TelegramChannelDef = {
  username: string;
  label: string;
  theater: TelegramTheater;
  color: string;
};

const MIDDLE_EAST: TelegramChannelDef[] = [
  { username: "IDFofficial", label: "IDF Official", theater: "middle-east", color: "#3388ff" },
  { username: "RocketAlert", label: "Rocket Alert", theater: "middle-east", color: "#ff3366" },
  { username: "Alertisrael", label: "Alert Israel", theater: "middle-east", color: "#ff6688" },
  { username: "TimesofIsrael", label: "Times of Israel", theater: "middle-east", color: "#0066cc" },
  { username: "AbuAliExpress", label: "Abu Ali Express", theater: "middle-east", color: "#dd7733" },
  { username: "OSINTdefender", label: "OSINT Defender", theater: "middle-east", color: "#00aaff" },
  { username: "warfareanalysis", label: "Warfare Analysis", theater: "middle-east", color: "#8888cc" },
  { username: "rnintel", label: "RN Intel", theater: "middle-east", color: "#44aacc" },
  { username: "GeoPWatch", label: "GeoPol Watch", theater: "middle-east", color: "#cc66aa" },
  { username: "middle_east_spectator", label: "ME Spectator", theater: "middle-east", color: "#ff6600" },
  { username: "Middle_East_Spectator", label: "ME Spectator 2", theater: "middle-east", color: "#ff8844" },
  { username: "HAMASW", label: "Hamas-Israel War", theater: "middle-east", color: "#339933" },
  { username: "PressTV", label: "PressTV (Iran)", theater: "middle-east", color: "#cc3333" },
  { username: "iranintl_en", label: "Iran International", theater: "middle-east", color: "#00ff88" },
  { username: "FarsNews_EN", label: "Fars News", theater: "middle-east", color: "#669933" },
  { username: "TasnimNewsEN", label: "Tasnim News", theater: "middle-east", color: "#557733" },
  { username: "SaberinFa", label: "Saberin (IRGC)", theater: "middle-east", color: "#884422" },
  { username: "defapress_ir", label: "DefaPress (Iran MOD)", theater: "middle-east", color: "#556644" },
  { username: "sepah", label: "IRGC Official", theater: "middle-east", color: "#774433" },
  { username: "FotrosResistancee", label: "Fotros Resistance", theater: "middle-east", color: "#dd4444" },
  { username: "QudsNen", label: "Quds News", theater: "middle-east", color: "#33cc66" },
  { username: "Alsaa_plus_EN", label: "Al-Saa EN", theater: "middle-east", color: "#ee8833" },
  { username: "thecradlemedia", label: "The Cradle", theater: "middle-east", color: "#aa8844" },
  { username: "dropsitenews", label: "Drop Site News", theater: "middle-east", color: "#e63946" },
  { username: "france24_en", label: "France 24", theater: "middle-east", color: "#2266bb" },
  { username: "wamnews_en", label: "WAM (UAE)", theater: "middle-east", color: "#c4a535" },
  { username: "gulfnewsUAE", label: "Gulf News (UAE)", theater: "middle-east", color: "#e6b800" },
  { username: "Alibk3", label: "Ali Bk", theater: "middle-east", color: "#44bb88" },
  { username: "aljazeeraglobal", label: "Al Jazeera", theater: "middle-east", color: "#d4a843" },
  { username: "bintjbeilnews", label: "Bint Jbeil", theater: "middle-east", color: "#55aa77" },
  { username: "kianmeli1", label: "Kian Meli (Iran)", theater: "middle-east", color: "#7744aa" },
];

const UKRAINE: TelegramChannelDef[] = [
  { username: "GeneralStaffZSU", label: "UA General Staff", theater: "ukraine", color: "#005bbb" },
  { username: "kpszsu", label: "UA Air Force", theater: "ukraine", color: "#4fb0d8" },
  { username: "V_Zelenskiy_official", label: "Zelensky Official", theater: "ukraine", color: "#1f6fb2" },
  { username: "operativnoZSU", label: "Operatyvno ZSU", theater: "ukraine", color: "#005bbb" },
  { username: "UkraineNow", label: "Ukraine NOW", theater: "ukraine", color: "#0057b7" },
  { username: "KyivIndependent_official", label: "Kyiv Independent", theater: "ukraine", color: "#ffd500" },
  { username: "ukrpravda_news", label: "Ukrainska Pravda", theater: "ukraine", color: "#c00000" },
  { username: "uniannet", label: "UNIAN", theater: "ukraine", color: "#1f6fb2" },
  { username: "suspilnenews", label: "Suspilne", theater: "ukraine", color: "#6a1b9a" },
  { username: "truexanewsua", label: "Trukha UA", theater: "ukraine", color: "#ff6600" },
  { username: "nexta_live", label: "NEXTA", theater: "ukraine", color: "#ffd500" },
  { username: "insiderUKR", label: "Insider UA", theater: "ukraine", color: "#44aacc" },
  { username: "bbcukrainian", label: "BBC Ukraine", theater: "ukraine", color: "#bb1919" },
  { username: "radiosvoboda", label: "Radio Svoboda", theater: "ukraine", color: "#2a7fff" },
  { username: "butusovplus", label: "Yuriy Butusov", theater: "ukraine", color: "#2e8bc0" },
  { username: "ssternenko", label: "Serhii Sternenko", theater: "ukraine", color: "#33aa77" },
  { username: "serhii_flash", label: "Serhii Flash", theater: "ukraine", color: "#00a0a0" },
  { username: "lachentyt", label: "Lachen", theater: "ukraine", color: "#e0a800" },
  { username: "pravdaGerashchenko_en", label: "Anton Gerashchenko", theater: "ukraine", color: "#3a7bd5" },
  { username: "tsaplienko", label: "Tsaplienko", theater: "ukraine", color: "#2266bb" },
  { username: "motolkohelp", label: "Motolko (Belarus)", theater: "ukraine", color: "#c4a535" },
  { username: "rian_ru", label: "RIA Novosti (RU)", theater: "ukraine", color: "#c8102e" },
  { username: "mod_russia", label: "Russian MoD (RU)", theater: "ukraine", color: "#cc3333" },
  { username: "readovkanews", label: "Readovka (RU)", theater: "ukraine", color: "#884422" },
  { username: "wargonzo", label: "WarGonzo (RU)", theater: "ukraine", color: "#aa4444" },
  { username: "rvvoenkor", label: "RV Voenkor (RU)", theater: "ukraine", color: "#cc5544" },
  { username: "epoddubny", label: "Poddubny (RU)", theater: "ukraine", color: "#774433" },
  { username: "boris_rozhin", label: "Colonel Cassad (RU)", theater: "ukraine", color: "#dd4444" },
  { username: "grey_zone", label: "Grey Zone (RU)", theater: "ukraine", color: "#888888" },
  { username: "dva_majors", label: "Two Majors (RU)", theater: "ukraine", color: "#8b3a3a" },
  { username: "sashakots", label: "Kots (RU)", theater: "ukraine", color: "#a0522d" },
  { username: "voenkorKotenok", label: "Kotenok (RU)", theater: "ukraine", color: "#994444" },
  { username: "meduzalive", label: "Meduza (RU)", theater: "ukraine", color: "#333388" },
  { username: "astrapress", label: "Astra (indep)", theater: "ukraine", color: "#8e44ad" },
  { username: "mediazzzona", label: "Mediazona", theater: "ukraine", color: "#b02a37" },
  { username: "agentstvonews", label: "Agentstvo", theater: "ukraine", color: "#16a085" },
  { username: "holodmedia", label: "Holod", theater: "ukraine", color: "#34495e" },
  { username: "maximkatz", label: "Maxim Katz", theater: "ukraine", color: "#e67e22" },
  { username: "DeepStateUA", label: "DeepState UA", theater: "ukraine", color: "#ffd500" },
  { username: "war_monitor", label: "War Monitor", theater: "ukraine", color: "#00aaff" },
  { username: "rybar", label: "Rybar (RU)", theater: "ukraine", color: "#cc3333" },
];

/** Deduped by username (middle-east list wins on collision) */
const BY_USER = new Map<string, TelegramChannelDef>();
for (const ch of [...MIDDLE_EAST, ...UKRAINE]) {
  const key = ch.username.toLowerCase();
  if (!BY_USER.has(key)) BY_USER.set(key, ch);
}

export const TELEGRAM_PUBLIC_CHANNELS: TelegramChannelDef[] = Array.from(BY_USER.values());

export const TELEGRAM_CHANNEL_COUNT = TELEGRAM_PUBLIC_CHANNELS.length;

export const TELEGRAM_CATALOG_NOTE =
  "Public channels only · Telegram embed endpoint · RU/UA set verified Jul 2026";

export function channelByUsername(username: string): TelegramChannelDef | undefined {
  return BY_USER.get(username.replace(/^@/, "").toLowerCase());
}
