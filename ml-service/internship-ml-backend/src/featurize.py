import os
import pickle
import pandas as pd
import numpy as np

from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import hstack, csr_matrix


# ----------------------------------------------
# PATH TO SAVE/LOAD SKILL VECTORIZER
# ----------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VECTORIZER_PATH = os.path.join(BASE_DIR, "..", "models", "skill_vectorizer.pkl")
VECTORIZER_PATH = os.path.abspath(VECTORIZER_PATH)


# ======================================================================
# VECTORIZE — TRAIN OR LOAD TF-IDF
# ======================================================================
def fit_vectorizer(students_df=None, internships_df=None, load=True):
    """
    Loads or trains the TF-IDF vectorizer.

    load=True  -> load existing vectorizer (production/scoring)
    load=False -> fit new vectorizer (training)
    """

    # Load existing vectorizer
    if load and os.path.exists(VECTORIZER_PATH):
        with open(VECTORIZER_PATH, "rb") as f:
            cv = pickle.load(f)
        return cv

    # Otherwise train new vectorizer
    if students_df is None or internships_df is None:
        raise ValueError("students_df and internships_df required when load=False")

    text_data = (
        students_df["skills"].astype(str).tolist() +
        internships_df["req_skills"].astype(str).tolist()
    )

    cv = TfidfVectorizer(min_df=2, max_features=5000)
    cv.fit(text_data)

    os.makedirs(os.path.dirname(VECTORIZER_PATH), exist_ok=True)

    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(cv, f)

    return cv


# ======================================================================
# FEATURE GENERATION — TRAINING & SCORING
# ======================================================================
def featurize_pairs(df: pd.DataFrame, vectorizer, require_pref_rank=True):
    """
    Converts pair dataframe → ML feature matrix.

    Required columns:
       skills, req_skills_job, gpa, stipend_internship,
       reservation, gender, rural, pref_rank (optional)
    """

    if vectorizer is None:
        raise ValueError("Vectorizer cannot be None — load or train first.")

    required_cols = [
        "skills", "req_skills_job", "gpa",
        "stipend_internship", "reservation",
        "gender", "rural"
    ]

    if require_pref_rank:
        required_cols.append("pref_rank")

    for col in required_cols:
        if col not in df.columns:
            raise KeyError(f"Missing required column '{col}' in featurize_pairs")

    # -------------------------------------------------------------
    # TEXT FIELDS → TF-IDF ENCODING
    # -------------------------------------------------------------
    skills_vec = vectorizer.transform(df["skills"].astype(str).tolist())
    req_vec = vectorizer.transform(df["req_skills_job"].astype(str).tolist())

    # -------------------------------------------------------------
    # NUMERIC FIELDS
    # -------------------------------------------------------------
    gpa = csr_matrix(df["gpa"].astype(float).values.reshape(-1, 1))
    stipend = csr_matrix(df["stipend_internship"].astype(float).values.reshape(-1, 1))
    rural = csr_matrix(df["rural"].astype(int).values.reshape(-1, 1))

    # -------------------------------------------------------------
    # Preference Rank Feature
    # -------------------------------------------------------------
    if require_pref_rank:
        pref = csr_matrix(df["pref_rank"].astype(int).values.reshape(-1, 1))
    else:
        pref = csr_matrix(np.zeros((len(df), 1)))

    # -------------------------------------------------------------
    # CATEGORICAL — Reservation
    # -------------------------------------------------------------
    reservation_map = {"GEN": 0, "OBC": 1, "SC": 2, "ST": 3}
    res = csr_matrix(
        df["reservation"].map(reservation_map).fillna(0).astype(int).values.reshape(-1, 1)
    )

    # -------------------------------------------------------------
    # CATEGORICAL — Gender
    # -------------------------------------------------------------
    gender_map = {"M": 0, "F": 1, "O": 2}
    gender = csr_matrix(
        df["gender"].map(gender_map).fillna(0).astype(int).values.reshape(-1, 1)
    )

    # -------------------------------------------------------------
    # INTERACTION FEATURE — Skill Overlap Count
    # -------------------------------------------------------------
    def overlap_count(row):
        s = set(str(row["skills"]).split())
        j = set(str(row["req_skills_job"]).split())
        return len(s.intersection(j))

    overlap_vals = df.apply(overlap_count, axis=1).astype(float).values.reshape(-1, 1)
    overlap = csr_matrix(overlap_vals)

    # -------------------------------------------------------------
    # FINAL FEATURE MATRIX
    # -------------------------------------------------------------
    X = hstack([
        skills_vec,          # student skills TF-IDF
        req_vec,             # internship skills TF-IDF
        overlap,             # NEW powerful feature
        gpa,
        stipend,
        res,
        gender,
        rural,
        pref
    ]).tocsr()

    return X
