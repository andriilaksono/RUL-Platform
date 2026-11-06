/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  FastForward,
  Sliders,
  Database,
  Gauge,
  Activity,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Download,
  Code2,
} from 'lucide-react';

import {
  DATASET_CONFIG,
  PREFERRED_SENSORS,
  ALL_SENSORS,
  generateEngineData,
  SENSOR_METADATA,
} from './data/cmapssData';

import { TurbofanSchematic } from './components/TurbofanSchematic';
import { MetricCard } from './components/MetricCard';
import { SensorChart } from './components/SensorChart';
import { RulGauge } from './components/RulGauge';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { SensorTable } from './components/SensorTable';
import { TopBar } from './components/TopBar';
import { StreamlitRedesignModal } from './components/StreamlitRedesignModal';

export default function App() {
  // Navigation / View state
  const [activeTab, setActiveTab] = useState<
    'simulation' | 'telemetry' | 'architecture' | 'benchmarks' | 'diagnostics'
  >('simulation');
  const [showCodeModal, setShowCodeModal] = useState(false);

  // Dataset & Engine selection
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    'FD001' | 'FD002' | 'FD003' | 'FD004'
  >('FD001');
  const [selectedEngineId, setSelectedEngineId] = useState<number>(1);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);
  const [currentCycle, setCurrentCycle] = useState<number>(1);

  // Selected sensor for focused inspection
  const [focusedSensor, setFocusedSensor] = useState<string>('T30');
  const [sensorCategoryFilter, setSensorCategoryFilter] = useState<
    'ALL' | 'TEMP' | 'PRESSURE' | 'SPEED' | 'FLOW'
  >('ALL');

  const scrollToSection = (sectionId: 'simulation' | 'telemetry' | 'architecture' | 'benchmarks' | 'diagnostics') => {
    setActiveTab(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Generate or memoize engine dataset
  const engineDataset = useMemo(() => {
    return generateEngineData(selectedDatasetId, selectedEngineId);
  }, [selectedDatasetId, selectedEngineId]);

  const maxCycle = engineDataset.maxCycle;
  const minCycle = engineDataset.minCycle;

  // Reset cycle when dataset or engine changes
  useEffect(() => {
    setCurrentCycle(minCycle);
    setIsPlaying(false);
  }, [selectedDatasetId, selectedEngineId, minCycle]);

  // Keep cycle clamped
  useEffect(() => {
    if (currentCycle > maxCycle) {
      setCurrentCycle(maxCycle);
      setIsPlaying(false);
    }
  }, [currentCycle, maxCycle]);

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentCycle((prev) => {
        if (prev >= maxCycle) {
          setIsPlaying(false);
          return maxCycle;
        }
        return Math.min(maxCycle, prev + playbackSpeed);
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxCycle]);

  // Get active cycle snapshot
  const currentSnapshot = useMemo(() => {
    const idx = Math.min(currentCycle - 1, engineDataset.snapshots.length - 1);
    return (
      engineDataset.snapshots[idx] ||
      engineDataset.snapshots[engineDataset.snapshots.length - 1]
    );
  }, [currentCycle, engineDataset]);

  // Get history up to current cycle
  const currentHistory = useMemo(() => {
    return engineDataset.snapshots.slice(0, currentCycle);
  }, [currentCycle, engineDataset]);

  // Playback controls handlers
  const handleTogglePlay = () => {
    if (currentCycle >= maxCycle) {
      setCurrentCycle(minCycle);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentCycle(minCycle);
  };

  const handleStepForward = (step: number = 1) => {
    setCurrentCycle((prev) => Math.min(maxCycle, prev + step));
  };

  // Filter all 12 sensors based on selected category filter
  const displayedSensors = useMemo(() => {
    if (sensorCategoryFilter === 'TEMP') return ['T24', 'T30', 'T50'];
    if (sensorCategoryFilter === 'PRESSURE') return ['P30', 'Ps30'];
    if (sensorCategoryFilter === 'SPEED') return ['Nf', 'Nc', 'Bpr'];
    if (sensorCategoryFilter === 'FLOW') return ['phi', 'htBleed', 'W31', 'W32'];
    return ALL_SENSORS;
  }, [sensorCategoryFilter]);

  // Dataset info
  const currentDatasetCfg = DATASET_CONFIG[selectedDatasetId];

  // Degradation percentage
  const lifeProgress = (
    ((currentCycle - minCycle) / Math.max(1, maxCycle - minCycle)) *
    100
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30">
      {/* Strict 3-zone Top Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={scrollToSection}
        onOpenCodeModal={() => setShowCodeModal(true)}
        isRunning={isPlaying}
      />

      {/* Main Workspace: Left Parameter Control Sidebar + Right Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 gap-6">
        {/* =========================================================
            LEFT CONTROL & PARAMETER RAIL (320px fixed on desktop)
            ========================================================= */}
        <aside className="w-full lg:w-80 shrink-0 space-y-5">
          {/* Simulation Configuration Panel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                Simulation Setup
              </h2>
            </div>

            {/* Dataset Selector */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1.5">
                  Select Dataset
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 rounded-lg border border-slate-800">
                  {(['FD001', 'FD002', 'FD003', 'FD004'] as const).map(
                    (dsId) => (
                      <button
                        key={dsId}
                        onClick={() => setSelectedDatasetId(dsId)}
                        className={`py-1.5 px-3 text-xs font-mono font-medium rounded-md transition-colors ${
                          selectedDatasetId === dsId
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {dsId}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Dataset Metadata Box */}
              <div className="rounded-lg border border-slate-800/90 bg-slate-950/50 p-3 text-xs font-mono space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Operating Regimes:</span>
                  <span className="font-semibold text-slate-200">
                    {currentDatasetCfg.operatingConditions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fault Modes:</span>
                  <span className="font-semibold text-slate-200">
                    {currentDatasetCfg.faultModes}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/70 text-[11px] text-slate-500">
                  {currentDatasetCfg.description}
                </div>
              </div>

              {/* Engine Unit Selector */}
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1.5">
                  Engine Unit ID
                </label>
                <select
                  value={selectedEngineId}
                  onChange={(e) => setSelectedEngineId(Number(e.target.value))}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
                >
                  {[1, 2, 3, 4, 5].map((id) => (
                    <option key={id} value={id}>
                      Engine #{id} (Run-to-failure: {currentDatasetCfg.maxCycles[(id - 1) % 5]} cycles)
                    </option>
                  ))}
                </select>
              </div>

              {/* Playback Speed Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1.5">
                  <span>Playback Rate:</span>
                  <span className="font-bold text-cyan-400">
                    {playbackSpeed} cycles / tick
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-1">
                  <span>1 cyc/tick</span>
                  <span>10</span>
                  <span>20 cyc/tick</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Availability Matrix */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-3">
              <Layers className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                Model Availability
              </h2>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg border border-slate-800/80 bg-slate-950/40">
                <span className="text-slate-300">XGBoost Regressor</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg border border-slate-800/80 bg-slate-950/40">
                <span className="text-slate-300">Bi-LSTM Recurrent</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-mono">
              * Bi-LSTM uses a 30-cycle sliding window sequence buffer.
            </div>
          </div>

          {/* Quick Code Reference Card */}
          {/* <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold mb-1.5">
              <Code2 className="w-4 h-4" />
              <span>Modern Streamlit Code</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Need to deploy this modernized UI directly in Python? Get the complete redesigned script with Plotly and modern cards.
            </p>
            <button
              onClick={() => setShowCodeModal(true)}
              className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View & Copy Python Code</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div> */}
        </aside>

        {/* =========================================================
            RIGHT MAIN STAGE (Adaptive Grid & Panels)
            ========================================================= */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Engine Status & Execution Banner */}
          <div id="simulation" className="scroll-mt-20 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                  <span>NASA C-MAPSS Telemetry Stream</span>
                  <span>·</span>
                  <span className="text-cyan-400">Turbofan #{selectedEngineId}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                  <span>Historical Playback Console</span>
                  {isPlaying ? (
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                      ENGINE RUNNING
                    </span>
                  ) : (
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 font-semibold">
                      STANDBY
                    </span>
                  )}
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md ${
                    isPlaying
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>STOP ENGINE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>START ENGINE</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleRestart}
                  title="Reset cycle to 1"
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleStepForward(5)}
                  disabled={currentCycle >= maxCycle}
                  title="Step forward +5 cycles"
                  className="px-3 py-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors disabled:opacity-40"
                >
                  +5 Cyc
                </button>
              </div>
            </div>

            {/* Cycle Progress Scrubber Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">
                  Cycle Position:{' '}
                  <span className="font-bold text-slate-100 tabular-nums">
                    {currentCycle}
                  </span>{' '}
                  / {maxCycle} cycles
                </span>
                <span className="text-cyan-400 font-semibold">
                  {lifeProgress}% Engine Life Elapsed
                </span>
              </div>

              <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 rounded-full transition-all duration-150"
                  style={{ width: `${lifeProgress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Cycle 1 (Commissioning)</span>
                <span>Operating Conditions: SL / ISA</span>
                <span>Cycle {maxCycle} (Run-to-failure Limit)</span>
              </div>
            </div>
          </div>

          {/* Primary Metric Strip (Section 11 & 14 from user code) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <MetricCard
              label="Selected Dataset"
              value={selectedDatasetId}
              unit={`Unit #${selectedEngineId}`}
              subtext={`${currentDatasetCfg.operatingConditions} regime · ${currentDatasetCfg.faultModes} fault`}
            />

            <MetricCard
              label="Actual Ground Truth RUL"
              value={currentSnapshot.actualRul.toFixed(1)}
              unit="cycles"
              subtext="C-MAPSS Piecewise Target"
              status={currentSnapshot.actualRul <= 30 ? 'critical' : currentSnapshot.actualRul <= 75 ? 'warning' : 'nominal'}
              statusText={currentSnapshot.actualRul <= 30 ? 'CRITICAL' : 'NOMINAL'}
            />

            <MetricCard
              label="XGBoost Prediction"
              value={
                currentSnapshot.xgboostRul !== null
                  ? currentSnapshot.xgboostRul.toFixed(1)
                  : '--'
              }
              unit="cycles"
              delta={
                currentSnapshot.xgboostRul !== null
                  ? {
                      value: `Δ ${(
                        currentSnapshot.xgboostRul - currentSnapshot.actualRul
                      ).toFixed(1)} cyc`,
                      isPositive:
                        Math.abs(
                          currentSnapshot.xgboostRul - currentSnapshot.actualRul
                        ) <= 5,
                    }
                  : undefined
              }
              subtext="Instantaneous Feature Map"
            />

            <MetricCard
              label="Bi-LSTM Prediction"
              value={
                currentSnapshot.bilstmRul !== null
                  ? currentSnapshot.bilstmRul.toFixed(1)
                  : currentCycle < 30
                  ? 'Warmup'
                  : '--'
              }
              unit={currentSnapshot.bilstmRul !== null ? 'cycles' : ''}
              subtext={
                currentCycle < 30
                  ? `Need ${30 - currentCycle} more cycles`
                  : 'Sequence Bidirectional Model'
              }
              status={currentCycle < 30 ? 'warning' : 'nominal'}
              statusText={currentCycle < 30 ? 'BUFFERING' : 'INFERENCE'}
            />
          </div>

          {/* Turbofan Cross-Section Engine Architecture */}
          <div id="architecture" className="scroll-mt-20">
            <TurbofanSchematic
              currentCycle={currentCycle}
              maxCycle={maxCycle}
              rul={currentSnapshot.actualRul}
              isRunning={isPlaying}
              sensors={currentSnapshot.sensors}
              history={currentHistory}
              selectedSensor={focusedSensor}
              onSelectSensor={(sId) => setFocusedSensor(sId)}
            />
          </div>

          {/* All Engine Sensor Telemetry Channels (Replaced & Expanded) */}
          <div id="telemetry" className="scroll-mt-20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>All Engine Sensor Telemetry Channels</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Continuous multi-channel sensor curves with calibrated nominal operating bounds for all 12 C-MAPSS channels.
                </p>
              </div>

              {/* Category Filter Controls */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono overflow-x-auto">
                <button
                  onClick={() => setSensorCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    sensorCategoryFilter === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All (12)
                </button>
                <button
                  onClick={() => setSensorCategoryFilter('TEMP')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    sensorCategoryFilter === 'TEMP'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Temperatures (3)
                </button>
                <button
                  onClick={() => setSensorCategoryFilter('PRESSURE')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    sensorCategoryFilter === 'PRESSURE'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pressures (2)
                </button>
                <button
                  onClick={() => setSensorCategoryFilter('SPEED')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    sensorCategoryFilter === 'SPEED'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Speeds & Ratio (3)
                </button>
                <button
                  onClick={() => setSensorCategoryFilter('FLOW')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    sensorCategoryFilter === 'FLOW'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flow & Bleed (4)
                </button>
              </div>
            </div>

            {/* Grid of all sensor charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSensors.map((sId) => {
                const chartData = currentHistory.map((h) => ({
                  cycle: h.cycle,
                  value: h.sensors[sId] !== undefined ? h.sensors[sId] : 0,
                }));

                const colorMap: Record<string, string> = {
                  T24: '#38bdf8',    // sky-400
                  T30: '#f59e0b',    // amber-500
                  T50: '#f43f5e',    // rose-500
                  P30: '#06b6d4',    // cyan-500
                  Nf: '#10b981',     // emerald-500
                  Nc: '#a855f7',     // purple-500
                  Ps30: '#6366f1',   // indigo-500
                  phi: '#fb923c',    // orange-400
                  Bpr: '#14b8a6',    // teal-500
                  htBleed: '#8b5cf6', // violet-500
                  W31: '#eab308',    // yellow-500
                  W32: '#ec4899',    // pink-500
                };

                return (
                  <SensorChart
                    key={sId}
                    sensorId={sId}
                    data={chartData}
                    currentCycle={currentCycle}
                    maxCycle={maxCycle}
                    color={colorMap[sId] || '#06b6d4'}
                  />
                );
              })}
            </div>
          </div>

          {/* Model Benchmarking & RUL Trajectory Plot */}
          <div id="benchmarks" className="scroll-mt-20">
            <RulGauge
              currentCycle={currentCycle}
              maxCycle={maxCycle}
              snapshot={currentSnapshot}
              history={currentHistory}
            />
          </div>

          {/* RUL Invariant Diagnostic Section (Section 10.5 from user code) */}
          <div id="diagnostics" className="scroll-mt-20">
            <DiagnosticPanel
              selectedEngine={selectedEngineId}
              selectedDataset={selectedDatasetId}
              currentCycle={currentCycle}
              maxCycle={maxCycle}
              snapshot={currentSnapshot}
            />
          </div>

          {/* Telemetry Inspector Table (Section 14 from user code) */}
          <SensorTable
            currentCycle={currentCycle}
            sensors={currentSnapshot.sensors}
            normalizedSensors={currentSnapshot.normalizedSensors}
            selectedSensor={focusedSensor}
            onSelectSensor={(sId) => setFocusedSensor(sId)}
          />
        </main>
      </div>

      {/* Modern Streamlit Code Modal */}
      {/* <StreamlitRedesignModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
      /> */}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>Turbofan RUL Predictive Maintenance Platform</span>
          <span>·</span>
          <span>NASA C-MAPSS Benchmark Archive</span>
        </div>
        <div className="text-slate-400">
          Historical simulation based on run-to-failure degradation physics
        </div>
      </footer>
    </div>
  );
}
