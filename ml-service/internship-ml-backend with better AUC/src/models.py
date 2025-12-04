import os
import pickle
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

from src.featurize import featurize_pairs, fit_vectorizer, VECTORIZER_PATH


# ==========================================================
# MODEL FILE PATHS
# ==========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "models"))

MODEL_MATCH_PATH = os.path.join(MODELS_DIR, "model_match.pkl")
MODEL_ACCEPT_PATH = os.path.join(MODELS_DIR, "model_accept.pkl")


# ==========================================================
# Load trained models + vectorizer
# ==========================================================
def load_models_and_vectorizer():
    """Loads match model, accept model, and vectorizer."""

    if not os.path.exists(MODEL_MATCH_PATH) or not os.path.exists(MODEL_ACCEPT_PATH):
        raise FileNotFoundError("Models not found. Train models first.")

    if not os.path.exists(VECTORIZER_PATH):
        raise FileNotFoundError("Vectorizer missing. Train models first.")

    with open(MODEL_MATCH_PATH, "rb") as f:
        model_match = pickle.load(f)

    with open(MODEL_ACCEPT_PATH, "rb") as f:
        model_accept = pickle.load(f)

    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)

    return model_match, model_accept, vectorizer


# ==========================================================
# Training Function
# ==========================================================
def train_models(past_df, students_df, internships_df, seed=42):
    """
    Train the match & accept models using REAL student + internship data.
    """

    print("Training models (real-data mode)...")

    os.makedirs(MODELS_DIR, exist_ok=True)

    # ------------------------------------------------------
    # Fit vectorizer ONLY on real data
    # ------------------------------------------------------
    vectorizer = fit_vectorizer(
        students_df=students_df,
        internships_df=internships_df,
        load=False
    )

    # ------------------------------------------------------
    # Validate past_df columns
    # ------------------------------------------------------
    required_cols = [
        "skills",
        "req_skills_job",
        "gpa",
        "stipend_internship",
        "reservation",
        "gender",
        "rural",
        "match",
        "accept"
    ]

    for c in required_cols:
        if c not in past_df.columns:
            raise KeyError(f"Missing column '{c}' in past_df for training.")

    # ------------------------------------------------------
    # Featurize training pairs (NO pref_rank used)
    # ------------------------------------------------------
    X = featurize_pairs(past_df, vectorizer, require_pref_rank=False)

    y_match = past_df["match"].astype(int).values
    y_accept = past_df["accept"].astype(int).values

    # ------------------------------------------------------
    # Train-test split
    # ------------------------------------------------------
    X_train1, X_test1, y_train1, y_test1 = train_test_split(
        X, y_match, test_size=0.20, random_state=seed
    )

    X_train2, X_test2, y_train2, y_test2 = train_test_split(
        X, y_accept, test_size=0.20, random_state=seed
    )

    # ======================================================
    # OPTIMIZED LIGHTGBM MODELS (Better AUC)
    # ======================================================
    model_match = LGBMClassifier(
        n_estimators=600,
        learning_rate=0.03,
        num_leaves=64,
        max_depth=-1,
        subsample=0.9,
        colsample_bytree=0.9,
        min_data_in_leaf=30,
        reg_lambda=1.0,
        random_state=seed,
        force_col_wise=True     # removes feature name warnings
    )

    model_accept = LGBMClassifier(
        n_estimators=600,
        learning_rate=0.03,
        num_leaves=64,
        max_depth=-1,
        subsample=0.9,
        colsample_bytree=0.9,
        min_data_in_leaf=30,
        reg_lambda=1.0,
        random_state=seed,
        force_col_wise=True
    )

    # ======================================================
    # Train Match Model
    # ======================================================
    print("Training Match model...")
    model_match.fit(X_train1, y_train1)
    pred_match = model_match.predict_proba(X_test1)[:, 1]
    auc_match = roc_auc_score(y_test1, pred_match)
    print(f"Match Model AUC: {auc_match:.4f}")

    # ======================================================
    # Train Accept Model
    # ======================================================
    print("Training Accept model...")
    model_accept.fit(X_train2, y_train2)
    pred_accept = model_accept.predict_proba(X_test2)[:, 1]
    auc_accept = roc_auc_score(y_test2, pred_accept)
    print(f"Accept Model AUC: {auc_accept:.4f}")

    # ======================================================
    # SAVE MODELS + VECTORIZER
    # ======================================================
    with open(MODEL_MATCH_PATH, "wb") as f:
        pickle.dump(model_match, f)

    with open(MODEL_ACCEPT_PATH, "wb") as f:
        pickle.dump(model_accept, f)

    print(f"Models saved to {MODELS_DIR}")

    return model_match, model_accept, vectorizer


# ==========================================================
# SCORING FUNCTION
# ==========================================================
def score_all_pairs(pairs_df, model_match, model_accept, vectorizer):
    """
    Uses trained models + saved vectorizer to compute:
        match_score + accept_score
    """

    X = featurize_pairs(pairs_df, vectorizer, require_pref_rank=True)

    pairs_df["match_score"] = model_match.predict_proba(X)[:, 1]
    pairs_df["accept_score"] = model_accept.predict_proba(X)[:, 1]

    return pairs_df
