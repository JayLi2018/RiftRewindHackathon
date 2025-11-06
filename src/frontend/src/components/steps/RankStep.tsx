import { useState } from "react";
import { Button } from "@/components/ui/button";
import RankIcon from "@/components/ui/rank-icon";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Render a rank emblem from the staged assets (PNG preferred) and fall back to the
// inline SVG RankIcon if the image is missing or fails to load.
function RankBadge({ tier, size = 64 }: { tier: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const filename = `Season_2023_-_${tier}.png`;
  const src = `/lol/15.22.1/img/rank/${encodeURIComponent(filename)}`;

  return (
    <div className="relative flex items-center justify-center">
      {!failed ? (
        <img
          src={src}
          alt={`${tier} emblem`}
          width={size}
          height={size}
          className="object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <RankIcon tier={tier} size={size} />
      )}
    </div>
  );
}

interface RankStepProps {
  onSubmit: (tier: string, division: string) => void;
  onBack: () => void;
}

const tiers = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
];

const divisions = ["IV", "III", "II", "I"];

const RankStep = ({ onSubmit, onBack }: RankStepProps) => {
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [tierIndex, setTierIndex] = useState(3); // start at Gold

  const handlePrevTier = () => {
    setTierIndex((prev) => Math.max(0, prev - 1));
    setSelectedTier("");
    setSelectedDivision("");
  };

  const handleNextTier = () => {
    setTierIndex((prev) => Math.min(tiers.length - 1, prev + 1));
    setSelectedTier("");
    setSelectedDivision("");
  };

  const handleTierSelect = () => {
    setSelectedTier(tiers[tierIndex]);
  };

  const handleDivisionSelect = (division: string) => {
    setSelectedDivision(division);
  };

  const handleSubmit = () => {
    if (selectedTier && selectedDivision) {
      onSubmit(selectedTier, selectedDivision);
    }
  };

  // Top tiers don't use divisions
  const isTopTier = ["Master", "Grandmaster", "Challenger"].includes(
    tiers[tierIndex]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevTier}
          disabled={tierIndex === 0}
          className="h-12 w-12 text-primary hover:text-primary-glow hover:bg-card z-10"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

  <div className="relative flex items-center justify-center w-[520px]">
          {/* Previous (faded) */}
          {tierIndex > 0 && (
            <div className="absolute left-0 opacity-60 scale-75 pointer-events-none transition-all duration-500 flex flex-col items-center justify-center w-48">
              <RankBadge tier={tiers[tierIndex - 1]} size={72} />
              <h3 className="text-sm font-medium text-foreground/70 mt-2">
                {tiers[tierIndex - 1]}
              </h3>
            </div>
          )}

          {/* Center - current */}
          <div
            onClick={handleTierSelect}
            className={`cursor-pointer transition-all duration-200 z-10 flex flex-col items-center justify-center ${
              selectedTier === tiers[tierIndex]
                ? "scale-105 ring-2 ring-primary p-2 rounded-md"
                : "hover:scale-105"
            }`}
          >
            <RankBadge tier={tiers[tierIndex]} size={140} />
            <h3 className="text-2xl font-bold text-foreground mt-3">
              {tiers[tierIndex]}
            </h3>
          </div>

          {/* Next (faded) */}
          {tierIndex < tiers.length - 1 && (
            <div className="absolute right-0 opacity-60 scale-75 pointer-events-none transition-all duration-500 flex flex-col items-center justify-center w-48">
              <RankBadge tier={tiers[tierIndex + 1]} size={72} />
              <h3 className="text-sm font-medium text-foreground/70 mt-2">
                {tiers[tierIndex + 1]}
              </h3>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextTier}
          disabled={tierIndex === tiers.length - 1}
          className="h-12 w-12 text-primary hover:text-primary-glow hover:bg-card z-10"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Division Selector (hidden for top tiers) */}
      {selectedTier && !isTopTier && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <h3 className="text-2xl font-bold text-center text-foreground">
            Select Division
          </h3>
          <div className="flex justify-center gap-4">
            {divisions.map((division) => (
              <Button
                key={division}
                onClick={() => handleDivisionSelect(division)}
                variant={selectedDivision === division ? "default" : "outline"}
                className={`h-20 w-20 text-2xl font-bold ${
                  selectedDivision === division
                    ? "bg-gradient-primary shadow-glow"
                    : "bg-card hover:border-primary"
                }`}
              >
                {division}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Submit / Back Buttons */}
      <div className="flex justify-center gap-4 pt-8">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          className="min-w-32 border-border hover:border-primary"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedTier || (!isTopTier && !selectedDivision)}
          size="lg"
          className="min-w-32 bg-gradient-primary hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};


  export default RankStep;


