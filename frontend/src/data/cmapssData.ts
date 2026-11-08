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

// Static facts about the NASA C-MAPSS subsets. Engine lists and cycle counts
// come from the backend API, not from here.
export const DATASET_CONFIG = {
  FD001: {
    name: 'FD001',
    operatingConditions: 1,
    faultModes: 1,
    description: 'Sea Level | Single Fault (HPC Degradation)',
  },
  FD002: {
    name: 'FD002',
    operatingConditions: 6,
    faultModes: 1,
    description: 'Six Operating Conditions | Single Fault (HPC Degradation)',
  },
  FD003: {
    name: 'FD003',
    operatingConditions: 1,
    faultModes: 2,
    description: 'Sea Level | Dual Faults (HPC & Fan Degradation)',
  },
  FD004: {
    name: 'FD004',
    operatingConditions: 6,
    faultModes: 2,
    description: 'Six Operating Conditions | Dual Faults (HPC & Fan Degradation)',
  },
};
