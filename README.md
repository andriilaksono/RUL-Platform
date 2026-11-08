# RUL-Platform

New standalone project based on the user's Streamlit RUL pipeline and AI Studio React UI.

## Important status

- `backend/src/` contains the original preprocessing, model-loader, and simulation modules copied from the Streamlit project.
- The FastAPI backend supports FD001, FD002, FD003, and FD004.
- Backend inference loads the actual XGBoost JSON and Bi-LSTM `.keras` artifacts on demand.
- The React frontend is now **connected to the API**. Engine lists, sensor telemetry, ground-truth RUL and XGBoost / Bi-LSTM predictions all come from the backend (`frontend/src/api/client.ts`). The old synthetic data generator was removed.
- Still to do: compare identical dataset/engine/cycle predictions against the original Streamlit app before treating the UI values as validated.

## 1. Required assets

Copy the following files from `D:\Andri\RUL-XGboost-LSTM` into this project's `backend` folder:

`backend/data/`:
- `train_FD001.txt` ... `train_FD004.txt`
- `test_FD001.txt` ... `test_FD004.txt`
- `RUL_FD001.txt` ... `RUL_FD004.txt`

`backend/models/`:
- `xgb_FD001.json` ... `xgb_FD004.json`
- `bilstm_FD001_retrained.keras` ... `bilstm_FD004_retrained.keras`

Do not copy `.pkl`, `.weights.h5`, or `*_recovered.keras` for the initial runtime.

## 2. Backend setup (Windows PowerShell)

```powershell
cd D:\Andri\RUL-Platform\backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start API:

```powershell
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## 3. API endpoints

- `GET /api/health`
- `GET /api/datasets`
- `GET /api/{FD001|FD002|FD003|FD004}/metadata`
- `GET /api/{FD001|FD002|FD003|FD004}/engines`
- `GET /api/{FD001|FD002|FD003|FD004}/engines/{engine_id}/history` — all cycles of one engine (real sensors, normalized sensors, operating settings, ground-truth RUL, XGBoost + Bi-LSTM predictions). This is what the frontend uses.
- `POST /api/{FD001|FD002|FD003|FD004}/snapshot` — single cycle prediction

Example request:

```json
{
  "engine_id": 1,
  "cycle": 30,
  "include_xgboost": true,
  "include_bilstm": true
}
```

## 3b. Run the frontend

Start the backend first (section 2), then in a second terminal:

```powershell
cd D:\Andri\RUL-Platform\frontend
npm install
npm run dev
```

Open http://localhost:3000. In development Vite forwards `/api/*` to `http://127.0.0.1:8000`, so no extra configuration is needed. To point at a backend running elsewhere, copy `frontend/.env.example` to `.env` and set `VITE_DEV_API_TARGET` (dev proxy) or `VITE_API_BASE_URL` (deployed backend; then add the frontend's origin to `RUL_CORS_ORIGINS` in the backend environment, comma-separated).

If the backend is not running, or a model/data file is missing, the UI shows a message instead of fake numbers.

## 4. Methodology note

This first backend preserves the current Streamlit behavior: historical playback and `actual_rul` are derived from the training split. The `test_FDxxx.txt` and `RUL_FDxxx.txt` files are copied for future evaluation endpoints, but this API does not currently claim to be test-set evaluation or live engine monitoring.

For FD002 and FD004, the original condition-aware KMeans + per-cluster MinMaxScaler logic is retained. For FD001 and FD003, the original global MinMaxScaler logic is retained. Bi-LSTM inference returns no prediction until at least 30 cycles are available.

## 5. Next step

Compare identical dataset/engine/cycle predictions against the original Streamlit application before enabling real prediction labels in the UI.

`tests/test_backend_synthetic.py` checks the API wiring (CORS, `/history` vs `/snapshot` consistency, error handling) on synthetic data in a temporary copy of `backend/`; it does not validate model accuracy.
