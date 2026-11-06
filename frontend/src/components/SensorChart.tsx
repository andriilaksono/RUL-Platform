import React, { useState, useRef } from 'react';
import { SENSOR_METADATA } from '../data/cmapssData';

interface SensorChartProps {
  sensorId: string;
  data: Array<{ cycle: number; value: number }>;
  currentCycle: number;
  maxCycle: number;
  height?: number;
  color?: string;
  nominalBand?: { min: number; max: number };
}

export const SensorChart: React.FC<SensorChartProps> = ({
  sensorId,
  data,
  currentCycle,
  maxCycle,
  height = 180,
  color = '#06b6d4',
  nominalBand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const meta = SENSOR_METADATA[sensorId] || {
    name: sensorId,
    unit: '',
    description: '',
    nominalMin: 0,
    nominalMax: 100,
  };

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40 text-xs font-mono text-slate-500"
      >
        Awaiting sensor cycle telemetry...
      </div>
    );
  }

  // Values calculation
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valSpan = maxVal - minVal || 1;
  const paddingY = valSpan * 0.15;
  const yDomainMin = minVal - paddingY;
  const yDomainMax = maxVal + paddingY;
  const ySpan = yDomainMax - yDomainMin || 1;

  // SVG Coordinates calculation
  const width = 500;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Map point to SVG coords
  const getX = (cycle: number) => {
    return paddingLeft + ((cycle - 1) / Math.max(1, maxCycle - 1)) * chartW;
  };

  const getY = (val: number) => {
    const norm = (val - yDomainMin) / ySpan;
    return paddingTop + chartH - norm * chartH;
  };

  // Generate polyline points
  const points = data
    .map((d) => `${getX(d.cycle).toFixed(1)},${getY(d.value).toFixed(1)}`)
    .join(' ');

  // Current point
  const latestPoint = data[data.length - 1];
  const currentX = latestPoint ? getX(latestPoint.cycle) : 0;
  const currentY = latestPoint ? getY(latestPoint.value) : 0;

  // Nominal band coords
  const bandMin = nominalBand ? nominalBand.min : meta.nominalMin;
  const bandMax = nominalBand ? nominalBand.max : meta.nominalMax;
  const bandY1 = getY(bandMax);
  const bandY2 = getY(bandMin);

  // Hovered item
  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : latestPoint;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX < paddingLeft || svgX > width - paddingRight) {
      setHoverIndex(null);
      return;
    }

    const ratio = (svgX - paddingLeft) / chartW;
    const targetCycle = 1 + ratio * (maxCycle - 1);

    // Find closest index in data
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(data[i].cycle - targetCycle);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 transition-colors hover:border-slate-700/80"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold font-mono text-slate-200">
            {sensorId}
          </span>
          <span className="text-xs text-slate-400 font-normal truncate max-w-[170px]">
            {meta.name}
          </span>
        </div>

        <div className="flex items-baseline gap-1 text-xs font-mono">
          <span className="text-slate-400">Current:</span>
          <span className="font-bold text-slate-100 tabular-nums">
            {activePoint ? activePoint.value.toFixed(2) : '--'}
          </span>
          <span className="text-slate-400 text-[10px]">{meta.unit}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-crosshair select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * chartH;
          const val = yDomainMax - ratio * ySpan;
          return (
            <g key={`grid-y-${idx}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="JetBrains Mono"
                textAnchor="end"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Nominal safe zone band */}
        {bandY2 > paddingTop && bandY1 < paddingTop + chartH && (
          <rect
            x={paddingLeft}
            y={Math.max(paddingTop, bandY1)}
            width={chartW}
            height={Math.max(2, Math.min(paddingTop + chartH, bandY2) - Math.max(paddingTop, bandY1))}
            fill="#06b6d4"
            fillOpacity="0.06"
          />
        )}

        {/* Full cycle envelope limit line */}
        <line
          x1={width - paddingRight}
          y1={paddingTop}
          x2={width - paddingRight}
          y2={paddingTop + chartH}
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Historical Sensor Trace Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Current playback playhead line */}
        <line
          x1={currentX}
          y1={paddingTop}
          x2={currentX}
          y2={paddingTop + chartH}
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          opacity="0.8"
        />

        {/* Current active dot */}
        {latestPoint && (
          <circle
            cx={currentX}
            cy={currentY}
            r="3.5"
            fill={color}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        )}

        {/* Hover Crosshair indicator */}
        {activePoint && hoverIndex !== null && (
          <g>
            <line
              x1={getX(activePoint.cycle)}
              y1={paddingTop}
              x2={getX(activePoint.cycle)}
              y2={paddingTop + chartH}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <circle
              cx={getX(activePoint.cycle)}
              cy={getY(activePoint.value)}
              r="4.5"
              fill="#ffffff"
              stroke={color}
              strokeWidth="2"
            />
            {/* Floating label */}
            <g transform={`translate(${Math.min(width - 90, Math.max(paddingLeft, getX(activePoint.cycle) - 35))}, ${paddingTop + 6})`}>
              <rect width="70" height="18" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
              <text x="35" y="12" fill="#f8fafc" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
                C:{activePoint.cycle} | {activePoint.value.toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* X Axis ticks */}
        <text
          x={paddingLeft}
          y={height - 8}
          fill="#64748b"
          fontSize="9"
          fontFamily="JetBrains Mono"
          textAnchor="start"
        >
          Cycle 1
        </text>
        <text
          x={width - paddingRight}
          y={height - 8}
          fill="#64748b"
          fontSize="9"
          fontFamily="JetBrains Mono"
          textAnchor="end"
        >
          Max: {maxCycle}
        </text>
      </svg>
    </div>
  );
};
