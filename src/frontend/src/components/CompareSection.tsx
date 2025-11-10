// src/frontend/src/components/CompareSection.tsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8000";

type CompareResponse = {
  riot_id: string;
  tier: string;
  division: string | null;
  player_summary: Record<string, number>;
  rank_summary: Record<string, number>;
  delta: Record<string, number>;
};

const TIERS = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];

const DIVISIONS = ["IV", "III", "II", "I"];

type CompareSectionProps = {
  initialRiotId?: string;
  initialTier?: string;
  initialDivision?: string | null;
  initialPrimaryRole?: string | null;
  initialChampion?: string | null;
  autoRun?: boolean; // auto-run once on mount (used when coming from wizard)
};

export const CompareSection: React.FC<CompareSectionProps> = ({
  initialRiotId = "",
  initialTier = "DIAMOND",
  initialDivision = "II",
  initialPrimaryRole = null,
  initialChampion = null,
  autoRun = false,
}) => {
  // --- form state ---
  const [riotId, setRiotId] = useState(initialRiotId);
  const [tier, setTier] = useState(initialTier);
  const [division, setDivision] = useState<string | null>(initialDivision);
  const [recentCount, setRecentCount] = useState<number>(50);

  // role/champ from wizard (not editable here for now)
  const [primaryRole] = useState<string | null>(initialPrimaryRole);
  const [champion] = useState<string | null>(initialChampion);

  // --- request / result state ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const runCompare = async () => {
    if (!riotId.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        riot_id: riotId.trim(),
        region: "na1",
        tier,
        division,
        n_recent: recentCount,
        primary_role: primaryRole, // <- from wizard (can be null)
        champion, // <- from wizard (can be null)
      };

      const res = await fetch(`${API_BASE}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Compare failed with status ${res.status}`);
      }

      const data = (await res.json()) as CompareResponse;
      setResult(data);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCompare();
  };

  // Auto-run once when coming from the wizard
  const [hasAutoRun, setHasAutoRun] = useState(false);
  useEffect(() => {
    if (!autoRun || hasAutoRun) return;
    if (!riotId.trim()) return;

    setHasAutoRun(true);
    void runCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, hasAutoRun, riotId, tier, division, primaryRole, champion]);

  // --- derived display data ---
  const metrics = useMemo(() => {
    if (!result) return null;

    const p = result.player_summary;
    const r = result.rank_summary;
    const d = result.delta;

    const betterIfHigher = (key: keyof typeof d) => {
      const diff = d[key] ?? 0;
      return diff >= 0;
    };

    const formatPct = (v: number | undefined) =>
      v === undefined ? "-" : `${(v * 100).toFixed(1)}%`;

    const formatNum = (v: number | undefined, digits = 2) =>
      v === undefined ? "-" : v.toFixed(digits);

    const gamesYou = p.games ?? 0;
    const gamesRank = r.games ?? 0;

    return {
      header: {
        riotId: result.riot_id,
        tier: result.tier,
        division: result.division,
        gamesYou,
        gamesRank,
      },
      rows: [
        {
          label: "WIN RATE",
          you: formatPct(p.win_rate),
          rank: formatPct(r.win_rate),
          isBetter: betterIfHigher("win_rate"),
        },
        {
          label: "KDA",
          you: formatNum(p.avg_kda),
          rank: formatNum(r.avg_kda),
          isBetter: betterIfHigher("avg_kda"),
        },
        {
          label: "GOLD / MIN",
          you: formatNum(p.avg_gold_per_min),
          rank: formatNum(r.avg_gold_per_min),
          isBetter: betterIfHigher("avg_gold_per_min"),
        },
        {
          label: "DAMAGE / MIN",
          you: formatNum(p.avg_dmg_per_min),
          rank: formatNum(r.avg_dmg_per_min),
          isBetter: betterIfHigher("avg_dmg_per_min"),
        },
        {
          label: "CS / MIN",
          you: formatNum(p.avg_cs_per_min),
          rank: formatNum(r.avg_cs_per_min),
          isBetter: betterIfHigher("avg_cs_per_min"),
        },
        {
          label: "VISION / MIN",
          you: formatNum(p.avg_vision_per_min),
          rank: formatNum(r.avg_vision_per_min),
          isBetter: betterIfHigher("avg_vision_per_min"),
        },
      ],
    };
  }, [result]);

  return (
    <section className="space-y-8">
      {/* ----- Form card ----- */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8 space-y-6"
      >
        <h2 className="text-2xl md:text-3xl font-semibold text-zinc-50">
          Compare yourself to a target rank
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Riot ID */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-zinc-200">
              Riot ID
            </label>
            <input
              type="text"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="GraceXing#NA1"
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Tier */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200">
              Target tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-amber-400"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Division */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200">
              Division
            </label>
            <select
              value={division ?? ""}
              onChange={(e) =>
                setDivision(e.target.value === "" ? null : e.target.value)
              }
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-amber-400"
            >
              <option value="">N/A (Master+)</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recent games slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Number of recent ranked games</span>
            <span>{recentCount}</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={recentCount}
            onChange={(e) => setRecentCount(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <p className="text-[11px] text-zinc-400">
            We&apos;ll fetch the most recent {recentCount} Ranked Solo/Duo
            matches and compare them against {tier} {division ?? ""} players
            {champion ? ` on ${champion}` : ""}.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !riotId.trim()}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Running comparison…" : "Run comparison"}
        </button>

        {error && (
          <p className="text-xs text-red-400 mt-2">
            {error}
          </p>
        )}
      </form>

      {/* ----- Comparison panel (above JSON) ----- */}
      {metrics && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-zinc-50">
                {metrics.header.riotId} vs {metrics.header.tier}{" "}
                {metrics.header.division ?? ""}
                {champion ? ` on ${champion}` : ""}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {metrics.header.gamesYou} games (you) ·{" "}
                {metrics.header.gamesRank.toLocaleString()} games (rank sample)
              </p>
              {primaryRole && (
                <p className="text-[11px] text-zinc-500">
                  Filtered to role: {primaryRole}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {metrics.rows.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl bg-black/40 px-4 py-3 space-y-1"
              >
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {row.label}
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[11px] text-zinc-400">You</div>
                    <div
                      className={`text-lg font-semibold ${
                        row.isBetter ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {row.you}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-[11px] text-zinc-400">Rank avg</div>
                    <div className="text-sm text-zinc-200">{row.rank}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----- Raw JSON (below panel) ----- */}
      {result && (
        <div className="rounded-3xl border border-zinc-800 bg-black/70 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-400">
            Raw comparison JSON
          </div>
          <pre className="max-h-80 overflow-auto text-[11px] text-zinc-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};