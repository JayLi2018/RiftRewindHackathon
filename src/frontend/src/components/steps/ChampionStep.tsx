import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ChampionStepProps {
  onSubmit: (champions: string[]) => void;
  onBack: () => void;
  onSkip?: () => void; // 👈 NEW (optional)
}

// Placeholder champion list (alphabetical order)
const allChampions = [
  "Aatrox", "Ahri", "Akali", "Akshan", "Alistar",
  "Amumu", "Anivia", "Annie", "Aphelios", "Ashe",
  "Aurelion Sol", "Azir", "Bard", "Bel'Veth", "Blitzcrank",
  "Brand", "Braum", "Caitlyn", "Camille", "Cassiopeia",
  "Cho'Gath", "Corki", "Darius", "Diana", "Dr. Mundo",
  "Draven", "Ekko", "Elise", "Evelynn", "Ezreal",
  "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank",
  "Garen", "Gnar", "Gragas", "Graves", "Gwen",
  "Hecarim", "Heimerdinger", "Illaoi", "Irelia", "Ivern",
  "Janna", "Jarvan IV", "Jax", "Jayce", "Jhin",
  "Jinx", "K'Sante", "Kai'Sa", "Kalista", "Karma",
  "Karthus", "Kassadin", "Katarina", "Kayle", "Kayn",
  "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw",
  "LeBlanc", "Lee Sin", "Leona", "Lillia", "Lissandra",
  "Lucian", "Lulu", "Lux", "Malphite", "Malzahar",
  "Maokai", "Master Yi", "Milio", "Miss Fortune", "Mordekaiser",
  "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus",
  "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu",
  "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy",
  "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus",
  "Rek'Sai", "Rell", "Renata Glasc", "Renekton", "Rengar",
  "Riven", "Rumble", "Ryze", "Samira", "Sejuani",
  "Senna", "Seraphine", "Sett", "Shaco", "Shen",
  "Shyvana", "Singed", "Sion", "Sivir", "Skarner",
  "Sona", "Soraka", "Swain", "Sylas", "Syndra",
  "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo",
  "Thresh", "Tristana", "Trundle", "Tryndamere", "Twisted Fate",
  "Twitch", "Udyr", "Urgot", "Varus", "Vayne",
  "Veigar", "Vel'Koz", "Vex", "Vi", "Viego",
  "Viktor", "Vladimir", "Volibear", "Warwick", "Wukong",
  "Xayah", "Xerath", "Xin Zhao", "Yasuo", "Yone",
  "Yorick", "Yuumi", "Zac", "Zed", "Zeri",
  "Ziggs", "Zilean", "Zoe", "Zyra",
];

const CHAMPION_JSON_URL = "/lol/15.22.1/data/en_US/champion.json"; // adjust if needed

const ChampionStep = ({ onSubmit, onBack, onSkip }: ChampionStepProps) => {
  const [selectedChampions, setSelectedChampions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [nameToSlug, setNameToSlug] = useState<Record<string, string>>({});

  const filteredChampions = allChampions.filter((champ) =>
    champ.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    let mounted = true;

    fetch(CHAMPION_JSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch ${CHAMPION_JSON_URL}: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        const map: Record<string, string> = {};
        for (const slug of Object.keys(data.data || {})) {
          const entry = data.data[slug];
          if (entry && entry.name) {
            map[entry.name] = slug;
          }
        }
        setNameToSlug(map);
      })
      .catch(() => {
        // ignore; fall back to emoji avatars
      });

  return () => {
      mounted = false;
    };
  }, []);

  const handleChampionToggle = (champion: string) => {
    if (selectedChampions.includes(champion)) {
      setSelectedChampions(selectedChampions.filter((c) => c !== champion));
    } else {
      if (selectedChampions.length >= 2) return;
      setSelectedChampions([...selectedChampions, champion]);
    }
  };

  const handleSubmit = () => {
    if (selectedChampions.length > 0) {
      onSubmit(selectedChampions);
    }
  };

  const handleSkipClick = () => {
    // Let the wizard decide what to do when skipping
    if (onSkip) {
      onSkip();
    } else {
      // Fallback: treat skip as "no champion filter"
      onSubmit([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold text-primary">Select Your Champions</h2>
        <p className="text-muted-foreground">
          Choose the champions you want coaching for
        </p>
        <p className="text-sm text-muted-foreground">
          {selectedChampions.length} selected
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto relative">
        <Input
          type="text"
          placeholder="Search champions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 bg-card border-border focus:border-primary"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {/* Champions Grid */}
      <div className="bg-card/50 border border-border rounded-lg p-6 max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-5 gap-3">
          {filteredChampions.map((champion) => {
            const isSelected = selectedChampions.includes(champion);
            const disabled = !isSelected && selectedChampions.length >= 2;

            return (
              <button
                key={champion}
                onClick={() => handleChampionToggle(champion)}
                aria-pressed={isSelected}
                disabled={disabled}
                className={`transition-all duration-200 flex flex-col items-center justify-center p-2 rounded-md focus:outline-none ${
                  isSelected ? "scale-105 ring-2 ring-primary" : "hover:scale-105"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="mb-2 flex items-center justify-center overflow-hidden">
                  {(() => {
                    const slug = nameToSlug[champion];
                    if (slug) {
                      const src = `/lol/15.22.1/img/champion/${slug}.png`;
                      return (
                        <img
                          src={src}
                          alt={champion}
                          className="w-20 h-20 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      );
                    }
                    return <div className="text-2xl">👤</div>;
                  })()}
                </div>
                <div className="text-sm font-medium text-foreground text-center leading-tight mt-1">
                  {champion}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Champions Preview */}
      {selectedChampions.length > 0 && (
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-2">
            Selected Champions:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedChampions.map((champion) => (
              <div
                key={champion}
                className="px-3 py-1 bg-primary/20 border border-primary rounded-full text-sm font-medium text-primary"
              >
                {champion}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4 pt-4">
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
            onClick={handleSkipClick}
            variant="outline"
            size="lg"
            className="min-w-32 border-border hover:border-primary"
          >
            Skip
          </Button>
        )}

        <Button
          onClick={handleSubmit}
          disabled={selectedChampions.length === 0}
          size="lg"
          className="min-w-32 bg-gradient-primary hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          Get Coaching
        </Button>
      </div>
    </div>
  );
};

export default ChampionStep;