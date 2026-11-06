import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  delta?: {
    value: string | number;
    isPositive?: boolean;
    neutral?: boolean;
  };
  status?: 'nominal' | 'warning' | 'critical' | 'neutral';
  statusText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  delta,
  status = 'neutral',
  statusText,
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'critical':
        return 'border-rose-500/40 bg-rose-950/10';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/10';
      case 'nominal':
        return 'border-cyan-500/30 bg-cyan-950/10';
      default:
        return 'border-slate-800 bg-slate-900/60';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'critical':
        return 'text-rose-400';
      case 'warning':
        return 'text-amber-400';
      case 'nominal':
        return 'text-cyan-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-150 backdrop-blur-sm ${getStatusBorder()}`}
    >
      {/* Label and Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-mono tracking-wider uppercase text-slate-400 truncate">
          {label}
        </span>
        {statusText && (
          <span className={`text-xs font-mono font-medium ${getStatusTextColor()}`}>
            {statusText}
          </span>
        )}
      </div>

      {/* Main Metric Value and Unit */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-slate-100 tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono uppercase text-slate-400">
            {unit}
          </span>
        )}
      </div>

      {/* Subtext and Delta */}
      {(subtext || delta) && (
        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
          {subtext && <span className="text-slate-500 truncate">{subtext}</span>}
          {delta && (
            <span
              className={`font-semibold tabular-nums ${
                delta.neutral
                  ? 'text-slate-400'
                  : delta.isPositive
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {delta.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
