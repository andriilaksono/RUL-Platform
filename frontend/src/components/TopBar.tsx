import React from 'react';
import { Code2, Plane } from 'lucide-react';

interface TopBarProps {
  activeTab: 'simulation' | 'telemetry' | 'architecture' | 'benchmarks' | 'diagnostics';
  onSelectTab: (tab: 'simulation' | 'telemetry' | 'architecture' | 'benchmarks' | 'diagnostics') => void;
  onOpenCodeModal: () => void;
  isRunning: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenCodeModal,
  isRunning,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      {/* Zone 1: Brand title wordmark, single text element */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <a href="/" className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <span className="text-cyan-400">
            <Plane size={24} strokeWidth={1.8} />
          </span>
          <span>Turbofan RUL Console</span>
        </a>
        <a 
          href="https://data.nasa.gov/dataset/cmapss-jet-engine-simulated-data" 
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-block text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          NASA C-MAPSS
        </a>
      </div>

      {/* Zone 2: 4–5 single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-mono">
        <button
          onClick={() => onSelectTab('simulation')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'simulation'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5'
              : 'text-slate-400'
          }`}
        >
          Simulation Stage
        </button>
        <button
          onClick={() => onSelectTab('telemetry')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'telemetry'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5'
              : 'text-slate-400'
          }`}
        >
          Multi-Sensor Curves
        </button>
        <button
          onClick={() => onSelectTab('architecture')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'architecture'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5'
              : 'text-slate-400'
          }`}
        >
          Engine Architecture
        </button>
        <button
          onClick={() => onSelectTab('benchmarks')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'benchmarks'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5'
              : 'text-slate-400'
          }`}
        >
          Model Benchmarks
        </button>
        <button
          onClick={() => onSelectTab('diagnostics')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'diagnostics'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5'
              : 'text-slate-400'
          }`}
        >
          Diagnostic Audit
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span>{isRunning ? 'RUNNING' : 'STANDBY'}</span>
        </div>

        {/* <button
          onClick={onOpenCodeModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-medium text-slate-900 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Modern Streamlit Code</span>
        </button> */}
      </div>
    </header>
  );
};
