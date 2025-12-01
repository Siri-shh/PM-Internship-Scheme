import os
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack
from sklearn.feature_extraction.text import CountVectorizer


VEC_PATH = "/content/pm_internship_pipeline/models/vectorizer.pkl"


def fit_vectorizer(students_df=None, internships_df=None, load_only=False):
    """
    Fits or loads the CountVectorizer.
    If load_only=True → loads vectorizer from disk.
    """

    # Load only mode
    if load_only:
        if not os.path.exists(VEC_PATH):
            raise FileNotFoundError("Vectorizer missing. Run training first.")
        return joblib.load(VEC_PATH)

    # Normal mode: Fit from scratch using student & job skills text
    all_text = pd.concat([
        students_df["skills"],
        internships_df["req_skills"]
    ]).astype(str).tolist()

    cv = CountVectorizer(binary=True)
    cv.fit(all_text)

    os.makedirs(os.path.dirname(VEC_PATH), exist_ok=True)
    joblib.dump(cv, VEC_PATH)

    return cv


def featurize_pairs(pairs_df, cv):
    """
    Convert student-job pairs into ML feature vectors.

    Uses:
      • skills_student
      • req_skills_job
      • gpa
      • stipend_internship
      • tier
      • location_type
    """

    # Extract text features
    skills = pairs_df["skills"].astype(str)
    req = pairs_df["req_skills_job"].astype(str)

    skills_vec = cv.transform(skills)
    req_vec = cv.transform(req)

    # Numeric features
    gpa = pairs_df["gpa"].values.reshape(-1, 1)
    stipend = pairs_df["stipend_internship"].values.reshape(-1, 1)

    # Categorical numeric encodings
    tier = pairs_df["tier"].map({
        "Tier1": 3, "Tier2": 2, "Tier3": 1
    }).fillna(0).values.reshape(-1, 1)

    location = pairs_df["location_type"].map({
        "Office": 3, "Factory": 2, "Remote": 1
    }).fillna(0).values.reshape(-1, 1)

    # Combine all features
    X = hstack([
        skills_vec,
        req_vec,
        gpa,
        stipend,
        tier,
        location
    ])

    return X
