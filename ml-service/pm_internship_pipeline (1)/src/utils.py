import os
import json
import joblib
import pandas as pd


def ensure_dirs(*paths):
    for p in paths:
        os.makedirs(p, exist_ok=True)


def save_csv(df, path):
    df.to_csv(path, index=False)


def save_model(m, path):
    joblib.dump(m, path)


def load_csv(path):
    return pd.read_csv(path)
