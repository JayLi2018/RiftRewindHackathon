import * as React from "react";

interface RankIconProps {
  tier: string;
  size?: number;
}

// Simple stylized shield icon per tier. Colors are approximate and meant as UI embellishments.
export default function RankIcon({ tier, size = 64 }: RankIconProps) {
  const colorMap: Record<string, string> = {
    Iron: "#6b6b6b",
    Bronze: "#b4683e",
    Silver: "#9fb1c8",
    Gold: "#d8a300",
    Platinum: "#00b3b3",
    Emerald: "#2aa65a",
    Diamond: "#4fb3ff",
    Master: "#b86bd7",
    Grandmaster: "#ff6b6b",
    Challenger: "#ffd166",
  };

  const fill = colorMap[tier] ?? "#999999";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${tier} rank`}
    >
      <defs>
        <linearGradient id={`g-${tier}`} x1="0" x2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#111827" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M32 4 L52 14 L52 36 C52 48 41 58 32 60 C23 58 12 48 12 36 L12 14 Z"
          fill={`url(#g-${tier})`}
          stroke="#00000022"
          strokeWidth={1}
        />
        <circle cx="32" cy="30" r="8" fill="#ffffff" opacity={0.08} />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontSize="10"
          fontWeight={700}
          fill="#fff"
          opacity={0.95}
        >
          {tier[0]}
        </text>
      </g>
    </svg>
  );
}
