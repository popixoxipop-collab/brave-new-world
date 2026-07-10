import type { NewsTheater } from "@/lib/news/types";

export type NewsFeedDef = {
  url: string;
  name: string;
  theater: NewsTheater;
  /** Skip theater keyword filter */
  unfiltered?: boolean;
};

const G = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const SHARED_DEFENSE: NewsFeedDef[] = [
  { url: "https://breakingdefense.com/feed/", name: "Breaking Defense", theater: "global" },
  { url: "https://www.longwarjournal.org/feed", name: "Long War Journal", theater: "global" },
  { url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml", name: "Military Times", theater: "global" },
  { url: "https://warontherocks.com/feed/", name: "War on the Rocks", theater: "global" },
  {
    url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10",
    name: "DoD",
    theater: "global",
    unfiltered: true,
  },
];

const MIDDLE_EAST: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", name: "BBC", theater: "middle-east", unfiltered: true },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml", name: "NYT", theater: "middle-east", unfiltered: true },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", theater: "middle-east" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "middle-east" },
  { url: "http://rss.cnn.com/rss/edition_meast.rss", name: "CNN", theater: "middle-east" },
  { url: "https://moxie.foxnews.com/google-publisher/world.xml", name: "Fox News", theater: "middle-east" },
  { url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews", name: "WSJ", theater: "middle-east" },
  { url: "https://www.timesofisrael.com/feed/", name: "Times of Israel", theater: "middle-east", unfiltered: true },
  { url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", name: "JPost", theater: "middle-east", unfiltered: true },
  { url: "https://www.ynetnews.com/Integration/StoryRss2.xml", name: "Ynet", theater: "middle-east", unfiltered: true },
  { url: "https://rcs.mako.co.il/rss/news-military.xml", name: "N12", theater: "middle-east", unfiltered: true },
  { url: "https://rss.walla.co.il/feed/22", name: "Walla", theater: "middle-east", unfiltered: true },
  { url: "https://www.haaretz.com/srv/middle-east-news-rss", name: "Haaretz", theater: "middle-east", unfiltered: true },
  { url: "https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml", name: "The National", theater: "middle-east" },
  { url: "https://www.dropsitenews.com/feed", name: "Drop Site", theater: "middle-east" },
  {
    url: "https://www.centcom.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=808&max=20",
    name: "CENTCOM",
    theater: "middle-east",
    unfiltered: true,
  },
  { url: "https://www.presstv.ir/rss.xml", name: "PressTV", theater: "middle-east", unfiltered: true },
  { url: G("Iran Israel war military strike"), name: "Google News", theater: "middle-east", unfiltered: true },
  { url: G("Iran missile drone strike Israel"), name: "Google News", theater: "middle-east", unfiltered: true },
  { url: G('"Strait of Hormuz" OR "Red Sea" military Iran'), name: "Google News", theater: "middle-east", unfiltered: true },
];

const RUSSIA_UKRAINE: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", name: "BBC", theater: "russia-ukraine" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Europe.xml", name: "NYT", theater: "russia-ukraine" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", theater: "russia-ukraine" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "russia-ukraine" },
  { url: "https://kyivindependent.com/feed/", name: "Kyiv Independent", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.pravda.com.ua/eng/rss/", name: "Ukrainska Pravda", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.kyivpost.com/feed", name: "Kyiv Post", theater: "russia-ukraine", unfiltered: true },
  { url: "https://english.nv.ua/rss/all.xml", name: "NV", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.ukrinform.net/rss/block-lastnews", name: "Ukrinform", theater: "russia-ukraine", unfiltered: true },
  { url: "https://tass.com/rss/v2.xml", name: "TASS", theater: "russia-ukraine" },
  { url: "https://www.rt.com/rss/news/", name: "RT", theater: "russia-ukraine" },
  { url: "https://www.themoscowtimes.com/rss/news", name: "Moscow Times", theater: "russia-ukraine" },
  { url: "https://meduza.io/rss/en/all", name: "Meduza", theater: "russia-ukraine" },
  { url: G("Russia Ukraine war military"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
  { url: G("Ukraine missile OR drone strike Russia"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
  { url: G("Ukraine front line offensive Russia"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
];

const CHINA_TAIWAN: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "china-taiwan" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "china-taiwan" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "china-taiwan" },
  {
    url: G('(Taiwan OR "South China Sea") AND (military OR "PLA" OR "White House")'),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G("China Taiwan military strait tension"),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G("PLA Taiwan invasion exercise"),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
];

const KOREA: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "korea" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "korea" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "korea" },
  {
    url: "https://www.yna.co.kr/rss/northkorea.xml",
    name: "연합뉴스 북한",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '(North Korea OR Pyongyang) AND (missile OR nuclear OR "Kim Jong Un") AND (site:nknews.org OR site:dailynk.com OR site:yna.co.kr)',
    ),
    name: "Google News",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G("Korean peninsula DMZ tension military"),
    name: "Google News",
    theater: "korea",
    unfiltered: true,
  },
];

const JAPAN: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "japan" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "japan" },
  {
    url: G(
      '(Japan OR "Tokyo") AND (security OR defense OR "maritime") AND (site:kyodonews.net OR site:nikkei.com OR site:japantimes.co.jp)',
    ),
    name: "Google News",
    theater: "japan",
    unfiltered: true,
  },
  {
    url: G("Japan military Senkaku defense"),
    name: "Google News",
    theater: "japan",
    unfiltered: true,
  },
];

const SOUTH_ASIA: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "south-asia" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "south-asia" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "south-asia" },
  {
    url: G(
      '(India OR Modi) AND (geopolitics OR "foreign policy" OR security) AND (site:thehindu.com OR site:indianexpress.com)',
    ),
    name: "Google News · India",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G('("Line of Actual Control" OR India OR Pakistan) AND (border OR tension)'),
    name: "Google News · LAC",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G("India Pakistan military Kashmir conflict"),
    name: "Google News",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G("Afghanistan Taliban military strike"),
    name: "Google News",
    theater: "south-asia",
    unfiltered: true,
  },
];

