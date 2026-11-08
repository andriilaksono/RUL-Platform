"""Backend wiring test with synthetic C-MAPSS-shaped data (run: python tests/test_backend_synthetic.py).
Works on a temporary copy of backend/, so it never touches your real data/ or models/.
Needs: fastapi httpx pandas numpy scikit-learn xgboost (TensorFlow is stubbed).
Real XGBoost model; Bi-LSTM replaced by a deterministic fake (TensorFlow not installed here)."""
import sys, types, json
import numpy as np, pandas as pd
from pathlib import Path

# --- stub tensorflow so src.model_loader imports -------------------------
tf = types.ModuleType("tensorflow")
class _Layer: pass
tf.keras = types.SimpleNamespace(layers=types.SimpleNamespace(Layer=_Layer),
                                 models=types.SimpleNamespace(load_model=None))
sys.modules["tensorflow"] = tf

import tempfile, shutil
SRC = Path(__file__).resolve().parent.parent / "backend"
BACKEND = Path(tempfile.mkdtemp()) / "backend"
shutil.copytree(SRC, BACKEND, ignore=shutil.ignore_patterns(".venv", "venv", "__pycache__", "data", "models"))
sys.path.insert(0, str(BACKEND))
DATA = BACKEND / "data"; MODELS = BACKEND / "models"
DATA.mkdir(exist_ok=True); MODELS.mkdir(exist_ok=True)

# --- synthetic files for FD001 (1 regime) and FD002 (6 regimes) ----------
rng = np.random.default_rng(0)
def make(fd, n_units, multi):
    rows = []
    for u in range(1, n_units + 1):
        n = int(rng.integers(150, 230))
        for c in range(1, n + 1):
            if multi:
                s1 = rng.choice([0, 10, 20, 25, 35, 42]); s2 = rng.choice([0, .25, .62, .7, .84, .84]); s3 = rng.choice([100, 100, 60, 20, 100, 100])
            else:
                s1 = rng.normal(0, .002); s2 = rng.normal(0, .0003); s3 = 100
            wear = (c / n) ** 2
            sens = []
            for k in range(21):
                if k in (0, 4, 9, 15, 17, 18):  # constant sensors, like real FD001
                    sens.append(100.0 + k)
                else:
                    sens.append(500 + 10 * k + rng.normal(0, 1) + wear * (k - 8) * 3)
            rows.append([u, c, s1, s2, s3, *sens])
    df = pd.DataFrame(rows)
    df.to_csv(DATA / f"train_{fd}.txt", sep=" ", header=False, index=False)
    df.to_csv(DATA / f"test_{fd}.txt", sep=" ", header=False, index=False)
    pd.DataFrame([50] * n_units).to_csv(DATA / f"RUL_{fd}.txt", header=False, index=False)
make("FD001", 6, False); make("FD002", 8, True)

from src.preprocessing import prepare_subset
import xgboost as xgb
for fd in ["FD001", "FD002"]:
    prep = prepare_subset(fd)
    X = prep["train"][prep["features"]].to_numpy(np.float32); y = prep["train"]["RUL"].to_numpy()
    bst = xgb.train({"max_depth": 3, "eta": .3}, xgb.DMatrix(X, y, feature_names=prep["features"]), 30)
    bst.save_model(str(MODELS / f"xgb_{fd}.json"))

# --- fake Bi-LSTM: deterministic function of the (1,30,F) window ---------
class FakeLSTM:
    def predict(self, X, verbose=0):
        X = np.asarray(X)
        return (X.mean(axis=(1, 2)) * 100 + 7).reshape(-1, 1)

import app.main as m
m.get_bilstm_model = lambda subset_id: FakeLSTM()   # bilstm "file" available
from fastapi.testclient import TestClient
client = TestClient(m.app)

fails = 0
def check(name, cond, extra=""):
    global fails
    print(("PASS " if cond else "FAIL ") + name, extra)
    fails += (not cond)

