import React from 'react';
import { CycleSnapshot } from '../data/cmapssData';

interface RulGaugeProps {
  currentCycle: number;
  maxCycle: number;
  snapshot: CycleSnapshot;
  history: CycleSnapshot[];
}

export const RulGauge: React.FC<RulGaugeProps> = ({
  currentCycle,
  maxCycle,
  snapshot,
  history,
}) => {
  const { actualRul, xgboostRul, bilstmRul } = snapshot;

  // Comparison items
  const models = [
    {
      name: 'XGBoost',
      val: xgboostRul,
      color: '#06b6d4', // cyan-500
      status: xgboostRul !== null ? 'Nominal Inference' : 'Unavailable',
    },
    {
      name: 'Bi-LSTM',
      val: bilstmRul,
      color: '#a855f7', // purple-500
      status:
        bilstmRul !== null
          ? 'Bidirectional Sequence'
          : currentCycle < 30
          ? 'Buffering (Requires 30 Cycles)'
          : 'Unavailable',
    },
    {
      name: 'Actual Ground Truth',
      val: actualRul,
      color: '#10b981', // emerald-500
      status: 'Piecewise Capped (125)',
    },
  ];

  const maxValForScale = 140;

  // SVG dimensions for trajectory curve
  const width = 640;
  const height = 180;
  const paddingL = 45;
  const paddingR = 25;
  const paddingT = 20;
  const paddingB = 30;

  const chartW = width - paddingL - paddingR;
  const chartH = height - paddingT - paddingB;

  const getX = (c: number) => paddingL + ((c - 1) / Math.max(1, maxCycle - 1)) * chartW;
  const getY = (rul: number) => paddingT + chartH - (Math.min(maxValForScale, Math.max(0, rul)) / maxValForScale) * chartH;

  // Generate paths for actual, xgb, and lstm over history
  const actualPoints = history.map((h) => `${getX(h.cycle).toFixed(1)},${getY(h.actualRul).toFixed(1)}`).join(' ');

  const xgbPoints = history
    .filter((h) => h.xgboostRul !== null)
    .map((h) => `${getX(h.cycle).toFixed(1)},${getY(h.xgboostRul!).toFixed(1)}`)
    .join(' ');

  const lstmPoints = history
    .filter((h) => h.bilstmRul !== null)
    .map((h) => `${getX(h.cycle).toFixed(1)},${getY(h.bilstmRul!).toFixed(1)}`)
    .join(' ');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Remaining Useful Life (RUL) Benchmarking
          </span>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">
            Model Inference vs Ground Truth Telemetry
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-cyan-500 inline-block"></span>
            <span className="text-slate-400">XGBoost</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-purple-500 inline-block"></span>
            <span className="text-slate-400">Bi-LSTM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-emerald-500 inline-block"></span>
            <span className="text-slate-400">Ground Truth</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Model Comparison Bars */}
        <div className="lg:col-span-5 space-y-3.5">
          {models.map((m) => {
            const pct = m.val !== null ? Math.min(100, Math.max(0, (m.val / maxValForScale) * 100)) : 0;
            const diffWithActual = m.val !== null && m.name !== 'Actual Ground Truth' ? m.val - actualRul : null;

            return (
              <div
                key={m.name}
                className="rounded-lg border border-slate-800/90 bg-slate-950/40 p-3"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">{m.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    {diffWithActual !== null && (
                      <span
                        className={`text-[11px] ${
                          Math.abs(diffWithActual) <= 3
                            ? 'text-emerald-400'
                            : Math.abs(diffWithActual) <= 8
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        Δ {diffWithActual > 0 ? `+${diffWithActual.toFixed(1)}` : diffWithActual.toFixed(1)} cyc
                      </span>
                    )}
                    <span className="font-bold text-slate-100 tabular-nums">
                      {m.val !== null ? `${m.val.toFixed(1)} cycles` : '--'}
                    </span>
                  </div>
                </div>

                {/* Bar Rail */}
                <div className="relative w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>

                <div className="mt-1 text-[11px] text-slate-500 font-mono flex justify-between">
                  <span>{m.status}</span>
                  <span>{pct.toFixed(0)}% scale</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Historical RUL Trajectory Plot */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span>Cycle vs Remaining Useful Life Trajectory</span>
            <span className="text-slate-500">Playhead @ Cycle {currentCycle}</span>
          </div>

          <div className="relative w-full rounded-lg border border-slate-800/80 bg-slate-950/40 p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
              {/* Y Axis Guide lines */}
              {[125, 100, 75, 50, 25, 0].map((val) => {
                const y = getY(val);
                return (
                  <g key={`y-${val}`}>
                    <line
                      x1={paddingL}
                      y1={y}
                      x2={width - paddingR}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={paddingL - 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* 30 Cycle Warmup Marker for LSTM */}
              {maxCycle >= 30 && (
                <g>
                  <line
                    x1={getX(30)}
                    y1={paddingT}
                    x2={getX(30)}
                    y2={paddingT + chartH}
                    stroke="#a855f7"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.4"
                  />
                  <text
                    x={getX(30) + 4}
                    y={paddingT + 12}
                    fill="#a855f7"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono"
                    opacity="0.8"
                  >
                    LSTM 30-cyc gate
                  </text>
                </g>
              )}

              {/* Ground Truth Actual RUL Line */}
              {actualPoints && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  points={actualPoints}
                />
              )}

              {/* XGBoost Trajectory */}
              {xgbPoints && (
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.85"
                  points={xgbPoints}
                />
              )}

              {/* Bi-LSTM Trajectory */}
              {lstmPoints && (
                <polyline
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  points={lstmPoints}
                />
              )}

              {/* Current Playhead */}
              <line
                x1={getX(currentCycle)}
                y1={paddingT}
                x2={getX(currentCycle)}
                y2={paddingT + chartH}
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(currentCycle)}
                cy={getY(actualRul)}
                r="4"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* X Axis Labels */}
              <text x={paddingL} y={height - 8} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">
                Cycle 1
              </text>
              <text x={width - paddingR} y={height - 8} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                EoL Cycle {maxCycle}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
