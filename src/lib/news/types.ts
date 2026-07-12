export type NewsTheater =
  | "middle-east"
  | "russia-ukraine"
  | "china-taiwan"
  | "korea"
  | "japan"
  | "south-asia"
  | "global";

export type MediaTrustTier = 1 | 2 | 3;

export type HeroStatus = "confirmed" | "breaking" | "unverified";

export type NewsFeedTopic = "defense" | "economy";

export type NewsStreamItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publisher?: string;
  pubDate: string;
  theater: NewsTheater;
  trustTier: MediaTrustTier;
  /** RSS 카테고리 */
  category?: string;
  /** feedCatalog defense | economy */
  feedTopic?: NewsFeedTopic;
  imageUrl?: string;
  summary?: string;
};

export type HeroBreakingItem = NewsStreamItem & {
  heroStatus: HeroStatus;
  urgencyScore: number;
  ageMinutes: number;
  clusterId?: string;
};

export type NewsStreamPayload = {
  fetchedAt: string;
  hero: HeroBreakingItem | null;
  verified: NewsStreamItem[];
  stateMedia: NewsStreamItem[];
  stats: {
    total: number;
    tier1: number;
    tier2: number;
    tier3: number;
    economy?: number;
    theaters: Record<NewsTheater, number>;
  };
  error?: string;
};
