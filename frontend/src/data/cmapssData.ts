export interface SensorMetadata {
  id: string;
  name: string;
  unit: string;
  description: string;
  nominalMin: number;
  nominalMax: number;
  component: 'Fan' | 'LPC' | 'HPC' | 'Combustor' | 'HPT' | 'LPT' | 'Nozzle';
}

export const SENSOR_METADATA: Record<string, SensorMetadata> = {
  T24: {
    id: 'T24',
    name: 'LPC Outlet Temp',
    unit: '°R',
    description: 'Total temperature at Low Pressure Compressor outlet',
    nominalMin: 641.8,
    nominalMax: 644.5,
    component: 'LPC',
  },
  T30: {
    id: 'T30',
    name: 'HPC Outlet Temp',
    unit: '°R',
    description: 'Total temperature at High Pressure Compressor outlet',
    nominalMin: 1580.0,
    nominalMax: 1610.0,
    component: 'HPC',
  },
  T50: {
    id: 'T50',
    name: 'LPT Outlet Temp',
    unit: '°R',
    description: 'Total temperature at Low Pressure Turbine outlet',
    nominalMin: 1395.0,
    nominalMax: 1425.0,
    component: 'LPT',
  },
  P30: {
    id: 'P30',
    name: 'HPC Outlet Pressure',
    unit: 'psia',
    description: 'Total static pressure at High Pressure Compressor outlet',
    nominalMin: 550.0,
    nominalMax: 557.0,
    component: 'HPC',
  },
  Nf: {
    id: 'Nf',
    name: 'Fan Speed',
    unit: 'rpm',
    description: 'Physical rotational speed of the fan spool',
    nominalMin: 2387.8,
    nominalMax: 2388.5,
    component: 'Fan',
  },
  Nc: {
    id: 'Nc',
    name: 'Core Speed',
    unit: 'rpm',
    description: 'Physical rotational speed of the core high-pressure spool',
    nominalMin: 9040.0,
    nominalMax: 9085.0,
    component: 'HPC',
  },
  Ps30: {
    id: 'Ps30',
    name: 'HPC Static Pressure',
    unit: 'psia',
    description: 'Static pressure measured at HPC exit shroud',
    nominalMin: 47.0,
    nominalMax: 47.8,
    component: 'HPC',
  },
  phi: {
    id: 'phi',
    name: 'Fuel-to-Air Ratio',
    unit: 'pps/psi',
    description: 'Ratio of fuel flow rate to combustor inlet static pressure',
    nominalMin: 520.5,
    nominalMax: 523.5,
    component: 'Combustor',
  },
  Bpr: {
    id: 'Bpr',
    name: 'Bypass Ratio',
    unit: '-',
    description: 'Ratio between bypass duct mass flow and core engine mass flow',
    nominalMin: 8.35,
    nominalMax: 8.55,
    component: 'Fan',
  },
  htBleed: {
    id: 'htBleed',
    name: 'Bleed Enthalpy',
    unit: 'BTU/lb',
    description: 'Enthalpy of cooling bleed air extracted from the compressor',
    nominalMin: 390.0,
    nominalMax: 396.0,
    component: 'HPC',
  },
  W31: {
    id: 'W31',
    name: 'HPT Coolant Bleed',
    unit: 'lbm/s',
    description: 'Cooling mass flow rate for high-pressure turbine nozzles',
    nominalMin: 38.4,
    nominalMax: 39.2,
    component: 'HPT',
  },
  W32: {
    id: 'W32',
    name: 'LPT Coolant Bleed',
    unit: 'lbm/s',
    description: 'Cooling mass flow rate for low-pressure turbine nozzles',
    nominalMin: 23.1,
    nominalMax: 23.6,
    component: 'LPT',
  },
};

export interface CycleSnapshot {
  cycle: number;
  sensors: Record<string, number>;
  normalizedSensors: Record<string, number>;
  actualRul: number;
  expectedRul: number;
  xgboostRul: number | null;
  bilstmRul: number | null;
  operatingConditions: {
    altitude: number;
    mach: number;
    tra: number;
  };
}

export interface EngineDataset {
  datasetId: 'FD001' | 'FD002' | 'FD003' | 'FD004';
  engineId: number;
  minCycle: number;
  maxCycle: number;
  operatingConditionsCount: number;
  faultModesCount: number;
  faultDescription: string;
  snapshots: CycleSnapshot[];
}

export const PREFERRED_SENSORS = ['T24', 'T30', 'T50', 'P30', 'Nf', 'Nc'];

export const ALL_SENSORS = [
  'T24', 'T30', 'T50', 'P30', 'Nf', 'Nc',
  'Ps30', 'phi', 'Bpr', 'htBleed', 'W31', 'W32'
];

