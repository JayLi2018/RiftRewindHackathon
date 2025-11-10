import { useMutation } from "@tanstack/react-query";

export interface SummaryStats {
  games: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  avg_kda: number;
  win_rate: number;
  avg_cs_per_min: number;
  avg_gold_per_min: number;
  avg_dmg_per_min: number;
  avg_vision_per_min: number;
}

export interface CompareResponse {
  riot_id: string;
  platform: string;
  tier: string;
  division: string;
  lane_used: string | null;
  player_summary: SummaryStats;
  rank_summary: SummaryStats;
  delta: Partial<SummaryStats>;
}

export interface CompareRequest {
  riot_id: string;
  platform: string;
  tier: string;
  division: string | null;
  player_matches: number;
}

const API_BASE =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export function useComparePlayer() {
  return useMutation<CompareResponse, Error, CompareRequest>({
    mutationFn: async (payload: CompareRequest) => {
      const res = await fetch(`${API_BASE}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      return res.json();
    },
  });
}