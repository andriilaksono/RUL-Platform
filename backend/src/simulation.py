
import numpy as np
import xgboost as xgb

from src.preprocessing import (
    get_engine_history,
    get_xgb_input,
    get_lstm_input,
)


def get_cycle_snapshot(
    data,
    engine_id,
    cycle,
    xgb_model=None,
    lstm_model=None,
):
    # ==========================================
    # 1. Get Engine History
    # ==========================================
    history = get_engine_history(
        data,
        engine_id=engine_id,
        cycle=cycle,
    )

    if history.empty:
        raise ValueError(
            f"Data engine {engine_id} pada cycle {cycle} tidak ditemukan."
        )

    features = data["features"]

    # ==========================================
    # 2. Initialize Result
    # ==========================================
    result = {
        "engine_id": engine_id,
        "cycle": cycle,

        "actual_rul": float(history["RUL"].iloc[-1]),

        "xgboost_rul_raw": None,
        "xgboost_rul": None,

        "bilstm_rul_raw": None,
        "bilstm_rul": None,

        "xgboost_input_shape": None,
        "bilstm_input_shape": None,
    }

    # ==========================================
    # 3. XGBoost Prediction
    # ==========================================
    if xgb_model is not None:

        X_xgb = get_xgb_input(
            history,
            features,
        )

        # Convert input to XGBoost DMatrix
        dmatrix = xgb.DMatrix(
            X_xgb,
            feature_names=features,
        )

        # Raw prediction
        predicted_rul_raw = float(
            xgb_model.predict(dmatrix)[0]
        )

        # Clip prediction to 0-125
        predicted_rul_clipped = float(
            np.clip(predicted_rul_raw, 0, 125)
        )

        result["xgboost_rul_raw"] = predicted_rul_raw
        result["xgboost_rul"] = predicted_rul_clipped

        result["xgboost_input_shape"] = X_xgb.shape

    # ==========================================
    # 4. Bi-LSTM Prediction
    # ==========================================
    if lstm_model is not None:

        X_lstm = get_lstm_input(
            history,
            features,
        )

        if X_lstm is not None:

            prediction = lstm_model.predict(
                X_lstm,
                verbose=0,
            )

            predicted_rul_raw = float(
                prediction[0][0]
            )

            predicted_rul_clipped = float(
                np.clip(predicted_rul_raw, 0, 125)
            )

            result["bilstm_rul_raw"] = predicted_rul_raw
            result["bilstm_rul"] = predicted_rul_clipped

            result["bilstm_input_shape"] = X_lstm.shape

    # ==========================================
    # 5. Return Simulation Result
    # ==========================================
    return result


# ==========================================
# Full-engine trajectory (batch version of get_cycle_snapshot)
# ==========================================

# Sensors shown by the frontend. Key = name used by the UI, value = column
# name in the C-MAPSS dataframe (the UI uses "Bpr", the dataset uses "BPR").
UI_SENSOR_COLUMNS = {
    "T24": "T24",
    "T30": "T30",
    "T50": "T50",
    "P30": "P30",
    "Nf": "Nf",
    "Nc": "Nc",
    "Ps30": "Ps30",
    "phi": "phi",
    "Bpr": "BPR",
    "htBleed": "htBleed",
    "W31": "W31",
    "W32": "W32",
}


def get_engine_trajectory(
    data,
    engine_id,
    xgb_model=None,
    lstm_model=None,
):
    """
    Return every cycle of one engine in a single pass.

    Produces the same numbers as calling get_cycle_snapshot() once per
    cycle, but runs XGBoost once on all rows and Bi-LSTM once on all
    sliding windows, so the UI does not need one request per cycle.
    """

    train = data["train"]
    train_raw = data["train_raw"]
    features = data["features"]
    seq_len = data["sequence_length"]

    engine = (
        train[train["unit_number"] == engine_id]
        .sort_values("time_cycles")
        .reset_index(drop=True)
    )

    if engine.empty:
        raise ValueError(f"Engine {engine_id} tidak ditemukan.")

    raw = (
        train_raw[train_raw["unit_number"] == engine_id]
        .sort_values("time_cycles")
        .reset_index(drop=True)
    )

    n = len(engine)
    cycles = engine["time_cycles"].to_numpy()

    # ---- XGBoost: one row per cycle -----------------------------
    xgb_raw = xgb_clipped = None
    if xgb_model is not None:
        X = engine[features].to_numpy(dtype=np.float32)
        xgb_raw = xgb_model.predict(
            xgb.DMatrix(X, feature_names=features)
        ).astype(float)
        xgb_clipped = np.clip(xgb_raw, 0, 125)

    # ---- Bi-LSTM: one 30-cycle window per cycle >= 30 -----------
    lstm_raw = lstm_clipped = None
    if lstm_model is not None:
        lstm_raw = np.full(n, np.nan)
        if n >= seq_len:
            values = engine[features].to_numpy(dtype=np.float32)
            windows = np.lib.stride_tricks.sliding_window_view(
                values, (seq_len, values.shape[1])
            )[:, 0]  # (n - seq_len + 1, seq_len, n_features)
            pred = lstm_model.predict(
                np.ascontiguousarray(windows), verbose=0
            )
            lstm_raw[seq_len - 1:] = np.asarray(pred, dtype=float)[:, 0]
        lstm_clipped = np.clip(lstm_raw, 0, 125)

    def _num(x):
        # NaN is not valid JSON -> None
        return None if x is None or np.isnan(x) else float(x)

    rows = []
    for i in range(n):
        sensors = {}
        normalized = {}
        for ui_name, col in UI_SENSOR_COLUMNS.items():
            if col in raw.columns:
                sensors[ui_name] = float(raw[col].iloc[i])
            if col in engine.columns:  # constant columns are dropped
                normalized[ui_name] = float(engine[col].iloc[i])

        rows.append(
            {
                "cycle": int(cycles[i]),
                "actual_rul": float(engine["RUL"].iloc[i]),
                "xgboost_rul": (
                    None if xgb_clipped is None else _num(xgb_clipped[i])
                ),
                "xgboost_rul_raw": (
                    None if xgb_raw is None else _num(xgb_raw[i])
                ),
                "bilstm_rul": (
                    None if lstm_clipped is None else _num(lstm_clipped[i])
                ),
                "bilstm_rul_raw": (
                    None if lstm_raw is None else _num(lstm_raw[i])
                ),
                "sensors": sensors,
                "normalized_sensors": normalized,
                "operating_conditions": {
                    "altitude": float(raw["setting_1"].iloc[i]),
                    "mach": float(raw["setting_2"].iloc[i]),
                    "tra": float(raw["setting_3"].iloc[i]),
                },
            }
        )

    return rows
