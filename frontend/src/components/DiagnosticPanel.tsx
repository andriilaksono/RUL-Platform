import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { CycleSnapshot } from '../data/cmapssData';

interface DiagnosticPanelProps {
  selectedEngine: number;
  selectedDataset: string;
  currentCycle: number;
  maxCycle: number;
  snapshot: CycleSnapshot;
  onClose?: () => void;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  selectedEngine,
  selectedDataset,
  currentCycle,
  maxCycle,
  snapshot,
  onClose,
}) => {
  const lastCycle = snapshot.cycle;
  const actualRul = snapshot.actualRul;
  // C-MAPSS benchmark piecewise linear expected formula: min(125, max_cycle - last_cycle)
  const expectedRul = Math.min(125, maxCycle - lastCycle);
  const rulDifference = Math.abs(actualRul - expectedRul);
  const isPassed = rulDifference === 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              RUL Diagnostic & Benchmark Invariant Audit
            </h3>
            <p className="text-xs text-slate-400">
              Formal consistency verification between dataset ground truth and piecewise linear degradation rule.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPassed ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>DIAGNOSTIC PASSED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-950/60 border border-rose-500/40 text-rose-400 font-mono text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>MISMATCH DETECTED</span>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Grid of diagnostic variables */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 font-mono">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
            Selected Engine
          </span>
          <span className="text-lg font-bold text-slate-200">
            Engine #{selectedEngine}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Dataset: {selectedDataset}
          </span>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 font-mono">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
            Max Engine Cycle
          </span>
          <span className="text-lg font-bold text-slate-200">
            {maxCycle} <span className="text-xs font-normal text-slate-400">cyc</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Run-to-failure boundary
          </span>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 font-mono">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
            Current History Cycle
          </span>
          <span className="text-lg font-bold text-amber-400 tabular-nums">
            {lastCycle} <span className="text-xs font-normal text-slate-400">cyc</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {((lastCycle / maxCycle) * 100).toFixed(1)}% through life
          </span>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 font-mono">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
            RUL Difference
          </span>
          <span
            className={`text-lg font-bold tabular-nums ${
              rulDifference === 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {rulDifference.toFixed(4)}{' '}
            <span className="text-xs font-normal text-slate-400">cyc</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            |Actual - Expected|
          </span>
        </div>
      </div>

      {/* Verification Formula & Mathematical Invariant breakdown */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 mb-2 font-semibold">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>NASA C-MAPSS Ground Truth Linear Clipping Model</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
          <div>
            <span className="text-slate-500">Actual Dataset Value:</span>
            <div className="text-sm font-bold text-slate-100">{actualRul.toFixed(2)} cycles</div>
          </div>
          <div>
            <span className="text-slate-500">Expected Formula:</span>
            <div className="text-sm font-bold text-slate-100">
              min(125, {maxCycle} - {lastCycle}) = {expectedRul.toFixed(2)} cycles
            </div>
          </div>
          <div>
            <span className="text-slate-500">Status Verification:</span>
            <div className={`text-sm font-bold ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPassed ? '✓ 100% Invariant Compliant' : '⚠ Discrepancy Found'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
