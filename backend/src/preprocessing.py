
"""
NASA C-MAPSS preprocessing pipeline.

Reconstructed from the original research notebook:
01_data_preprocessing.ipynb

Supports FD001, FD002, FD003, FD004.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler


# =========================================================
# CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

DATASETS = ["FD001", "FD002", "FD003", "FD004"]

RUL_THRESHOLD = 125
SEQUENCE_LENGTH = 30
RANDOM_STATE = 42
N_CONDITIONS = 6

INDEX_NAMES = ["unit_number", "time_cycles"]

OPERATIONAL_SETTINGS = [
    "setting_1",
    "setting_2",
    "setting_3",
]

SENSOR_NAMES = [
    "T2", "T24", "T30", "T50",
    "P2", "P15", "P30",
    "Nf", "Nc", "epr", "Ps30", "phi",
    "NRf", "NRc", "BPR", "farB",
    "htBleed", "Nf_dmd", "PCNfR_dmd",
    "W31", "W32",
]

COLUMNS = INDEX_NAMES + OPERATIONAL_SETTINGS + SENSOR_NAMES


# =========================================================
# RAW DATA LOADING
# =========================================================

def load_subset(subset_id, data_dir=DATA_DIR):
    """Load raw NASA C-MAPSS train, test, and RUL files."""

    if subset_id not in DATASETS:
        raise ValueError(f"Unknown dataset: {subset_id}")

    data_dir = Path(data_dir)

    train_path = data_dir / f"train_{subset_id}.txt"
    test_path = data_dir / f"test_{subset_id}.txt"
    rul_path = data_dir / f"RUL_{subset_id}.txt"

    for path in [train_path, test_path, rul_path]:
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

    df_train = pd.read_csv(
        train_path,
        sep=r"\s+",
        header=None,
        names=COLUMNS,
    )

    df_test = pd.read_csv(
        test_path,
        sep=r"\s+",
        header=None,
        names=COLUMNS,
    )

    df_rul = pd.read_csv(
        rul_path,
        sep=r"\s+",
        header=None,
        names=["RUL"],
    )

    return df_train, df_test, df_rul


# =========================================================
# FEATURE PREPROCESSING
# =========================================================

def drop_constant(df_train, df_test):
    """Remove constant columns based on training data."""

    constant_cols = (
        df_train.columns[
            df_train.nunique(dropna=False) == 1
        ].tolist()
    )

    train = df_train.drop(columns=constant_cols).copy()
    test = df_test.drop(columns=constant_cols).copy()

    return train, test, constant_cols


def calculate_rul(
    df,
    unit_col="unit_number",
    cycle_col="time_cycles",
    rul_threshold=RUL_THRESHOLD,
):
    """Calculate clipped training RUL labels."""

    result = df.copy()

    max_cycle = (
        result.groupby(unit_col)[cycle_col]
        .max()
        .reset_index()
        .rename(columns={cycle_col: "max_of_unit"})
    )

    result = result.merge(
        max_cycle,
        on=unit_col,
        how="left",
    )

    result["RUL"] = (
        result["max_of_unit"] - result[cycle_col]
    ).clip(upper=rul_threshold)

    return result.drop(columns=["max_of_unit"])


# =========================================================
# NORMALIZATION
# =========================================================

def fit_normalizer(
    df_train,
    df_test,
    subset_id,
    feature_cols,
):
    """
    Fit normalization on training data only.

    FD001 / FD003:
        Global MinMaxScaler.

    FD002 / FD004:
        KMeans with 6 operating conditions,
        followed by one MinMaxScaler per cluster.
    """

    train = df_train.copy()
    test = df_test.copy()
    train[feature_cols] = train[feature_cols].astype("float64")
    test[feature_cols] = test[feature_cols].astype("float64")

    artifacts = {
        "method": None,
        "scalers": {},
        "kmeans": None,
    }

    if subset_id in ["FD002", "FD004"]:

        op_cols = [
            col
            for col in OPERATIONAL_SETTINGS
            if col in train.columns
        ]

        if not op_cols:
            raise ValueError(
                f"No operational settings found for {subset_id}"
            )

        kmeans = KMeans(
            n_clusters=N_CONDITIONS,
            n_init=10,
            random_state=RANDOM_STATE,
        )

        kmeans.fit(train[op_cols])

        train_clusters = kmeans.predict(train[op_cols])
        test_clusters = kmeans.predict(test[op_cols])

        train["_op_cluster"] = train_clusters
        test["_op_cluster"] = test_clusters

        for cluster_id in range(N_CONDITIONS):

            train_mask = train["_op_cluster"] == cluster_id
            test_mask = test["_op_cluster"] == cluster_id

            if not train_mask.any():
                continue

            scaler = MinMaxScaler()

            train.loc[train_mask, feature_cols] = (
                scaler.fit_transform(
                    train.loc[train_mask, feature_cols]
                )
            )

            if test_mask.any():
                test.loc[test_mask, feature_cols] = (
                    scaler.transform(
                        test.loc[test_mask, feature_cols]
                    )
                )

            artifacts["scalers"][cluster_id] = scaler

        train = train.drop(columns=["_op_cluster"])
        test = test.drop(columns=["_op_cluster"])

        artifacts["method"] = "condition_aware"
        artifacts["kmeans"] = kmeans

    else:

        scaler = MinMaxScaler()

        train[feature_cols] = scaler.fit_transform(
            train[feature_cols]
        )

        test[feature_cols] = scaler.transform(
            test[feature_cols]
        )

        artifacts["method"] = "global_minmax"
        artifacts["scalers"]["global"] = scaler

    return train, test, artifacts


# =========================================================
# COMPLETE DATASET PREPARATION
# =========================================================

def prepare_subset(subset_id, data_dir=DATA_DIR):
    """
    Prepare one dataset for historical playback
    and model inference.

    No files are overwritten or generated.
    """

    df_train_raw, df_test_raw, df_rul = load_subset(
        subset_id,
        data_dir,
    )

    # 1. Remove constant features
    df_train, df_test, dropped_cols = drop_constant(
        df_train_raw,
        df_test_raw,
    )

    # 2. Calculate training RUL
    df_train = calculate_rul(df_train)

    # 3. Determine model features
    feature_cols = [
        col
        for col in df_train.columns
        if col not in [
            "unit_number",
            "time_cycles",
            "RUL",
        ]
    ]

    # 4. Normalize using training data
    train_norm, test_norm, artifacts = fit_normalizer(
        df_train,
        df_test,
        subset_id,
        feature_cols,
    )

    # 5. Sort for cycle playback
    train_norm = train_norm.sort_values(
        ["unit_number", "time_cycles"]
    ).reset_index(drop=True)

    test_norm = test_norm.sort_values(
        ["unit_number", "time_cycles"]
    ).reset_index(drop=True)

    # Raw (un-normalized) training rows, sorted identically to train_norm.
    # Used only for display (real sensor values / operating settings).
    train_raw = df_train_raw.sort_values(
        ["unit_number", "time_cycles"]
    ).reset_index(drop=True)

    return {
        "dataset": subset_id,
        "train": train_norm,
        "train_raw": train_raw,
        "test": test_norm,
        "features": feature_cols,
        "dropped_features": dropped_cols,
        "normalizer": artifacts,
        "rul_labels": df_rul,
        "sequence_length": SEQUENCE_LENGTH,
    }


# =========================================================
# MODEL INPUT HELPERS
# =========================================================

def get_xgb_input(engine_history, feature_cols):
    """
    Get current cycle features for XGBoost.

    Returns shape: (1, n_features).
    """

    if len(engine_history) == 0:
        raise ValueError("Engine history is empty.")

    current = engine_history.iloc[-1]

    return current[feature_cols].to_numpy(
        dtype=np.float32
    ).reshape(1, -1)


def get_lstm_input(
    engine_history,
    feature_cols,
    sequence_length=SEQUENCE_LENGTH,
):
    """
    Get latest sequence for Bi-LSTM.

    Returns shape: (1, 30, n_features).

    Returns None until 30 cycles are available.
    """

    if len(engine_history) < sequence_length:
        return None

    sequence = engine_history[
        feature_cols
    ].tail(sequence_length).to_numpy(
        dtype=np.float32
    )

    return sequence.reshape(
        1,
        sequence_length,
        len(feature_cols),
    )


def get_engine_history(prepared_data, engine_id, cycle):
    """Get normalized engine observations up to a cycle."""

    history = prepared_data["train"]

    selected = history[
        (history["unit_number"] == engine_id)
        & (history["time_cycles"] <= cycle)
    ].copy()

    return selected.sort_values("time_cycles")