export const DATASET_CONFIG = {
  FD001: {
    name: 'FD001',
    operatingConditions: 1,
    faultModes: 1,
    description: 'Sea Level | Single Fault (HPC Degradation)',
    engineCount: 5,
    maxCycles: [192, 287, 179, 215, 230],
  },
  FD002: {
    name: 'FD002',
    operatingConditions: 6,
    faultModes: 1,
    description: 'Six Operating Conditions | Single Fault (HPC Degradation)',
    engineCount: 5,
    maxCycles: [260, 290, 195, 240, 275],
  },
  FD003: {
    name: 'FD003',
    operatingConditions: 1,
    faultModes: 2,
    description: 'Sea Level | Dual Faults (HPC & Fan Degradation)',
    engineCount: 5,
    maxCycles: [210, 255, 180, 220, 245],
  },
  FD004: {
    name: 'FD004',
    operatingConditions: 6,
    faultModes: 2,
    description: 'Six Operating Conditions | Dual Faults (HPC & Fan Degradation)',
    engineCount: 5,
    maxCycles: [280, 310, 225, 265, 295],
  },
};

// Seeded pseudorandom generator for deterministic physics simulation
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generates calibrated NASA C-MAPSS dataset for an engine
export function generateEngineData(
  datasetId: 'FD001' | 'FD002' | 'FD003' | 'FD004',
  engineId: number
): EngineDataset {
  const cfg = DATASET_CONFIG[datasetId];
  const engineIndex = (engineId - 1) % cfg.maxCycles.length;
  const maxCycle = cfg.maxCycles[engineIndex] || 200;
  const minCycle = 1;

  const snapshots: CycleSnapshot[] = [];

  for (let cycle = minCycle; cycle <= maxCycle; cycle++) {
    // Degradation progression factor [0 to 1]
    const wearFraction = cycle / maxCycle;
    
    // Non-linear exponential degradation phase towards end of life
    const wearStress = Math.pow(wearFraction, 2.4);

    // Standard piece-wise linear RUL label capped at 125 cycles
    const rawRul = maxCycle - cycle;
    const pieceWiseRul = Math.min(125, rawRul);

    // Seed for consistent telemetry
    const baseSeed = cycle * 137 + engineId * 31;

    // Operating condition noise (multi-regime for FD002/FD004)
    const isMultiRegime = cfg.operatingConditions > 1;
    const altitude = isMultiRegime ? Math.floor(seededRandom(baseSeed + 1) * 35000) : 0;
    const mach = isMultiRegime ? 0.2 + seededRandom(baseSeed + 2) * 0.6 : 0.0;
    const tra = 100;

    const sensors: Record<string, number> = {};
    const normalizedSensors: Record<string, number> = {};

    ALL_SENSORS.forEach((sId, sIdx) => {
      const meta = SENSOR_METADATA[sId];
      const noise = (seededRandom(baseSeed + sIdx * 17) - 0.5) * 0.4;
      const nominalMid = (meta.nominalMin + meta.nominalMax) / 2;
      const nominalSpan = meta.nominalMax - meta.nominalMin;

      // Physics drift: T30, T50, Nc increase with HPC degradation; P30, Nf drop
      let driftFactor = 0;
      if (sId === 'T30' || sId === 'T50' || sId === 'T24') {
        driftFactor = wearStress * 1.6;
      } else if (sId === 'P30' || sId === 'Ps30') {
        driftFactor = -wearStress * 1.3;
      } else if (sId === 'phi') {
        driftFactor = wearStress * 1.1;
      } else if (sId === 'Bpr') {
        driftFactor = -wearStress * 0.9;
      } else {
        driftFactor = (seededRandom(sIdx * 3) > 0.5 ? 1 : -1) * wearStress * 0.7;
      }

      const rawVal = nominalMid + (driftFactor + noise) * (nominalSpan * 0.45);
      sensors[sId] = Number(rawVal.toFixed(3));

      // Min-Max normalized between 0.00 and 1.00
      const normVal = Math.max(0, Math.min(1, (rawVal - meta.nominalMin) / (nominalSpan || 1)));
      normalizedSensors[sId] = Number(normVal.toFixed(4));
    });

    // Model Predictions
    // 1. XGBoost: instantaneous / rolling feature estimate
    const xgbNoise = (seededRandom(baseSeed + 99) - 0.48) * (8 * wearFraction + 2);
    const xgbPred = Math.max(0, Math.min(135, pieceWiseRul + xgbNoise));
    const xgboostRul = Number(xgbPred.toFixed(2));

    // 2. Bi-LSTM: sequence-based model requiring 30 cycle window
    let bilstmRul: number | null = null;
    if (cycle >= 30) {
      // Bi-LSTM is smoother and tracks ground-truth piecewise curve with lower variance
      const lstmNoise = (seededRandom(baseSeed + 77) - 0.5) * 3.5;
      const lstmPred = Math.max(0, Math.min(130, pieceWiseRul + lstmNoise));
      bilstmRul = Number(lstmPred.toFixed(2));
    }

    snapshots.push({
      cycle,
      sensors,
      normalizedSensors,
      actualRul: pieceWiseRul,
      expectedRul: pieceWiseRul,
      xgboostRul,
      bilstmRul,
      operatingConditions: { altitude, mach, tra },
    });
  }

  return {
    datasetId,
    engineId,
    minCycle,
    maxCycle,
    operatingConditionsCount: cfg.operatingConditions,
    faultModesCount: cfg.faultModes,
    faultDescription: cfg.description,
    snapshots,
  };
}
