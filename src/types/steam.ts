export interface SteamSearchResult {
  app_id: number;
  name: string;
  icon_url: string | null;
}

export interface SteamGameData {
  steam_app_id: number;
  review_score_desc: string | null;
  review_positive: number;
  review_negative: number;
  short_description: string | null;
  categories: string[];
  release_date: string | null;
  languages: string[];
  requirements_min: string | null;
  requirements_rec: string | null;
  dlc_count: number;
  achievements_count: number;
  reviews: SteamReview[];
  store_url: string;
}

export interface SteamReview {
  author_name: string;
  hours_played: number;
  voted_up: boolean;
  review_text: string;
  timestamp: number;
}
