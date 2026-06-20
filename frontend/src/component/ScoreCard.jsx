export function ScoreCard({ score }) {
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 85
      ? "oklch(0.75 0.18 150)"
      : score >= 65
      ? "oklch(0.8 0.18 80)"
      : "oklch(0.7 0.22 25)";

  const label =
    score >= 85
      ? "Highly Original"
      : score >= 65
      ? "Mostly Original"
      : "Low Originality";

  return (
    <div className="glass flex flex-col items-center rounded-2xl p-6">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Originality Score
      </div>

      <div className="relative mt-4 h-44 w-44">
        <svg viewBox="0 0 160 160" className="-rotate-90 h-full w-full">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="oklch(0.3 0.05 270)"
            strokeWidth="10"
            fill="none"
          />

          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s ease",
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-foreground">
            {score}
          </span>

          <span className="text-xs text-muted-foreground">
            / 100
          </span>
        </div>
      </div>

      <div
        className="mt-3 text-sm font-medium"
        style={{ color }}
      >
        {label}
      </div>
    </div>
  );
}