# 1. health + CORS preflight for the Vite port used by `npm run dev`
check("health", client.get("/api/health").json()["status"] == "ok")
for origin in ["http://localhost:3000", "http://localhost:5173"]:
    r = client.options("/api/FD001/engines", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
    check(f"CORS preflight {origin}", r.headers.get("access-control-allow-origin") == origin)
r = client.options("/api/FD001/engines", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"})
check("CORS rejects unknown origin", "access-control-allow-origin" not in r.headers)

# 2. history endpoint shape
for fd, eng in [("FD001", 2), ("FD002", 3)]:
    h = client.get(f"/api/{fd}/engines/{eng}/history")
    check(f"{fd} history 200", h.status_code == 200, h.text[:200] if h.status_code != 200 else "")
    body = h.json()
    cyc = body["cycles"]
    check(f"{fd} cycles contiguous 1..max", [c["cycle"] for c in cyc] == list(range(1, body["max_cycle"] + 1)))
    check(f"{fd} 12 UI sensors (raw) present", len(cyc[0]["sensors"]) == 12 and "Bpr" in cyc[0]["sensors"])
    check(f"{fd} bilstm null before cycle 30, set from 30", cyc[28]["bilstm_rul"] is None and cyc[29]["bilstm_rul"] is not None)
    check(f"{fd} xgboost present on every cycle", all(c["xgboost_rul"] is not None for c in cyc))
    check(f"{fd} actual_rul clipped <=125 and ends at 0", max(c["actual_rul"] for c in cyc) <= 125 and cyc[-1]["actual_rul"] == 0)
    json.dumps(body, allow_nan=False)  # must be strict JSON (no NaN)

    # 3. equivalence: history values == per-cycle /snapshot values
    worst = 0.0
    for c in [1, 15, 29, 30, 31, len(cyc) // 2, len(cyc)]:
        s = client.post(f"/api/{fd}/snapshot", json={"engine_id": eng, "cycle": c}).json()
        row = cyc[c - 1]
        pairs = [(s["actual_rul"], row["actual_rul"]), (s["xgboost_rul"], row["xgboost_rul"])]
        if c >= 30: pairs.append((s["bilstm_rul"], row["bilstm_rul"]))
        else: check(f"{fd} c={c} snapshot bilstm None matches", s["bilstm_rul"] is None and row["bilstm_rul"] is None)
        for a, b in pairs: worst = max(worst, abs(a - b))
    check(f"{fd} history == snapshot (max abs diff {worst:.2e})", worst < 1e-4)

# 4. raw vs normalized really differ & raw is real file data
raw = pd.read_csv(DATA / "train_FD001.txt", sep=r"\s+", header=None)
h = client.get("/api/FD001/engines/1/history").json()["cycles"]
check("raw T24 equals file value (sensor col idx 6)", abs(h[0]["sensors"]["T24"] - raw.iloc[0, 6]) < 1e-9)
check("normalized within [0,1]", all(0 <= v <= 1 for c in h for v in c["normalized_sensors"].values()))

# 5. errors
check("unknown engine 404", client.get("/api/FD001/engines/999/history").status_code == 404)
check("unknown dataset 404", client.get("/api/FD999/engines/1/history").status_code == 404)

# 6. graceful degradation when a model file is missing
m.get_bilstm_model = lambda subset_id: (_ for _ in ()).throw(FileNotFoundError("Model Bi-LSTM tidak ditemukan: x"))
d = client.get("/api/FD001/engines/1/history").json()
check("missing bilstm -> still 200, xgb ok, bilstm null + error reported",
      d["models_available"] == {"xgboost": True, "bilstm": False} and "bilstm" in d["model_errors"]
      and all(c["bilstm_rul"] is None for c in d["cycles"]) and d["cycles"][5]["xgboost_rul"] is not None)

print("\nFAILED:", fails)
sys.exit(1 if fails else 0)
