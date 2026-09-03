import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import type { ReputationSnapshot, ReputationTrend } from "../types";

interface ReputationHistoryChartProps {
  snapshots: ReputationSnapshot[];
  trend: ReputationTrend | null;
}

export function ReputationHistoryChart({ snapshots, trend }: ReputationHistoryChartProps) {
  if (snapshots.length === 0) return null;

  const previous = snapshots.length > 1 ? snapshots[1] : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Reputation History</span>
      </div>

      {trend && (
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Current</p>
            <p className="text-xl font-bold text-foreground">{trend.current}</p>
          </div>
          {previous && (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Previous</p>
              <p className="text-base font-semibold text-muted-foreground">{trend.previous}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {trend.direction === "up" ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : trend.direction === "down" ? (
              <TrendingDown className="h-5 w-5 text-red-400" />
            ) : (
              <Minus className="h-5 w-5 text-muted-foreground" />
            )}
            {trend.direction !== "stable" && (
              <span className={`text-sm font-bold ${trend.direction === "up" ? "text-emerald-400" : "text-red-400"}`}>
                {trend.direction === "up" ? "+" : "-"}{trend.change}
              </span>
            )}
          </div>
        </div>
      )}

      {snapshots.length > 1 && (
        <svg viewBox="0 0 200 50" className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id="repGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const reversed = [...snapshots].reverse();
            const scores = reversed.map((s) => s.score);
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            const range = max - min || 1;
            const points = scores.map((s, i) => ({
              x: (i / (scores.length - 1)) * 200,
              y: 50 - ((s - min) / range) * 40 - 5,
            }));
            const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},50 L${points[0].x.toFixed(1)},50 Z`;
            return (
              <>
                <path d={areaPath} fill="url(#repGradient)" />
                <path d={linePath} fill="none" stroke="rgb(34 197 94)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                  <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2" fill="rgb(34 197 94)" />
                ))}
                <text x={points[points.length - 1].x + 2} y={points[points.length - 1].y + 1} fontSize="6" fill="rgb(148 163 184)" className="font-mono">
                  {scores[scores.length - 1]}
                </text>
              </>
            );
          })()}
        </svg>
      )}

      {snapshots.length > 1 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score History</p>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {snapshots.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span>
                <span className="font-mono font-semibold text-foreground/80">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
