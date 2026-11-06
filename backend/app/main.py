from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.preprocessing import DATASETS, prepare_subset
from src.model_loader import load_xgboost, load_bilstm
from src.simulation import get_cycle_snapshot

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent

app = FastAPI(
    title="RUL Platform API",
    version="0.1.0",
    description="Backend inference NASA C-MAPSS menggunakan pipeline dan model asli.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SnapshotRequest(BaseModel):
    engine_id: int = Field(ge=1)
    cycle: int = Field(ge=1)
    include_xgboost: bool = True
    include_bilstm: bool = True


@lru_cache(maxsize=1)
def get_prepared_subset(subset_id: str):
    # Keep only one prepared FD subset in memory; helpful on an 8 GB laptop.
    return prepare_subset(subset_id)


@lru_cache(maxsize=4)
def get_models(subset_id: str):
    # Models are loaded from the actual JSON and .keras artifacts.
    return {
        "xgboost": load_xgboost(subset_id),
        "bilstm": load_bilstm(subset_id),
    }


def validate_subset(subset_id: str):
    subset_id = subset_id.upper()
    if subset_id not in DATASETS:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset tidak dikenal. Pilihan: {', '.join(DATASETS)}",
        )
    return subset_id


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "rul-platform-api",
        "datasets_supported": DATASETS,
        "models_loaded_on_demand": True,
    }


@app.get("/api/datasets")
def list_datasets():
    return {"datasets": DATASETS}


@app.get("/api/{subset_id}/metadata")
def dataset_metadata(subset_id: str):
    subset_id = validate_subset(subset_id)
    try:
        prepared = get_prepared_subset(subset_id)
        train = prepared["train"]
        return {
            "dataset": subset_id,
            "engine_count": int(train["unit_number"].nunique()),
            "cycle_min": int(train["time_cycles"].min()),
            "cycle_max": int(train["time_cycles"].max()),
            "feature_count": len(prepared["features"]),
            "features": prepared["features"],
            "sequence_length": prepared["sequence_length"],
            "dropped_features": prepared["dropped_features"],
            "normalization": prepared["normalizer"]["method"],
            "data_source": "NASA C-MAPSS training split",
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=424, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gagal memproses {subset_id}: {exc}") from exc


@app.get("/api/{subset_id}/engines")
def list_engines(subset_id: str):
    subset_id = validate_subset(subset_id)
    try:
        prepared = get_prepared_subset(subset_id)
        train = prepared["train"]
        rows = (
            train.groupby("unit_number")["time_cycles"]
            .agg(first_cycle="min", last_cycle="max", observed_cycles="count")
            .reset_index()
        )
        return {
            "dataset": subset_id,
            "engines": [
                {
                    "engine_id": int(row.unit_number),
                    "first_cycle": int(row.first_cycle),
                    "last_cycle": int(row.last_cycle),
                    "observed_cycles": int(row.observed_cycles),
                }
                for row in rows.itertuples(index=False)
            ],
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=424, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gagal membaca engine {subset_id}: {exc}") from exc


@app.post("/api/{subset_id}/snapshot")
def predict_snapshot(subset_id: str, request: SnapshotRequest):
    subset_id = validate_subset(subset_id)
    try:
        prepared = get_prepared_subset(subset_id)
        train = prepared["train"]

        engine_rows = train[train["unit_number"] == request.engine_id]
        if engine_rows.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Engine {request.engine_id} tidak ditemukan pada {subset_id}.",
            )

        first_cycle = int(engine_rows["time_cycles"].min())
        last_cycle = int(engine_rows["time_cycles"].max())
        if request.cycle < first_cycle or request.cycle > last_cycle:
            raise HTTPException(
                status_code=422,
                detail=f"Cycle harus berada pada rentang {first_cycle} sampai {last_cycle}.",
            )

        models = get_models(subset_id)
        result = get_cycle_snapshot(
            data=prepared,
            engine_id=request.engine_id,
            cycle=request.cycle,
            xgb_model=models["xgboost"] if request.include_xgboost else None,
            lstm_model=models["bilstm"] if request.include_bilstm else None,
        )
        result["dataset"] = subset_id
        result["source"] = "NASA C-MAPSS training split + trained model inference"
        result["bilstm_ready"] = result["bilstm_rul"] is not None
        result["bilstm_required_cycles"] = prepared["sequence_length"]
        result["available_cycles"] = int(
            engine_rows[engine_rows["time_cycles"] <= request.cycle].shape[0]
        )
        return result
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=424, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference {subset_id} gagal: {exc}") from exc


@app.post("/api/admin/cache/clear")
def clear_cache():
    get_prepared_subset.cache_clear()
    get_models.cache_clear()
    return {"status": "cleared"}
