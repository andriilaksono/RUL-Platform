# RUL-Platform

New standalone project based on the user's Streamlit RUL pipeline and AI Studio React UI.

## Important status

- `backend/src/` contains the original preprocessing, model-loader, and simulation modules copied from the Streamlit project.
- The FastAPI backend supports FD001, FD002, FD003, and FD004.
- Backend inference loads the actual XGBoost JSON and Bi-LSTM `.keras` artifacts on demand.
- The React frontend is copied from the AI Studio ZIP and is **not yet connected** to the API. Its current `src/data/cmapssData.ts` still generates synthetic/demo data. Do not treat frontend values as real model predictions until API integration is completed.

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
- `POST /api/{FD001|FD002|FD003|FD004}/snapshot`

Example request:

```json
{
  "engine_id": 1,
  "cycle": 30,
  "include_xgboost": true,
  "include_bilstm": true
}
```

## 4. Methodology note

This first backend preserves the current Streamlit behavior: historical playback and `actual_rul` are derived from the training split. The `test_FDxxx.txt` and `RUL_FDxxx.txt` files are copied for future evaluation endpoints, but this API does not currently claim to be test-set evaluation or live engine monitoring.

For FD002 and FD004, the original condition-aware KMeans + per-cluster MinMaxScaler logic is retained. For FD001 and FD003, the original global MinMaxScaler logic is retained. Bi-LSTM inference returns no prediction until at least 30 cycles are available.

## 5. Next step

Connect the React UI to these endpoints, then compare identical dataset/engine/cycle predictions against the original Streamlit application before enabling real prediction labels in the UI.
