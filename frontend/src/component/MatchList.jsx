export function MatchList({ matches }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Similar Matches
        </h3>

        <span className="text-xs text-muted-foreground">
          {matches.length} found
        </span>
      </div>

      <ul className="space-y-3">
        {matches.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/20 p-3 transition hover:border-[oklch(0.7_0.22_270)]/40"
          >
            <img
              src={m.thumbnail}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />

            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {m.source}
              </div>

              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[oklch(0.7_0.22_270)] to-[oklch(0.7_0.22_230)]"
                  style={{
                    width: `${m.similarity}%`,
                  }}
                />
              </div>
            </div>

            <div className="font-mono text-sm font-semibold text-foreground">
              {m.similarity}%
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}