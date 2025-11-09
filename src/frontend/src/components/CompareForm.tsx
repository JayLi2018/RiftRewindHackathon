import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const TIER_OPTIONS = [
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
] as const;

const DIVISION_OPTIONS = ["I", "II", "III", "IV"] as const;

const TIERS_WITHOUT_DIVISIONS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

type Tier = (typeof TIER_OPTIONS)[number];
type Division = (typeof DIVISION_OPTIONS)[number];

type CompareResponse = any; // you can replace this with the real response shape from your backend

// Change this to your real backend url (or use VITE_BACKEND_URL env var)
const API_BASE =
  import.meta.env.VITE_BACKEND_URL ?? "https://your-api-gateway-url.example.com";
const COMPARE_PATH = "/compare-player"; // <- adjust to whatever route you expose

export function CompareForm({
  className,
  defaultRiotId = "GraceXing#NA1",
}: {
  className?: string;
  defaultRiotId?: string;
}) {
  const [riotId, setRiotId] = useState(defaultRiotId);
  const [tier, setTier] = useState<Tier>("DIAMOND");
  const [division, setDivision] = useState<Division>("II");
  const [matchCount, setMatchCount] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const divisionDisabled = TIERS_WITHOUT_DIVISIONS.has(tier);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}${COMPARE_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riotId,
          targetTier: tier,
          targetDivision: divisionDisabled ? null : division,
          recentMatchCount: matchCount,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl backdrop-blur",
        className,
      )}
    >
      <h2 className="mb-2 text-2xl font-semibold text-zinc-50">
        Compare yourself to a target rank
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        Enter your Riot ID, choose a target rank, and pick how many of your most
        recent games to analyze.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Riot ID */}
        <div className="space-y-2">
          <Label htmlFor="riotId">Riot ID</Label>
          <Input
            id="riotId"
            placeholder="GameName#TAG"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            className="bg-zinc-900/70"
          />
          <p className="text-xs text-zinc-500">
            Example: <span className="font-mono">GraceXing#NA1</span>
          </p>
        </div>

        {/* Tier + Division */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Target tier</Label>
            <Select
              value={tier}
              onValueChange={(val) => setTier(val as Tier)}
            >
              <SelectTrigger className="bg-zinc-900/70">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900">
                {TIER_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t[0] + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Division</Label>
            <Select
              value={division}
              onValueChange={(val) => setDivision(val as Division)}
              disabled={divisionDisabled}
            >
              <SelectTrigger className="bg-zinc-900/70">
                <SelectValue
                  placeholder={
                    divisionDisabled ? "Not used for this tier" : "Select division"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900">
                {DIVISION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {divisionDisabled && (
              <p className="text-xs text-zinc-500">
                Master and above don’t have divisions.
              </p>
            )}
          </div>
        </div>

        {/* Match count slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Number of recent matches</Label>
            <span className="text-sm text-zinc-300 font-medium">
              {matchCount}
            </span>
          </div>
          <Slider
            min={5}
            max={100}
            step={5}
            value={[matchCount]}
            onValueChange={([val]) => setMatchCount(val)}
          />
          <p className="text-xs text-zinc-500">
            We’ll pull your most recent {matchCount} games and compare them to{" "}
            {tier[0] + tier.slice(1).toLowerCase()}{" "}
            {!divisionDisabled && `${division}`} players.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isLoading || !riotId.includes("#")}
            className="px-6 font-semibold"
          >
            {isLoading ? "Analyzing…" : "Run analysis"}
          </Button>
        </div>
      </form>

      {/* Error + Result */}
      {error && (
        <div className="mt-4 rounded-md border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-100">
          <h3 className="mb-2 text-base font-semibold">
            Raw comparison data (debug view)
          </h3>
          <p className="mb-2 text-xs text-zinc-400">
            Once you’re happy with the backend shape, we can turn this into
            pretty charts and insights.
          </p>
          <pre className="max-h-72 overflow-auto rounded-lg bg-black/60 p-3 text-xs">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}