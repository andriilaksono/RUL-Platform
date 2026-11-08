"""
Bandingkan akurasi model pada data TRAIN (in-sample, seperti yang ditampilkan
UI saat ini) vs data TEST (out-of-sample, protokol paper).

Jalankan dari folder backend (venv aktif):
    python scripts/evaluate_test_split.py FD001
    python scripts/evaluate_test_split.py FD001 FD002 FD003 FD004

Protokol test mengikuti paper: hanya siklus TERAKHIR tiap mesin test yang
diprediksi, dibandingkan dengan RUL_FDxxx.txt. Karena paper tidak menyebut
apakah RUL test di-clip 125, keduanya dilaporkan.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import xgboost as xgb  # noqa: E402

from src.preprocessing import RUL_THRESHOLD, prepare_subset  # noqa: E402
from src import model_loader  # noqa: E402


def rmse(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    return float(np.sqrt(np.mean((y - p) ** 2)))


def nasa_score(y, p):
    d = np.asarray(p, float) - np.asarray(y, float)
    return float(np.sum(np.where(d < 0, np.exp(-d / 13) - 1, np.exp(d / 10) - 1)))


def xgb_predict(model, df, features):
    X = df[features].to_numpy(np.float32)
    return np.clip(model.predict(xgb.DMatrix(X, feature_names=features)), 0, RUL_THRESHOLD)


def last_windows(df, features, seq_len):
    """Window terakhir tiap mesin; mesin dengan < seq_len siklus dilewati."""
    X, units, skipped = [], [], 0
    for unit, g in df.groupby("unit_number"):
        g = g.sort_values("time_cycles")
        if len(g) < seq_len:
            skipped += 1
            continue
        X.append(g[features].tail(seq_len).to_numpy(np.float32))
        units.append(unit)
    return np.stack(X), np.array(units), skipped


def evaluate(fd, lstm_train_sample=5000):
    print(f"\n{'=' * 64}\n{fd}\n{'=' * 64}")
    prep = prepare_subset(fd)
    feats, seq = prep["features"], prep["sequence_length"]
    train, test, rul_file = prep["train"], prep["test"], prep["rul_labels"]["RUL"].to_numpy()
    print(f"fitur: {len(feats)} | mesin train: {train.unit_number.nunique()} | "
          f"mesin test: {test.unit_number.nunique()}")

    # ---------- label test: RUL di siklus terakhir dari RUL_FDxxx.txt ----------
    test_units = np.sort(test.unit_number.unique())
    assert len(test_units) == len(rul_file), "jumlah mesin test != baris RUL file"
    last_rows = test.sort_values("time_cycles").groupby("unit_number").tail(1).sort_values("unit_number")
    y_true_raw = rul_file.astype(float)
    y_true_clip = np.minimum(y_true_raw, RUL_THRESHOLD)

    rows = []

    # ---------- XGBoost ----------
    xgb_model = model_loader.load_xgboost(fd)
    p_train = xgb_predict(xgb_model, train, feats)
    rows.append(("XGBoost", "TRAIN semua siklus (in-sample, = tampilan UI)",
                 rmse(train["RUL"], p_train), None))
    p_test = xgb_predict(xgb_model, last_rows, feats)
    rows.append(("XGBoost", "TEST siklus terakhir, RUL di-clip 125",
                 rmse(y_true_clip, p_test), nasa_score(y_true_clip, p_test)))
    rows.append(("XGBoost", "TEST siklus terakhir, RUL tanpa clip",
                 rmse(y_true_raw, p_test), nasa_score(y_true_raw, p_test)))

    # ---------- Bi-LSTM ----------
    try:
        lstm = model_loader.load_bilstm(fd)
    except Exception as exc:  # file model tidak ada / gagal load
        lstm = None
        print(f"[Bi-LSTM dilewati] {exc}")
    if lstm is not None:
        rng = np.random.default_rng(0)
        pool = []
        for _, g in train.groupby("unit_number"):
            g = g.sort_values("time_cycles")
            n = len(g) - seq + 1
            if n > 0:
                pool += [(g, i) for i in range(n)]
        pick = rng.choice(len(pool), size=min(lstm_train_sample, len(pool)), replace=False)
        Xw = np.stack([pool[k][0][feats].iloc[pool[k][1]:pool[k][1] + seq].to_numpy(np.float32) for k in pick])
        yw = np.array([pool[k][0]["RUL"].iloc[pool[k][1] + seq - 1] for k in pick])
        pw = np.clip(lstm.predict(Xw, verbose=0)[:, 0], 0, RUL_THRESHOLD)
        rows.append(("Bi-LSTM", f"TRAIN {len(pick)} window acak (in-sample)", rmse(yw, pw), None))

        Xt, ut, skipped = last_windows(test, feats, seq)
        keep = np.isin(test_units, ut)
        pt = np.clip(lstm.predict(Xt, verbose=0)[:, 0], 0, RUL_THRESHOLD)
        note = f" ({skipped} mesin < {seq} siklus dilewati)" if skipped else ""
        rows.append(("Bi-LSTM", "TEST siklus terakhir, RUL di-clip 125" + note,
                     rmse(y_true_clip[keep], pt), nasa_score(y_true_clip[keep], pt)))
        rows.append(("Bi-LSTM", "TEST siklus terakhir, RUL tanpa clip" + note,
                     rmse(y_true_raw[keep], pt), nasa_score(y_true_raw[keep], pt)))

    print(f"\n{'Model':<9} {'Data':<62} {'RMSE':>7} {'NASA':>10}")
    for m, d, r, s in rows:
        print(f"{m:<9} {d:<62} {r:7.2f} {'' if s is None else f'{s:10.1f}'}")


if __name__ == "__main__":
    for fd in (a.upper() for a in (sys.argv[1:] or ["FD001"])):
        evaluate(fd)
