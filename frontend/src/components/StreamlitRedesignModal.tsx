import React, { useState } from 'react';
import { Copy, Check, Download, Code2, Sparkles } from 'lucide-react';

interface StreamlitRedesignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MODERN_STREAMLIT_CODE = `"""
NASA C-MAPSS Turbofan Predictive Maintenance & RUL Simulation
Redesigned with Modern Enterprise UI, Plotly Telemetry, and Streamlit Tabs.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px

# Import your existing pipeline modules
from src.preprocessing import prepare_subset, get_engine_history
from src.model_loader import load_xgboost, load_bilstm
from src.simulation import get_cycle_snapshot


# =========================================================
# 1. MODERN PAGE CONFIGURATION
# =========================================================

st.set_page_config(
    page_title="Turbofan RUL Engine Console",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded",
)


# =========================================================
# 2. MODERN TAILWIND-INSPIRED CUSTOM CSS
# =========================================================

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
    }

    code, .font-mono {
        font-family: 'JetBrains Mono', monospace !important;
    }

    .main .block-container {
        padding-top: 1.5rem;
        padding-bottom: 3rem;
        max-width: 1440px;
    }

    /* Modern Card Container */
    .metric-card {
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(51, 65, 85, 0.7);
        border-radius: 12px;
        padding: 18px 20px;
        backdrop-filter: blur(8px);
        margin-bottom: 12px;
        transition: all 0.2s ease;
    }
    .metric-card:hover {
        border-color: rgba(56, 189, 248, 0.5);
    }

    .metric-label {
        font-size: 0.75rem;
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #94a3b8;
    }

    .metric-value {
        font-size: 1.85rem;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
        color: #f8fafc;
        line-height: 1.2;
    }

    .metric-unit {
        font-size: 0.75rem;
        color: #64748b;
        margin-left: 4px;
    }

    /* Modern Status Badges */
    .status-badge-running {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #34d399;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .status-badge-off {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: rgba(244, 63, 94, 0.12);
        border: 1px solid rgba(244, 63, 94, 0.4);
        color: #fb7185;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
        font-weight: 600;
    }

    /* Streamlit tabs refinement */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        border-bottom: 1px solid rgba(51, 65, 85, 0.8);
    }
    .stTabs [data-baseweb="tab"] {
        padding: 8px 18px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        border-radius: 8px 8px 0 0;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# =========================================================
# 3. DATASET & MODEL SPECIFICATIONS
# =========================================================

DATASET_INFO = {
    "FD001": {"operating_conditions": 1, "fault_modes": 1, "desc": "Sea Level | HPC Degradation"},
    "FD002": {"operating_conditions": 6, "fault_modes": 1, "desc": "6 Operating Regimes | HPC Degradation"},
    "FD003": {"operating_conditions": 1, "fault_modes": 2, "desc": "Sea Level | HPC & Fan Degradation"},
    "FD004": {"operating_conditions": 6, "fault_modes": 2, "desc": "6 Operating Regimes | HPC & Fan Degradation"},
}

MODEL_AVAILABILITY = {
    "FD001": {"xgboost": True, "bilstm": True},
    "FD002": {"xgboost": True, "bilstm": True},
    "FD003": {"xgboost": True, "bilstm": True},
    "FD004": {"xgboost": True, "bilstm": True},
}

ALL_SENSORS = [
    "T24", "T30", "T50", "P30", "Nf", "Nc",
    "Ps30", "phi", "Bpr", "htBleed", "W31", "W32"
]


# =========================================================
# 4. SIDEBAR CONFIGURATION (MODERN CLEAN DESIGN)
# =========================================================

with st.sidebar:
    st.markdown("### ✈️ Turbofan Simulation")
    st.caption("NASA C-MAPSS Predictive Maintenance Console")
    st.divider()

    st.markdown("**Dataset Configuration**")
    selected_dataset = st.selectbox(
        "Select Dataset",
        options=["FD001", "FD002", "FD003", "FD004"],
        index=0,
        key="dataset_selector",
    )
    dataset_info = DATASET_INFO[selected_dataset]

    st.markdown(
        f"""
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #94a3b8; margin: 8px 0 16px 0;">
            <div>· Regimes: <span style="color:#f8fafc; font-weight:600;">{dataset_info['operating_conditions']}</span></div>
            <div>· Fault Modes: <span style="color:#f8fafc; font-weight:600;">{dataset_info['fault_modes']}</span></div>
            <div>· Regime: <span style="color:#38bdf8;">{dataset_info['desc']}</span></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.divider()

    st.markdown("**Playback Control**")
    playback_speed = st.slider(
        "Simulation Speed (cycles/tick)",
        min_value=1,
        max_value=20,
        value=2,
        step=1,
        key="playback_speed_selector",
    )

    st.caption("Auto-refreshes telemetry every cycle snapshot.")


# =========================================================
# 5. CACHED RESOURCE LOADERS
# =========================================================

@st.cache_resource
def load_dataset(subset_id):
    return prepare_subset(subset_id)

@st.cache_resource
def load_model(subset_id, model_type):
    if model_type == "xgboost":
        return load_xgboost(subset_id)
    elif model_type == "bilstm":
        return load_bilstm(subset_id)
    return None

try:
    with st.spinner(f"Loading NASA C-MAPSS {selected_dataset}..."):
        data = load_dataset(selected_dataset)
except Exception as error:
    st.error(f"Dataset loading failed: {error}")
    st.stop()


# Engine setup
train_data = data["train"]
engine_ids = sorted(train_data["unit_number"].unique().tolist())
engine_state_key = f"selected_engine_{selected_dataset}"

if engine_state_key not in st.session_state:
    st.session_state[engine_state_key] = engine_ids[0]

selected_engine = st.session_state[engine_state_key]
engine_data = train_data[train_data["unit_number"] == selected_engine].copy()

min_cycle = int(engine_data["time_cycles"].min())
max_cycle = int(engine_data["time_cycles"].max())

# Models
xgb_model = None
lstm_model = None
if MODEL_AVAILABILITY[selected_dataset]["xgboost"]:
    try:
        xgb_model = load_model(selected_dataset, "xgboost")
    except Exception:
        pass

if MODEL_AVAILABILITY[selected_dataset]["bilstm"]:
    try:
        lstm_model = load_model(selected_dataset, "bilstm")
    except Exception:
        pass

# Session State
if "active_dataset" not in st.session_state or st.session_state.active_dataset != selected_dataset:
    st.session_state.active_dataset = selected_dataset
    st.session_state.current_cycle = min_cycle
    st.session_state.is_playing = False

st.session_state.current_cycle = max(min_cycle, min(st.session_state.current_cycle, max_cycle))


# =========================================================
# 6. HEADER COMMAND BANNER
# =========================================================

header_col1, header_col2 = st.columns([3, 1])

with header_col1:
    st.title("Turbofan Engine RUL Simulation")
    st.caption("NASA C-MAPSS Predictive Maintenance · Historical Playback · Deep Learning Inference")

with header_col2:
    if st.session_state.is_playing:
        st.markdown('<div style="text-align:right; padding-top:10px;"><span class="status-badge-running">● ENGINE RUNNING</span></div>', unsafe_allow_html=True)
    else:
        st.markdown('<div style="text-align:right; padding-top:10px;"><span class="status-badge-off">■ ENGINE STANDBY</span></div>', unsafe_allow_html=True)

st.divider()


# =========================================================
# 7. MAIN INTERACTIVE SIMULATION FRAGMENT
# =========================================================

@st.fragment(run_every=1)
def modern_simulation_panel():
    current_cycle = st.session_state.current_cycle

    # Playback advancement
    if st.session_state.is_playing:
        if current_cycle >= max_cycle:
            st.session_state.is_playing = False
        else:
            st.session_state.current_cycle = min(current_cycle + playback_speed, max_cycle)

    current_cycle = st.session_state.current_cycle

    # Telemetry snapshot
    snapshot = get_cycle_snapshot(
        data=data,
        engine_id=selected_engine,
        cycle=current_cycle,
        xgb_model=xgb_model,
        lstm_model=lstm_model,
    )

    history = engine_data[engine_data["time_cycles"] <= current_cycle]

    # Quick Action Toolbar
    ctrl1, ctrl2, ctrl3, ctrl4 = st.columns([2, 1, 1, 2])
    with ctrl1:
        is_playing = st.session_state.is_playing
        btn_label = "⏹ STOP ENGINE" if is_playing else "▶ START ENGINE"
        if st.button(btn_label, use_container_width=True, type="primary" if not is_playing else "secondary", disabled=not is_playing and current_cycle >= max_cycle):
            st.session_state.is_playing = not is_playing
            st.rerun(scope="fragment")

    with ctrl2:
        if st.button("↺ RESTART", use_container_width=True):
            st.session_state.is_playing = False
            st.session_state.current_cycle = min_cycle
            st.rerun(scope="fragment")

    with ctrl3:
        if st.button("⏭ +5 CYCLES", use_container_width=True, disabled=current_cycle >= max_cycle):
            st.session_state.current_cycle = min(max_cycle, current_cycle + 5)
            st.rerun(scope="fragment")

    with ctrl4:
        progress_val = (current_cycle - min_cycle) / max(1, max_cycle - min_cycle)
        st.progress(progress_val, text=f"Life Cycle Progress: {current_cycle} / {max_cycle} cycles ({(progress_val*100):.1f}%)")

    # High-Level Metric Strip
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(f'''
        <div class="metric-card">
            <div class="metric-label">Dataset / Engine</div>
            <div class="metric-value">{selected_dataset} <span class="metric-unit"># {selected_engine}</span></div>
        </div>''', unsafe_allow_html=True)

    with m2:
        xgb_val = f"{snapshot['xgboost_rul']:.1f}" if snapshot['xgboost_rul'] is not None else "N/A"
        st.markdown(f'''
        <div class="metric-card">
            <div class="metric-label">XGBoost Prediction</div>
            <div class="metric-value" style="color: #38bdf8;">{xgb_val} <span class="metric-unit">cycles</span></div>
        </div>''', unsafe_allow_html=True)

    with m3:
        lstm_val = f"{snapshot['bilstm_rul']:.1f}" if snapshot['bilstm_rul'] is not None else ("Buffering" if current_cycle < 30 else "N/A")
        st.markdown(f'''
        <div class="metric-card">
            <div class="metric-label">Bi-LSTM Prediction</div>
            <div class="metric-value" style="color: #c084fc;">{lstm_val} <span class="metric-unit">cycles</span></div>
        </div>''', unsafe_allow_html=True)

    with m4:
        actual_val = f"{snapshot['actual_rul']:.1f}"
        st.markdown(f'''
        <div class="metric-card">
            <div class="metric-label">Ground Truth RUL</div>
            <div class="metric-value" style="color: #34d399;">{actual_val} <span class="metric-unit">cycles</span></div>
        </div>''', unsafe_allow_html=True)

    # Tabs for Organized Navigation
    tab_telemetry, tab_rul, tab_diagnostics, tab_table = st.tabs([
        "📈 Sensor Telemetry",
        "🎯 RUL Model Benchmarking",
        "🔍 Diagnostic Invariants",
        "📋 Raw Cycle Telemetry",
    ])

    # TAB 1: ALL SENSOR TELEMETRY (Plotly Modern Dark Charts)
    with tab_telemetry:
        st.markdown("#### All Engine Sensor Telemetry Channels")
        active_sensors = [s for s in ALL_SENSORS if s in data["features"]]

        for i in range(0, len(active_sensors), 2):
            g_col1, g_col2 = st.columns(2)
            pair = active_sensors[i:i+2]
            for col, sensor in zip([g_col1, g_col2], pair):
                with col:
                    fig = px.line(
                        history,
                        x="time_cycles",
                        y=sensor,
                        title=f"{sensor} Telemetry Trend",
                        template="plotly_dark",
                    )
                    fig.update_layout(
                        margin=dict(l=20, r=20, t=35, b=20),
                        height=220,
                        paper_bgcolor="rgba(15,23,42,0.4)",
                        plot_bgcolor="rgba(15,23,42,0.4)",
                        font=dict(family="JetBrains Mono", size=10),
                    )
                    st.plotly_chart(fig, use_container_width=True)

    # TAB 2: RUL BENCHMARKING
    with tab_rul:
        st.markdown("#### RUL Trajectory: Predictions vs Actual Degradation")
        comp_df = pd.DataFrame({
            "Metric": ["Actual Ground Truth", "XGBoost", "Bi-LSTM"],
            "RUL Cycles": [
                snapshot["actual_rul"],
                snapshot["xgboost_rul"] if snapshot["xgboost_rul"] is not None else 0,
                snapshot["bilstm_rul"] if snapshot["bilstm_rul"] is not None else 0,
            ],
        })
        bar_fig = px.bar(
            comp_df,
            x="Metric",
            y="RUL Cycles",
            color="Metric",
            color_discrete_sequence=["#10b981", "#06b6d4", "#a855f7"],
            template="plotly_dark",
        )
        bar_fig.update_layout(
            height=300,
            paper_bgcolor="rgba(15,23,42,0.4)",
            plot_bgcolor="rgba(15,23,42,0.4)",
            font=dict(family="JetBrains Mono"),
        )
        st.plotly_chart(bar_fig, use_container_width=True)

    # TAB 3: DIAGNOSTICS
    with tab_diagnostics:
        diagnostic_history = get_engine_history(data, engine_id=selected_engine, cycle=current_cycle)
        last_c = int(diagnostic_history["time_cycles"].iloc[-1]) if not diagnostic_history.empty else current_cycle
        actual_r = float(diagnostic_history["RUL"].iloc[-1]) if not diagnostic_history.empty else snapshot["actual_rul"]
        expected_r = min(125, max_cycle - last_c)
        diff = abs(actual_r - expected_r)

        d1, d2, d3, d4 = st.columns(4)
        d1.metric("Selected Engine", f"Unit #{selected_engine}")
        d2.metric("Max Life Cycle", f"{maxCycle} cycles")
        d3.metric("Last Cycle in Log", f"{last_c} cycles")
        d4.metric("RUL Discrepancy", f"{diff:.4f}", delta="PASSED" if diff == 0 else "MISMATCH")

        if diff == 0:
            st.success("✓ RUL Diagnostic: Invariant Validation PASSED (Piecewise Linear Ground Truth Matches Expected).")
        else:
            st.error(f"⚠ RUL Diagnostic: Mismatch detected. Difference = {diff:.4f} cycles.")

    # TAB 4: RAW DATA TABLE
    with tab_table:
        st.markdown("#### Current Cycle Sensor Normalization Table")
        current_row = history.iloc[-1]
        sensor_df = pd.DataFrame({
            "Sensor ID": active_sensors,
            "Normalized Value": [current_row[s] for s in active_sensors],
        })
        st.dataframe(sensor_df, use_container_width=True, hide_index=True)


# Run simulation
modern_simulation_panel()
`;

export const StreamlitRedesignModal: React.FC<StreamlitRedesignModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(MODERN_STREAMLIT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([MODERN_STREAMLIT_CODE], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'modern_turbofan_simulation.py';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>Modern Streamlit Code (.py)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Production Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Redesigned with custom dark theme, Plotly interactive telemetry, modern tabs, and responsive metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Python'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-semibold text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Feature summary pills */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="w-3 h-3" /> Modern Glass Cards
          </span>
          <span>·</span>
          <span>Plotly Express Dark Telemetry</span>
          <span>·</span>
          <span>st.tabs Navigation</span>
          <span>·</span>
          <span>Engine Status Badges</span>
          <span>·</span>
          <span>JetBrains Mono Typography</span>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed">
          <pre className="whitespace-pre overflow-x-auto selection:bg-cyan-500/30">
            {MODERN_STREAMLIT_CODE}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Drop into your Streamlit repository to replace the legacy UI.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
