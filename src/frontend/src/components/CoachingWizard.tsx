import { useState, useEffect } from "react";
import UsernameStep from "./steps/UsernameStep";
import RankStep from "./steps/RankStep";
import RoleStep from "./steps/RoleStep";
import ChampionStep from "./steps/ChampionStep";

export type WizardStep = "username" | "rank" | "role" | "champion";

const CoachingWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("username");
  const [username, setUsername] = useState("");
  const [selectedRank, setSelectedRank] = useState({ tier: "", division: "" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedChampions, setSelectedChampions] = useState<string[]>([]);

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

  const handleChampionSubmit = (champions: string[]) => {
    setSelectedChampions(champions);
    // Here you would submit all data to your backend
    console.log({
      username,
      rank: selectedRank,
      roles: selectedRoles,
      champions: selectedChampions,
    });
  };

  // Use the simpler, fixed background filename placed in `public/`.
  // You told me you renamed the file to `lol-bg.mp4` — use that directly.
  const videoSrc = "/lol-bg.mp4";

  return (
    <div className="min-h-screen hero-video-wrapper flex items-center justify-center p-4 bg-lol-hero">
      {/* Background video (simple direct src: /lol-bg.mp4) */}
      <video className="hero-video-element" autoPlay muted loop playsInline aria-hidden="true">
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* subtle overlay to keep contrast */}
      <div className="absolute inset-0 hero-overlay" aria-hidden="true" />

      <div className="w-full max-w-6xl hero-content">
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
          />
        )}
        {currentStep === "champion" && (
          <ChampionStep
            onSubmit={handleChampionSubmit}
            onBack={() => setCurrentStep("role")}
          />
        )}
      </div>
    </div>
  );
};

export default CoachingWizard;
