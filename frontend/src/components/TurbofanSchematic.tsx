import React, { useState } from 'react';
import { SENSOR_METADATA, CycleSnapshot } from '../data/cmapssData';

interface TurbofanSchematicProps {
  currentCycle: number;
  maxCycle: number;
  rul: number;
  isRunning: boolean;
  sensors: Record<string, number>;
  history?: CycleSnapshot[];
  onSelectSensor?: (sensorId: string) => void;
  selectedSensor?: string;
}

export const TurbofanSchematic: React.FC<TurbofanSchematicProps> = ({
  currentCycle,
  maxCycle,
  rul,
  isRunning,
  sensors,
  history = [],
  onSelectSensor,
  selectedSensor,
}) => {
  const [hoveredProbe, setHoveredProbe] = useState<string | null>(null);

  // Health degradation metric [0: pristine, 1: end-of-life]
  const degradation = Math.min(1, Math.max(0, (maxCycle - rul) / maxCycle));

  // Determine stress color
  const getStressColor = () => {
    if (rul <= 30) return '#f43f5e'; // rose-500
    if (rul <= 75) return '#f59e0b'; // amber-500
    return '#06b6d4'; // cyan-500
  };

  const stressColor = getStressColor();

  // Sensor probes with coordinate placement on the engine schematic (viewBox 820 x 310)
  const probes = [
    { id: 'Nf', x: 120, y: 70, label: 'Nf (Fan Speed)', val: `${sensors['Nf'] || 2388} rpm`, comp: 'Fan' },
    { id: 'T24', x: 235, y: 110, label: 'T24 (LPC Outlet)', val: `${sensors['T24'] || 642} °R`, comp: 'LPC' },
    { id: 'Nc', x: 345, y: 80, label: 'Nc (Core Speed)', val: `${sensors['Nc'] || 9050} rpm`, comp: 'HPC' },
    { id: 'T30', x: 420, y: 110, label: 'T30 (HPC Outlet)', val: `${sensors['T30'] || 1590} °R`, comp: 'HPC' },
    { id: 'P30', x: 420, y: 220, label: 'P30 (HPC Press)', val: `${sensors['P30'] || 553} psia`, comp: 'HPC' },
    { id: 'T50', x: 620, y: 115, label: 'T50 (LPT Outlet)', val: `${sensors['T50'] || 1404} °R`, comp: 'LPT' },
  ];

  // Active hovered probe metadata and historical data for the popup
  const activeHoveredMeta = hoveredProbe ? SENSOR_METADATA[hoveredProbe] : null;
  const activeProbeCoord = hoveredProbe ? probes.find((p) => p.id === hoveredProbe) : null;

  // Generate mini sparkline points for the hovered sensor
  const sparklineData = React.useMemo(() => {
    if (!hoveredProbe || history.length === 0) return null;
    const values = history.map((h) => ({
      cycle: h.cycle,
      val: h.sensors[hoveredProbe] !== undefined ? h.sensors[hoveredProbe] : 0,
    }));

    const vals = values.map((d) => d.val);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const span = maxVal - minVal || 1;

    // SVG coordinates (w: 190, h: 50)
    const w = 190;
    const h = 50;
    const pL = 8;
    const pR = 8;
    const pT = 6;
    const pB = 6;
    const cW = w - pL - pR;
    const cH = h - pT - pB;

    const points = values
      .map((d) => {
        const x = pL + ((d.cycle - 1) / Math.max(1, maxCycle - 1)) * cW;
        const norm = (d.val - minVal) / span;
        const y = pT + cH - norm * cH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const last = values[values.length - 1];
    const lastX = last ? pL + ((last.cycle - 1) / Math.max(1, maxCycle - 1)) * cW : 0;
    const lastY = last ? pT + cH - ((last.val - minVal) / span) * cH : 0;

    return {
      points,
      minVal,
      maxVal,
      lastVal: last ? last.val : 0,
      lastX,
      lastY,
      width: w,
      height: h,
    };
  }, [hoveredProbe, history, maxCycle]);

  return (
    <div className="relative w-full rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm overflow-visible">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Propulsion Cross-Section Architecture
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-mono text-slate-400">Twin-Spool High-Bypass</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400">
            HPC Degradation Index:{' '}
            <span className="font-semibold" style={{ color: stressColor }}>
              {(degradation * 100).toFixed(1)}%
            </span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">
            Operational Phase:{' '}
            <span className="text-slate-200">
              {rul <= 30 ? 'Near Failure Alert' : rul <= 75 ? 'Accelerated Wear' : 'Stable Cruise'}
            </span>
          </span>
        </div>
      </div>

      {/* SVG Vector Schematic Stage */}
      <div className="w-full relative flex items-center justify-center py-2">
        <svg
          viewBox="0 0 820 310"
          className="w-full max-h-[300px] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Linear gradients */}
            <linearGradient id="cowlGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="combustorHeat" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="degradationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stressColor} stopOpacity="0.05" />
              <stop offset="60%" stopColor={stressColor} stopOpacity={0.15 + degradation * 0.35} />
              <stop offset="100%" stopColor={stressColor} stopOpacity="0.05" />
            </linearGradient>

            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background grid markings */}
          <g stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3">
            <line x1="60" y1="165" x2="760" y2="165" />
            <line x1="200" y1="40" x2="200" y2="290" />
            <line x1="420" y1="40" x2="420" y2="290" />
            <line x1="560" y1="40" x2="560" y2="290" />
          </g>

          {/* Engine Centerline Axis */}
          <line
            x1="40"
            y1="165"
            x2="780"
            y2="165"
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="8 4 2 4"
            opacity="0.6"
          />

          {/* Outer Nacelle / Cowling (Upper & Lower) */}
          <path
            d="M 60 55 C 100 45, 220 40, 360 48 C 420 52, 450 68, 460 85 L 430 85 C 400 68, 220 60, 100 70 Z"
            fill="url(#cowlGradient)"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <path
            d="M 60 275 C 100 285, 220 290, 360 282 C 420 278, 450 262, 460 245 L 430 245 C 400 262, 220 270, 100 260 Z"
            fill="url(#cowlGradient)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Bypass Air Duct Flow Arrows */}
          <g fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 4">
            <path d="M 160 80 Q 280 75 420 85" />
            <path d="M 160 250 Q 280 255 420 245" />
          </g>

          {/* Core Nacelle Body */}
          <path
            d="M 175 110 L 460 120 L 520 125 L 670 135 L 750 155 L 750 175 L 670 195 L 520 205 L 460 210 L 175 220 Z"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Degradation Heat Overlay on Core (HPC & Combustor) */}
          <rect
            x="290"
            y="118"
            width="250"
            height="94"
            fill="url(#degradationGradient)"
            rx="6"
          />

          {/* 1. FAN MODULE */}
          <g>
            {/* Fan Nose Cone */}
            <path
              d="M 60 165 C 80 145, 115 140, 125 140 L 125 190 C 115 190, 80 185, 60 165 Z"
              fill="#475569"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Fan Blades (Upper & Lower) */}
            <g className={isRunning ? 'animate-pulse' : ''}>
              <path
                d="M 115 70 L 135 75 L 128 140 L 115 140 Z"
                fill="#94a3b8"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <path
                d="M 115 260 L 135 255 L 128 190 L 115 190 Z"
                fill="#94a3b8"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            </g>
          </g>

          {/* 2. LPC (Low Pressure Compressor) */}
          <g>
            <path d="M 190 120 L 205 122 L 200 165 L 185 165 Z" fill="#64748b" stroke="#94a3b8" strokeWidth="0.8" />
            <path d="M 220 123 L 235 125 L 230 165 L 215 165 Z" fill="#64748b" stroke="#94a3b8" strokeWidth="0.8" />
            <path d="M 190 210 L 205 208 L 200 165 L 185 165 Z" fill="#64748b" stroke="#94a3b8" strokeWidth="0.8" />
            <path d="M 220 207 L 235 205 L 230 165 L 215 165 Z" fill="#64748b" stroke="#94a3b8" strokeWidth="0.8" />
          </g>

          {/* 3. HPC (High Pressure Compressor) - Primary Degradation Zone */}
          <g>
            <rect
              x="295"
              y="125"
              width="120"
              height="80"
              fill="#1e293b"
              stroke={degradation > 0.6 ? stressColor : '#475569'}
              strokeWidth={degradation > 0.6 ? 2 : 1}
              rx="3"
            />
            {/* Compressor blade stages with narrowing diameter */}
            {[0, 1, 2, 3].map((stage) => {
              const xPos = 310 + stage * 26;
              const h = 28 - stage * 2.5;
              return (
                <g key={`hpc-${stage}`}>
                  <line x1={xPos} y1={165 - h} x2={xPos + 8} y2={165} stroke="#cbd5e1" strokeWidth="2.5" />
                  <line x1={xPos} y1={165 + h} x2={xPos + 8} y2={165} stroke="#cbd5e1" strokeWidth="2.5" />
                </g>
              );
            })}
          </g>

          {/* 4. COMBUSTOR CHAMBER */}
          <g>
            <rect x="435" y="130" width="60" height="26" fill="url(#combustorHeat)" rx="4" />
            <rect x="435" y="174" width="60" height="26" fill="url(#combustorHeat)" rx="4" />
            <circle cx="465" cy="143" r="3" fill="#ffffff" />
            <circle cx="465" cy="187" r="3" fill="#ffffff" />
          </g>

          {/* 5. HPT (High Pressure Turbine) */}
          <g>
            <line x1="515" y1="135" x2="522" y2="165" stroke="#f59e0b" strokeWidth="3" />
            <line x1="515" y1="195" x2="522" y2="165" stroke="#f59e0b" strokeWidth="3" />
          </g>

          {/* 6. LPT (Low Pressure Turbine) */}
          <g>
            <line x1="550" y1="130" x2="558" y2="165" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="550" y1="200" x2="558" y2="165" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="580" y1="128" x2="588" y2="165" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="580" y1="202" x2="588" y2="165" stroke="#38bdf8" strokeWidth="2.5" />
          </g>

          {/* Core Shafts */}
          <line x1="125" y1="165" x2="630" y2="165" stroke="#94a3b8" strokeWidth="5" />
          <line x1="285" y1="165" x2="530" y2="165" stroke="#f8fafc" strokeWidth="9" opacity="0.3" />

          {/* Exhaust Core Flow */}
          <polygon
            points="670,140 760,150 760,180 670,190"
            fill={stressColor}
            opacity={0.15 + degradation * 0.25}
          />

          {/* Component Annotation Labels */}
          <text x="125" y="30" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            FAN
          </text>
          <text x="220" y="30" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            LPC
          </text>
          <text x="355" y="30" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            HPC
          </text>
          <text x="465" y="30" fill="#f59e0b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            COMBUSTOR
          </text>
          <text x="525" y="30" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            HPT
          </text>
          <text x="575" y="30" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            LPT
          </text>
          <text x="730" y="30" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            EXHAUST
          </text>

          {/* SENSOR PROBES */}
          {probes.map((probe) => {
            const isHovered = hoveredProbe === probe.id;
            const isSelected = selectedSensor === probe.id;
            
            return (
              <g
                key={probe.id}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredProbe(probe.id)}
                onMouseLeave={() => setHoveredProbe(null)}
                onClick={() => onSelectSensor && onSelectSensor(probe.id)}
              >
                {/* Connecting hairline */}
                <line
                  x1={probe.x}
                  y1={probe.y}
                  x2={probe.x}
                  y2={probe.y > 165 ? probe.y - 25 : probe.y + 25}
                  stroke={isSelected ? '#38bdf8' : isHovered ? '#f59e0b' : '#64748b'}
                  strokeWidth="1.2"
                  strokeDasharray={isSelected ? 'none' : '2 2'}
                />

                {/* Probe Anchor Pin */}
                <circle
                  cx={probe.x}
                  cy={probe.y}
                  r={isSelected ? 6 : isHovered ? 6 : 4}
                  fill={isSelected ? '#38bdf8' : isHovered ? '#f59e0b' : '#0f172a'}
                  stroke={isSelected ? '#38bdf8' : isHovered ? '#ffffff' : '#94a3b8'}
                  strokeWidth="2"
                />

                {/* Probe Label Box */}
                <g transform={`translate(${probe.x - 36}, ${probe.y > 165 ? probe.y + 8 : probe.y - 26})`}>
                  <rect
                    width="72"
                    height="18"
                    rx="3"
                    fill={isSelected ? '#0369a1' : isHovered ? '#1e293b' : '#0f172a'}
                    stroke={isSelected ? '#38bdf8' : isHovered ? '#f59e0b' : '#334155'}
                    strokeWidth={isHovered ? '1.5' : '1'}
                  />
                  <text
                    x="36"
                    y="13"
                    fill={isSelected ? '#ffffff' : isHovered ? '#f59e0b' : '#e2e8f0'}
                    fontSize="9.5"
                    fontFamily="JetBrains Mono"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {probe.id}: {sensors[probe.id] ? Number(sensors[probe.id]).toFixed(0) : '--'}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* =========================================================
            HOVER POPUP MINI SENSOR GRAPH (Requested by user)
            ========================================================= */}
        {hoveredProbe && activeHoveredMeta && activeProbeCoord && (
          <div
            className="absolute z-40 pointer-events-none transition-all duration-200 transform -translate-x-1/2"
            style={{
              left: `${(activeProbeCoord.x / 820) * 100}%`,
              top: activeProbeCoord.y > 150 ? 'auto' : `${(activeProbeCoord.y / 310) * 100}%`,
              bottom: activeProbeCoord.y > 150 ? `${100 - (activeProbeCoord.y / 310) * 100 + 4}%` : 'auto',
              marginTop: activeProbeCoord.y > 150 ? 0 : '16px',
            }}
          >
            <div className="w-64 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md text-left">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-cyan-400">{hoveredProbe}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">
                    {activeHoveredMeta.name}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                  {activeHoveredMeta.component}
                </span>
              </div>

              {/* Value and nominal band */}
              <div className="flex items-baseline justify-between mt-2 mb-1">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-lg font-bold text-slate-100 tabular-nums">
                    {sensors[hoveredProbe] !== undefined
                      ? sensors[hoveredProbe].toFixed(2)
                      : '--'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeHoveredMeta.unit}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  <span>Nominal: </span>
                  <span className="text-slate-300">
                    {activeHoveredMeta.nominalMin.toFixed(0)}-{activeHoveredMeta.nominalMax.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Mini Sparkline Chart */}
              {sparklineData && sparklineData.points ? (
                <div className="mt-2 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-0.5">
                    <span>Min: {sparklineData.minVal.toFixed(1)}</span>
                    <span className="text-cyan-400">Cycle {currentCycle} Live Trend</span>
                    <span>Max: {sparklineData.maxVal.toFixed(1)}</span>
                  </div>

                  <svg
                    viewBox={`0 0 ${sparklineData.width} ${sparklineData.height}`}
                    className="w-full h-11 bg-slate-900/90 rounded border border-slate-800 overflow-hidden"
                  >
                    {/* Trend polyline */}
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklineData.points}
                    />

                    {/* Active playhead dot */}
                    <circle
                      cx={sparklineData.lastX}
                      cy={sparklineData.lastY}
                      r="3.5"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-slate-500 text-center py-2">
                  Buffering sensor telemetry...
                </div>
              )}

              <div className="mt-2 text-[9px] font-mono text-slate-500 text-center">
                Click probe to anchor & view full telemetry curve
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sensor Legend / Active Probe HUD */}
      <div className="mt-2 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-mono text-slate-300">Hover probe to preview graph</span>
          <span>·</span>
          <span>Click probe to view detailed channel curves.</span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-cyan-500/80"></span>
            <span className="text-slate-400">Nominal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/80"></span>
            <span className="text-slate-400">Elevated Stress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500/80"></span>
            <span className="text-slate-400">Critical Wear</span>
          </div>
        </div>
      </div>
    </div>
  );
};
