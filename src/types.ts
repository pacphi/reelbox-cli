export type Platform = "instagram" | "facebook" | "youtube";

export interface Reel {
  key: string;
  url: string;
  platform: Platform;
  author?: string;
  authorName?: string;
  caption?: string;
  posted?: string;
  saved?: string;
  collection?: string;
  category?: string;
  tags: string[];
}

export interface State {
  version: 1;
  generatedAt: string;
  reels: Record<string, Reel>;
}

export interface EnrichmentRecord {
  caption?: string;
  author?: string;
  authorName?: string;
  posted?: string;
}

export type Taxonomy = "collection" | "author" | "topic" | "flat";