/** 중앙아시아 — global 전장 Google 쿼리 (NewsTheater 별도 버킷 없음) */
const CENTRAL_ASIA_GOOGLE: NewsFeedDef[] = [
  {
    url: G('(Central Asia) AND ("Great Game" OR "Geopolitics" OR "Security")'),
    name: "Google News · Central Asia",
    theater: "global",
    unfiltered: true,
  },
];

/** 지역별 주요 Google News RSS 쿼리 (문서·디버그용) */
export const GOOGLE_NEWS_QUERIES: Record<string, string> = {
  "china-taiwan": '(Taiwan OR "South China Sea") AND (military OR "PLA" OR "White House")',
  korea:
    '(North Korea OR Pyongyang) AND (missile OR nuclear OR "Kim Jong Un") AND (site:nknews.org OR site:dailynk.com OR site:yna.co.kr)',
  japan:
    '(Japan OR "Tokyo") AND (security OR defense OR "maritime") AND (site:kyodonews.net OR site:nikkei.com OR site:japantimes.co.jp)',
  "south-asia-india":
    '(India OR Modi) AND (geopolitics OR "foreign policy" OR security) AND (site:thehindu.com OR site:indianexpress.com)',
  "south-asia-lac": '("Line of Actual Control" OR India OR Pakistan) AND (border OR tension)',
  "central-asia": '(Central Asia) AND ("Great Game" OR "Geopolitics" OR "Security")',
};

export const THEATER_RELEVANCE: Record<NewsTheater, RegExp> = {
  "middle-east":
    /iran|israel|idf|irgc|hezbollah|hamas|houthi|lebanon|gaza|tehran|tel\s?aviv|jerusalem|yemen|iraq|syria|gulf|hormuz|red\s?sea|missile|strike|nuclear|centcom|middle\s?east|west\s?bank|golan|khamenei|netanyahu|drone|saudi|emirates|uae|gcc/i,
  "russia-ukraine":
    /ukrain|russia|russian|putin|zelensky|kyiv|kharkiv|odesa|dnipro|donbas|crimea|sevastopol|kremlin|moscow|belgorod|wagner|himars|atacms|shahed/i,
  "china-taiwan":
    /china|taiwan|taipei|beijing|pla|strait|senkaku|diaoyu|south\s?china\s?sea|xi\s?jinping|cross[\s-]?strait|kinmen/i,
  korea:
    /north\s?korea|south\s?korea|pyongyang|seoul|dmz|dprk|kim\s?jong|korean\s?peninsula|icbm|ballistic/i,
  japan:
    /japan|tokyo|okinawa|senkaku|self[\s-]?defense\s?force|sdf|yasukuni|north\s?korea\s?japan/i,
  "south-asia":
    /india|pakistan|kashmir|afghanistan|taliban|myanmar|bangladesh|sri\s?lanka|nepal|modi|rawalpindi|line\s?of\s?actual\s?control|lac\b|central\s?asia|kazakh|uzbek|turkmen|kyrgyz|tajik/i,
  global: /military|defense|war|conflict|strike|missile|pentagon|nato|sanction|geopolitic|great\s?game|central\s?asia/i,
};

const NOISE =
  /world.?cup|\bfifa\b|\bioc\b|olympic|premier.?league|champions.?league|super.?bowl|\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|grammy|oscar|\bemmy|box.?office|celebrity|eurovision/i;

export const ALL_NEWS_FEEDS: NewsFeedDef[] = dedupeFeedsByUrl([
  ...MIDDLE_EAST,
  ...RUSSIA_UKRAINE,
  ...CHINA_TAIWAN,
  ...KOREA,
  ...JAPAN,
  ...SOUTH_ASIA,
  ...CENTRAL_ASIA_GOOGLE,
  ...SHARED_DEFENSE,
]);

function dedupeFeedsByUrl(feeds: NewsFeedDef[]): NewsFeedDef[] {
  const seen = new Set<string>();
  return feeds.filter((feed) => {
    if (seen.has(feed.url)) return false;
    seen.add(feed.url);
    return true;
  });
}

export function isFeedItemRelevant(
  title: string,
  category: string | undefined,
  feed: NewsFeedDef,
): boolean {
  if (NOISE.test(title)) return false;
  if (feed.unfiltered) return true;
  const blob = `${title} ${category || ""}`;
  return THEATER_RELEVANCE[feed.theater].test(blob);
}
