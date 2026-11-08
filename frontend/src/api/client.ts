import type { CycleSnapshot, EngineDataset } from '../data/cmapssData';

export type DatasetId = 'FD001' | 'FD002' | 'FD003' | 'FD004';

/**
 * Base URL of the FastAPI backend.
 * - Empty (default): same-origin `/api/...`, forwarded to the backend by the
 *   Vite dev-server proxy (see vite.config.ts).
 * - Set VITE_API_BASE_URL (e.g. https://my-api.example.com) for a deployed
 *   backend; that origin must be listed in the backend's RUL_CORS_ORIGINS.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

const BACKEND_UNREACHABLE_MESSAGE =
  'Tidak dapat terhubung ke backend. Pastikan server berjalan ' +
  '(uvicorn app.main:app --reload di folder backend) dan alamat API benar.';

export class ApiError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---- Raw response shapes (match backend/app/main.py) -------------------

export interface ApiEngineSummary {
  engine_id: number;
  first_cycle: number;
  last_cycle: number;
  observed_cycles: number;
}

export interface ApiEnginesResponse {
  dataset: DatasetId;
  engines: ApiEngineSummary[];
}

export interface ApiCycleRow {
  cycle: number;
  actual_rul: number;
  xgboost_rul: number | null;
  bilstm_rul: number | null;
  sensors: Record<string, number>;
  normalized_sensors: Record<string, number>;
  operating_conditions: { altitude: number; mach: number; tra: number };
}

export interface ApiHistoryResponse {
  dataset: DatasetId;
  engine_id: number;
  min_cycle: number;
  max_cycle: number;
  sequence_length: number;
  models_available: { xgboost: boolean; bilstm: boolean };
  model_errors: Record<string, string>;
  source: string;
  cycles: ApiCycleRow[];
}

// ---- HTTP helper ---------------------------------------------------------

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(BACKEND_UNREACHABLE_MESSAGE);
  }

  if (!res.ok) {
    let detail: string | null = null;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      /* response was not JSON */
    }
    // A 5xx without a FastAPI `detail` comes from a proxy/gateway that could not
    // reach the backend (the Vite dev proxy answers 500 when it is not running).
    if (detail === null && res.status >= 500) {
      throw new ApiError(BACKEND_UNREACHABLE_MESSAGE, res.status);
    }
    throw new ApiError(detail ?? `${res.status} ${res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

// ---- Public API ----------------------------------------------------------

export function fetchEngines(dataset: DatasetId, signal?: AbortSignal) {
  return getJson<ApiEnginesResponse>(`/api/${dataset}/engines`, signal);
}

export function fetchEngineHistory(dataset: DatasetId, engineId: number, signal?: AbortSignal) {
  return getJson<ApiHistoryResponse>(`/api/${dataset}/engines/${engineId}/history`, signal);
}

// ---- Adapter: API (snake_case) -> UI types (camelCase) -------------------

export function toCycleSnapshot(row: ApiCycleRow): CycleSnapshot {
  return {
    cycle: row.cycle,
    sensors: row.sensors,
    normalizedSensors: row.normalized_sensors,
    actualRul: row.actual_rul,
    // The UI's "expected" value is the piecewise-linear label, which is exactly
    // what the backend computes as actual_rul.
    expectedRul: row.actual_rul,
    xgboostRul: row.xgboost_rul,
    bilstmRul: row.bilstm_rul,
    operatingConditions: row.operating_conditions,
  };
}

export function toEngineDataset(
  res: ApiHistoryResponse,
  meta: { operatingConditionsCount: number; faultModesCount: number; faultDescription: string },
): EngineDataset {
  return {
    datasetId: res.dataset,
    engineId: res.engine_id,
    minCycle: res.min_cycle,
    maxCycle: res.max_cycle,
    ...meta,
    snapshots: res.cycles.map(toCycleSnapshot),
  };
}
