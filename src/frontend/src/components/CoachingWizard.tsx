import { useState } from "react";
import UsernameStep from "./steps/UsernameStep";
import RankStep from "./steps/RankStep";
import RoleStep from "./steps/RoleStep";
import ChampionStep from "./steps/ChampionStep";

export type WizardStep = "username" | "rank" | "role" | "champion";

const API_BASE = "http://localhost:8000"; // FastAPI backend

const CoachingWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("username");
  const [username, setUsername] = useState("");
  const [selectedRank, setSelectedRank] = useState({ tier: "", division: "" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedChampions, setSelectedChampions] = useState<string[]>([]);
const [recentCount, setRecentCount] = useState<number>(20);
const [recentCountInput, setRecentCountInput] = useState<string>("20");

  // comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any | null>(null);

  // ---- step handlers ----
  const handleUsernameSubmit = (name: string) => {
    setUsername(name);
    setCurrentStep("rank");
  };

  const handleRankSubmit = (tier: string, division: string) => {
    setSelectedRank({ tier, division });
    setCurrentStep("role");
  };

  const handleRoleSubmit = (roles: string[]) => {
    setSelectedRoles(roles);
    setCurrentStep("champion");
  };

  const handleRoleSkip = () => {
    // no role filter
    setSelectedRoles([]);
    setCurrentStep("champion");
  };

  const runCompare = async (champions: string[]) => {
    setSelectedChampions(champions);

    const primaryRole =
      selectedRoles[0]?.toUpperCase() === "TOP" ||
      selectedRoles[0]?.toUpperCase() === "JUNGLE" ||
      selectedRoles[0]?.toUpperCase() === "MID" ||
      selectedRoles[0]?.toUpperCase() === "ADC" ||
      selectedRoles[0]?.toUpperCase() === "SUPPORT"
        ? selectedRoles[0]
        : null;

    const primaryChampion = champions[0] ?? null;

    setIsComparing(true);
    setCompareError(null);
    setCompareResult(null);

    try {
      const payload = {
        riot_id: username.trim(),           // e.g. "GraceXing#NA1"
        region: "na1",
        tier: selectedRank.tier,            // "DIAMOND"
        division: selectedRank.division || null, // "II" or null
        n_recent: recentCount,              // user-adjustable
        primary_role: primaryRole,          // or null
        champion: primaryChampion,          // or null
      };

      const res = await fetch(`${API_BASE}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Compare request failed with status ${res.status}`);
      }

      const data = await res.json();
      setCompareResult(data);
    } catch (err: any) {
      setCompareError(err?.message ?? "Something went wrong running compare.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleChampionSubmit = async (champions: string[]) => {
    // When user selects champs and hits Get Coaching
    await runCompare(champions);
  };

  const handleChampionSkip = async () => {
    // Skip champion filter -> compare across all champs
    await runCompare([]);
  };

  const videoSrc = "/lol-bg.mp4";

  return (
    <div className="min-h-screen hero-video-wrapper flex items-center justify-center p-4 bg-lol-hero">
      {/* Background video */}
      <video
        className="hero-video-element"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* overlay */}
      <div className="absolute inset-0 hero-overlay" aria-hidden="true" />

      <div className="w-full max-w-6xl hero-content space-y-8">
        {/* STEPS 1–3: wizard only */}
        {currentStep !== "champion" && (
          <>
            {currentStep === "username" && (
              <UsernameStep onSubmit={handleUsernameSubmit} />
            )}

            {currentStep === "rank" && (
              <RankStep
                onSubmit={handleRankSubmit}
                onBack={() => setCurrentStep("username")}
              />
            )}

            {currentStep === "role" && (
              <RoleStep
                onSubmit={handleRoleSubmit}
                onBack={() => setCurrentStep("rank")}
                onSkip={handleRoleSkip}
              />
            )}
          </>
        )}

        {/* STEP 4: champion selection + compare panel */}
        {currentStep === "champion" && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
            {/* left: champion selection */}
            <ChampionStep
              onSubmit={handleChampionSubmit}
              onBack={() => setCurrentStep("role")}
              onSkip={handleChampionSkip}
            />

            {/* right: comparison panel – ONLY visible on champion step */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 md:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-50">
                Compare yourself to a target rank
              </h2>

              {/* Recent matches input */}
             <div className="space-y-1">
                <h3 className="text-sm font-medium text-zinc-300">
                  Number of recent ranked games to analyze
                </h3>
                <p className="text-xs text-zinc-500">
                  We&rsquo;ll fetch this many of your most recent Ranked Solo/Duo games.
                </p>

                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={recentCountInput}
                  onChange={(e) => {
                    // Let the user freely edit, including empty string.
                    setRecentCountInput(e.target.value);
                  }}
                  onBlur={() => {
                    const v = Number(recentCountInput);
                    if (Number.isNaN(v) || !recentCountInput.trim()) {
                      // If they leave it empty/invalid, fall back to previous value
                      setRecentCountInput(String(recentCount));
                      return;
                    }
                    // Clamp between 1 and 100 (or whatever bounds you want)
                    const clamped = Math.min(100, Math.max(1, v));
                    setRecentCount(clamped);
                    setRecentCountInput(String(clamped));
                  }}
                  className="mt-2 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400/70 focus:border-amber-400/70"
                />
              </div>

              {isComparing && (
                <p className="text-sm text-zinc-300">Analyzing your games…</p>
              )}

              {compareError && (
                <p className="text-sm text-red-400 break-words">{compareError}</p>
              )}

              {/* Only show the summaries when we *have* a result */}
              {compareResult && (
                <>
                  <div className="space-y-3 text-xs md:text-sm">
                    <p className="text-zinc-300">
                      Comparing{" "}
                      <span className="font-semibold text-white">{username}</span>{" "}
                      to{" "}
                      <span className="font-semibold text-white">
                        {selectedRank.tier} {selectedRank.division}
                      </span>{" "}
                      players
                      {selectedRoles[0] && (
                        <>
                          {" "}
                          in{" "}
                          <span className="font-semibold text-white">
                            {selectedRoles[0]}
                          </span>
                        </>
                      )}
                      {selectedChampions[0] && (
                        <>
                          {" "}
                          on{" "}
                          <span className="font-semibold text-white">
                            {selectedChampions[0]}
                          </span>
                        </>
                      )}
                      .
                    </p>
                  </div>

                  {/* Side-by-side panel with color coding */}
                  <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
                    {[
                      {
                        key: "avg_kda",
                        label: "KDA",
                        format: (v: number) => v.toFixed(2),
                      },
                      {
                        key: "win_rate",
                        label: "Win rate",
                        format: (v: number) => (v * 100).toFixed(1) + "%",
                      },
                      {
                        key: "avg_cs_per_min",
                        label: "CS / min",
                        format: (v: number) => v.toFixed(2),
                      },
                      {
                        key: "avg_gold_per_min",
                        label: "Gold / min",
                        format: (v: number) => v.toFixed(0),
                      },
                      {
                        key: "avg_dmg_per_min",
                        label: "Damage / min",
                        format: (v: number) => v.toFixed(0),
                      },
                      {
                        key: "avg_vision_per_min",
                        label: "Vision / min",
                        format: (v: number) => v.toFixed(2),
                      },
                    ].map((stat) => {
                      const playerVal = compareResult.player_summary?.[stat.key];
                      const rankVal = compareResult.rank_summary?.[stat.key];

                      if (
                        typeof playerVal !== "number" ||
                        typeof rankVal !== "number"
                      ) {
                        return null;
                      }

                      const diff = playerVal - rankVal;
                      const isGoodHigher = !["avg_deaths"].includes(stat.key);
                      const isBetter = isGoodHigher ? diff > 0 : diff < 0;
                      const isWorse = isGoodHigher ? diff < 0 : diff > 0;

                      const diffClass =
                        diff === 0
                          ? "text-zinc-400"
                          : isBetter
                          ? "text-emerald-400"
                          : "text-red-400";

                      const sign = diff > 0 ? "+" : "";

                      return (
                        <div
                          key={stat.key}
                          className="rounded-lg border border-zinc-800 bg-black/40 p-3"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                            {stat.label}
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="space-y-1">
                              <div className="text-xs text-zinc-400">You</div>
                              <div className="text-sm font-semibold text-zinc-100">
                                {stat.format(playerVal)}
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <div className="text-xs text-zinc-400">
                                {selectedRank.tier} {selectedRank.division}
                              </div>
                              <div className="text-sm font-semibold text-zinc-100">
                                {stat.format(rankVal)}
                              </div>
                            </div>
                          </div>
                          <div className={`mt-1 text-[11px] ${diffClass}`}>
                            {diff === 0
                              ? "Even with rank average"
                              : `${sign}${stat.format(
                                  Math.abs(diff)
                                )} vs rank average`}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Raw JSON moved to the bottom for debugging */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                      Debug: show raw comparison JSON
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/60 p-3 text-[11px] text-zinc-200">
                      {JSON.stringify(compareResult, null, 2)}
                    </pre>
                  </details>
                </>
              )}

              {!isComparing && !compareError && !compareResult && (
                <p className="text-xs text-zinc-500">
                  Select your role and champion, then click{" "}
                  <span className="font-semibold text-zinc-300">
                    Get Coaching
                  </span>{" "}
                  to run the comparison.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachingWizard;