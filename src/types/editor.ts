/** Partial update for game metadata — mirrors Rust GameInfoPatch */
export interface GameInfoPatch {
  title?: string;
  box_art?: string;
  description?: string;
  developer?: string;
  publisher?: string;
  year?: string;
  genre?: string;
  players?: number;
  rating?: number;
  hero_art?: string;
  logo?: string;
  background_art?: string;
  screenshots?: string[];
  trailer_url?: string;
  trailer_local?: string;
  metacritic_score?: number;
  tags?: string[];
  website?: string;
  pcgamingwiki_url?: string;
  igdb_id?: number;
}
