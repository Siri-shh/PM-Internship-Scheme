import os
import joblib
import lightgbm as lgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

from src.featurize import featurize_pairs, fit_vectorizer


def train_models(past_df, internships_df, model_out_dir, seed=42):
    """
    Training 2 models:
      • Model 1 → Match Probability
      • Model 2 → Acceptance Probability

    This version includes:
      • Correct merging with suffixes,
      • Correct usage of stipend_internship,
      • Correct job req_skills (req_skills_job),
      • Safe normalization of internship_id,
      • Full schema validation.
    """

    # --------------------------------------------------------
    # NORMALIZE internship_id for perfect merging
    # --------------------------------------------------------
    past_df["internship_id"] = (
        past_df["internship_id"].astype(str).str.strip().str.upper()
    )
    internships_df["internship_id"] = (
        internships_df["internship_id"].astype(str).str.strip().str.upper()
    )

    # --------------------------------------------------------
    # MERGE internship attributes into past_df
    # Using suffixes to avoid overwriting student data
    # --------------------------------------------------------
    past_df_merged = past_df.merge(
        internships_df[
            [
                "internship_id",
                "stipend",
                "tier",
                "location_type",
                "req_skills"
            ]
        ],
        on="internship_id",
        how="left",
        suffixes=("_student", "_internship")
    )

    # Rename merged req_skills
    if "req_skills_internship" in past_df_merged.columns:
        past_df_merged.rename(
            columns={"req_skills_internship": "req_skills_job"}, inplace=True
        )
    else:
        # in case pandas names differ
        past_df_merged["req_skills_job"] = past_df_merged["req_skills"]

    # Rename merged stipend
    if "stipend_internship" not in past_df_merged.columns:
        if "stipend" in past_df_merged.columns:
            # fallback case
            past_df_merged.rename(columns={"stipend": "stipend_internship"}, inplace=True)
        else:
            past_df_merged["stipend_internship"] = None

    # --------------------------------------------------------
    # REQUIRED columns for featurization
    # --------------------------------------------------------
    required_cols = ["stipend_internship", "req_skills_job"]
    missing = [c for c in required_cols if c not in past_df_merged.columns]

    if missing:
        print("Merged columns:", past_df_merged.columns.tolist())
        raise ValueError(f"ERROR: Missing columns after merge: {missing}")

    # --------------------------------------------------------
    # LOAD saved vectorizer (fitted in main)
    # --------------------------------------------------------
    cv = fit_vectorizer(None, None, load_only=True)

    # --------------------------------------------------------
    # CREATE FEATURE MATRIX
    # --------------------------------------------------------
    X = featurize_pairs(past_df_merged, cv)

    # labels
    y_match = past_df_merged["match"].values
    y_accept = past_df_merged["accept"].values

    # split dataset
    X_train_m, X_val_m, y_train_m, y_val_m = train_test_split(
        X, y_match, test_size=0.2, random_state=seed
    )
    X_train_a, X_val_a, y_train_a, y_val_a = train_test_split(
        X, y_accept, test_size=0.2, random_state=seed
    )

    # --------------------------------------------------------
    # MODEL 1 — MATCH PROBABILITY
    # --------------------------------------------------------
    model_match = lgb.LGBMClassifier(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=-1,
        min_data_in_leaf=30,
        random_state=seed
    )
    model_match.fit(X_train_m, y_train_m)

    pred_m = model_match.predict_proba(X_val_m)[:, 1]
    auc_m = roc_auc_score(y_val_m, pred_m)
    print("Model1 (Match) AUC:", auc_m)

    # --------------------------------------------------------
    # MODEL 2 — ACCEPT PROBABILITY
    # --------------------------------------------------------
    model_accept = lgb.LGBMClassifier(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=-1,
        min_data_in_leaf=30,
        random_state=seed
    )
    model_accept.fit(X_train_a, y_train_a)

    pred_a = model_accept.predict_proba(X_val_a)[:, 1]
    auc_a = roc_auc_score(y_val_a, pred_a)
    print("Model2 (Accept) AUC:", auc_a)

    # --------------------------------------------------------
    # SAVE ALL MODELS
    # --------------------------------------------------------
    os.makedirs(model_out_dir, exist_ok=True)
    joblib.dump(model_match, os.path.join(model_out_dir, "model_match.pkl"))
    joblib.dump(model_accept, os.path.join(model_out_dir, "model_accept.pkl"))

    return model_match, model_accept


def load_models(model_dir):
    """Load both ML models."""
    model_match = joblib.load(os.path.join(model_dir, "model_match.pkl"))
    model_accept = joblib.load(os.path.join(model_dir, "model_accept.pkl"))
    return model_match, model_accept
