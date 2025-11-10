import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoleStepProps {
  onSubmit: (roles: string[]) => void;
  onBack: () => void;
  onSkip?: () => void;        // 👈 NEW (optional)
}

const roles = [
  { name: "Top", icon: "⚔️" },
  { name: "Jungle", icon: "🌲" },
  { name: "Mid", icon: "⭐" },
  { name: "ADC", icon: "🏹" },
  { name: "Support", icon: "🛡️" },
];

const RoleStep = ({ onSubmit, onBack, onSkip }: RoleStepProps) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const handleRoleToggle = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleName));
    } else if (selectedRoles.length < 2) {
      setSelectedRoles([...selectedRoles, roleName]);
    }
  };

  const handleSubmit = () => {
    if (selectedRoles.length >= 1) {
      onSubmit(selectedRoles);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      // fallback: treat "skip" as no-role preference
      onSubmit([]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold text-primary">Select Your Roles</h2>
        <p className="text-muted-foreground">
          Choose 1-2 roles you want to improve in
        </p>
        <p className="text-sm text-muted-foreground">
          {selectedRoles.length}/2 selected
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6 max-w-5xl mx-auto">
        {roles.map((role) => {
          const isSelected = selectedRoles.includes(role.name);
          const isPrimary = selectedRoles[0] === role.name;

          return (
            <button
              key={role.name}
              onClick={() => handleRoleToggle(role.name)}
              className={`relative aspect-square rounded-lg border-2 transition-all duration-300 ${
                isSelected
                  ? "border-primary bg-gradient-card shadow-glow scale-105"
                  : "border-border bg-card hover:border-primary/50 hover:scale-102"
              }`}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                <div className="text-5xl">{role.icon}</div>
                <div className="text-lg font-bold text-foreground">
                  {role.name}
                </div>
                {isSelected && (
                  <div className="text-xs text-primary font-semibold">
                    {isPrimary ? "PRIMARY" : "SECONDARY"}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 pt-8">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          className="min-w-32 border-border hover:border-primary"
        >
          Back
        </Button>

        {onSkip && (
          <Button
            onClick={handleSkip}
            variant="outline"
            size="lg"
            className="min-w-32 border-border hover:border-primary"
          >
            Skip
          </Button>
        )}

        <Button
          onClick={handleSubmit}
          disabled={selectedRoles.length === 0}
          size="lg"
          className="min-w-32 bg-gradient-primary hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default RoleStep;