import React, { useState } from 'react';
import { Search, Download, Check, AlertCircle } from 'lucide-react';
import { SENSOR_METADATA, ALL_SENSORS } from '../data/cmapssData';

interface SensorTableProps {
  currentCycle: number;
  sensors: Record<string, number>;
  normalizedSensors: Record<string, number>;
  onSelectSensor?: (sensorId: string) => void;
  selectedSensor?: string;
}

export const SensorTable: React.FC<SensorTableProps> = ({
  currentCycle,
  sensors,
  normalizedSensors,
  onSelectSensor,
  selectedSensor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterComponent, setFilterComponent] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const filteredSensors = ALL_SENSORS.filter((id) => {
    const meta = SENSOR_METADATA[id];
    if (!meta) return false;
    const matchesSearch =
      id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meta.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meta.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesComp = filterComponent === 'ALL' || meta.component === filterComponent;
    return matchesSearch && matchesComp;
  });

  const exportCSV = () => {
    const headers = ['Sensor ID', 'Name', 'Component', 'Raw Value', 'Unit', 'Normalized (0-1)', 'Nominal Min', 'Nominal Max'];
    const rows = ALL_SENSORS.map((id) => {
      const meta = SENSOR_METADATA[id];
      const raw = sensors[id] || 0;
      const norm = normalizedSensors[id] || 0;
      return [id, `"${meta.name}"`, meta.component, raw, meta.unit, norm, meta.nominalMin, meta.nominalMax].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `turbofan_sensors_cycle_${currentCycle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySnapshot = () => {
    const summary = ALL_SENSORS.map((id) => {
      const meta = SENSOR_METADATA[id];
      return `${id} (${meta.name}): ${sensors[id]} ${meta.unit} [Norm: ${normalizedSensors[id]}]`;
    }).join('\n');
    navigator.clipboard.writeText(`Cycle ${currentCycle} Telemetry Snapshot:\n` + summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Telemetry Inspector · Cycle {currentCycle}
          </span>
          <h3 className="text-sm font-semibold text-slate-100">
            Current Cycle Sensor Values & Normalization Pipeline
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copySnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sensor ID, name, or description..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>

        {/* Component selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs font-mono overflow-x-auto">
          {['ALL', 'Fan', 'LPC', 'HPC', 'Combustor', 'HPT', 'LPT'].map((comp) => (
            <button
              key={comp}
              onClick={() => setFilterComponent(comp)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterComponent === comp
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {comp}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Sensor ID</th>
              <th className="py-2.5 px-3">Sensor Nomenclature</th>
              <th className="py-2.5 px-3">Subsystem</th>
              <th className="py-2.5 px-3 text-right">Engineering Value</th>
              <th className="py-2.5 px-3 text-right">Normalized (0.0 - 1.0)</th>
              <th className="py-2.5 px-3">Gauge Band</th>
              <th className="py-2.5 px-3">Operational Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredSensors.map((id) => {
              const meta = SENSOR_METADATA[id];
              const raw = sensors[id];
              const norm = normalizedSensors[id] || 0;
              const isSelected = selectedSensor === id;

              // Operational status assessment
              const isHigh = norm > 0.85;
              const isLow = norm < 0.15;
              const isWarning = isHigh || isLow;

              return (
                <tr
                  key={id}
                  onClick={() => onSelectSensor && onSelectSensor(id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/30 text-cyan-200'
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                    {id}
                    {isSelected && <span className="text-[10px] text-cyan-400">●</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-slate-200 font-medium">{meta.name}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{meta.description}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{meta.component}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-slate-100">
                    {raw !== undefined ? raw.toFixed(3) : '--'}{' '}
                    <span className="text-slate-500 font-normal text-[10px]">{meta.unit}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span className="font-semibold text-cyan-400">{norm.toFixed(4)}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {/* Micro gauge bar */}
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isWarning ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, norm * 100))}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {isWarning ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                        <AlertCircle className="w-3 h-3" />
                        <span>Shifted</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[11px]">Nominal</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
