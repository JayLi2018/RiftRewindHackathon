import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UsernameStepProps {
  onSubmit: (username: string) => void;
}

const UsernameStep = ({ onSubmit }: UsernameStepProps) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="text-center space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h1 className="text-6xl font-bold text-primary drop-shadow-glow-lg">
          League Coaching Agent
        </h1>
        <p className="text-xl text-muted-foreground">
          Elevate your gameplay with personalized coaching
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Enter your Summoner Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-14 pl-12 text-lg bg-card border-border focus:border-primary focus:shadow-glow transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg bg-gradient-primary hover:shadow-glow-lg transition-all font-bold"
        >
          Start Your Journey
        </Button>
      </form>

      {/* Removed the three info boxes to simplify the hero — background image provides theme */}
    </div>
  );
};

export default UsernameStep;
