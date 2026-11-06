
from pathlib import Path

import xgboost as xgb
import tensorflow as tf

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

SUBSETS = ["FD001", "FD002", "FD003", "FD004"]


def load_xgboost(subset_id):
    """
    Load native XGBoost Booster from JSON model.
    """
    model_path = MODEL_DIR / f"xgb_{subset_id}.json"

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model XGBoost tidak ditemukan: {model_path}"
        )

    model = xgb.Booster()
    model.load_model(str(model_path))

    return model


class AttentionLayer(tf.keras.layers.Layer):
    def build(self, input_shape):
        self.W = self.add_weight(
            name="att_W",
            shape=(input_shape[-1], 1),
            initializer="glorot_uniform",
            trainable=True,
        )

        self.b = self.add_weight(
            name="att_b",
            shape=(input_shape[1], 1),
            initializer="zeros",
            trainable=True,
        )

        super().build(input_shape)

    def call(self, x):
        e = tf.tanh(tf.matmul(x, self.W) + self.b)
        a = tf.nn.softmax(e, axis=1)
        return tf.reduce_sum(x * a, axis=1)


def load_bilstm(subset_id):
    model_path = (
        MODEL_DIR / f"bilstm_{subset_id}_retrained.keras"
    )

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model Bi-LSTM tidak ditemukan: {model_path}"
        )

    model = tf.keras.models.load_model(
        model_path,
        custom_objects={
            "AttentionLayer": AttentionLayer
        },
        compile=False,
    )

    return model


def load_all_models():
    models = {}

    for subset_id in SUBSETS:
        print(f"\nLoading {subset_id}...")

        models[subset_id] = {
            "xgboost": load_xgboost(subset_id),
            "bilstm": load_bilstm(subset_id),
        }

        print(f"{subset_id}: XGBoost OK | Bi-LSTM OK")

    return models


if __name__ == "__main__":
    models = load_all_models()

    print("\n" + "=" * 45)
    print("ALL MODELS LOADED SUCCESSFULLY")
    print("=" * 45)

    for subset_id, model_pair in models.items():
        print(f"\n{subset_id}")
        print("XGBoost:", type(model_pair["xgboost"]))
        print("Bi-LSTM:", type(model_pair["bilstm"]))
