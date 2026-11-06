
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
