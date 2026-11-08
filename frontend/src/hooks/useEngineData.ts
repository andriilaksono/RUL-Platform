import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiEngineSummary,
  ApiError,
  DatasetId,
  fetchEngineHistory,
  fetchEngines,
  toEngineDataset,
} from '../api/client';
import { DATASET_CONFIG, EngineDataset } from '../data/cmapssData';

export type LoadStatus = 'loading' | 'ready' | 'error';

interface ModelInfo {
  available: { xgboost: boolean; bilstm: boolean };
  errors: Record<string, string>;
}

/** Engine list for a dataset (from the backend, not hard-coded). */
export function useEngineList(datasetId: DatasetId) {
  const [state, setState] = useState<{
    key: string;
    engines: ApiEngineSummary[] | null;
    error: string | null;
  }>({ key: '', engines: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const key = `${datasetId}#${reloadToken}`;
    fetchEngines(datasetId, ctrl.signal)
      .then((res) => setState({ key, engines: res.engines, error: null }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({ key, engines: null, error: err instanceof ApiError ? err.message : String(err) });
      });
    return () => ctrl.abort();
  }, [datasetId, reloadToken]);

  const current = state.key === `${datasetId}#${reloadToken}` ? state : null;
  return {
    engines: current?.engines ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload: useCallback(() => setReloadToken((n) => n + 1), []),
  };
}

/** Full real-data history (sensors + RUL + model predictions) of one engine. */
export function useEngineData(datasetId: DatasetId, engineId: number | null) {
  const [state, setState] = useState<{
    key: string;
    dataset: EngineDataset | null;
    models: ModelInfo | null;
    error: string | null;
  }>({ key: '', dataset: null, models: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  const requestKey = engineId === null ? '' : `${datasetId}/${engineId}#${reloadToken}`;

  useEffect(() => {
    if (engineId === null) return;
    const ctrl = new AbortController();
    const cfg = DATASET_CONFIG[datasetId];
    fetchEngineHistory(datasetId, engineId, ctrl.signal)
      .then((res) =>
        setState({
          key: requestKey,
          dataset: toEngineDataset(res, {
            operatingConditionsCount: cfg.operatingConditions,
            faultModesCount: cfg.faultModes,
            faultDescription: cfg.description,
          }),
          models: { available: res.models_available, errors: res.model_errors },
          error: null,
        }),
      )
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({
          key: requestKey,
          dataset: null,
          models: null,
          error: err instanceof ApiError ? err.message : String(err),
        });
      });
    return () => ctrl.abort();
  }, [datasetId, engineId, requestKey]);

  // Ignore a response that belongs to a previous dataset/engine selection.
  const current = state.key === requestKey && requestKey !== '' ? state : null;

  const status: LoadStatus = useMemo(() => {
    if (current === null) return 'loading';
    return current.error ? 'error' : 'ready';
  }, [current]);

  return {
    status,
    dataset: current?.dataset ?? null,
    models: current?.models ?? null,
    error: current?.error ?? null,
    reload: useCallback(() => setReloadToken((n) => n + 1), []),
  };
}
