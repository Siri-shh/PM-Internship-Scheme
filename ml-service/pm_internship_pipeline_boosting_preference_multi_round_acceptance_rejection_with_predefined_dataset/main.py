#!/usr/bin/env python3
"""
main.py
Final pipeline entrypoint for real datasets.

Expects inside pm_internship_pipeline/data/:
 - students.csv
 - internships.csv

Produces:
 - data/past_pairs_gen.csv
 - models/*.pkl
 - output/scored_pairs.csv
 - output/final_allocations_real.csv
 - json_outputs/*.json
"""

import os
import json
import pandas as pd

from src.utils import ensure_dirs
from src.data_real_past_generator import generate_pseudo_past_data
from src.models import train_models, score_all_pairs
from src.ranklist_builder import build_ranklists
from src.optionC_allotment import optionC_allotment_simulated_rejection


# --------------------
# Directories
# --------------------
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
MODELS_DIR = os.path.join(ROOT_DIR, "models")
OUTPUT_DIR = os.path.join(ROOT_DIR, "output")
JSON_DIR = os.path.join(ROOT_DIR, "json_outputs")

RANDOM_SEED = 123


def main():

    ensure_dirs(DATA_DIR, MODELS_DIR, OUTPUT_DIR, JSON_DIR)

    # ----------------------------------------------------------
    # 1) LOAD REAL STUDENT + INTERNSHIP DATASETS
    # ----------------------------------------------------------
    print("Loading real datasets...")

    students_path = os.path.join(DATA_DIR, "students.csv")
    internships_path = os.path.join(DATA_DIR, "internships.csv")

    students_df = pd.read_csv(students_path)
    internships_df = pd.read_csv(internships_path)

    if "skills" in students_df.columns:
        students_df["skills"] = students_df["skills"].astype(str).str.replace(";", " ")
    if "req_skills" in internships_df.columns:
        internships_df["req_skills"] = internships_df["req_skills"].astype(str).str.replace(";", " ")

    if "capacity" not in internships_df.columns:
        raise KeyError("internships.csv must contain a 'capacity' column.")

    print(f"Loaded {len(students_df)} students and {len(internships_df)} internships")

    # ----------------------------------------------------------
    # 2) GENERATE PSEUDO PAST TRAINING PAIRS
    # ----------------------------------------------------------
    print("Generating pseudo historical training pairs...")

    past_df = generate_pseudo_past_data(
        students_df,
        internships_df,
        n_samples=8000
    )

    past_path = os.path.join(DATA_DIR, "past_pairs_gen.csv")
    past_df.to_csv(past_path, index=False)

    print(f"Generated pseudo past pairs saved to {past_path}")

    # ----------------------------------------------------------
    # 3) TRAIN MODELS (VECTORIZE ON REAL DATA)
    # ----------------------------------------------------------
    print("Training models...")

    model_match, model_accept, vectorizer = train_models(
        past_df,
        students_df,
        internships_df,
        seed=RANDOM_SEED
    )

    print(f"Models + vectorizer saved to {MODELS_DIR}")

    # ----------------------------------------------------------
    # 4) GENERATE ALL STUDENT-INTERN ALL PAIRS
    # ----------------------------------------------------------
    print("Scoring student-internship pairs...")

    pairs = []
    for _, s in students_df.iterrows():
        for _, j in internships_df.iterrows():
            pairs.append({
                "student_id": s["student_id"],
                "internship_id": j["internship_id"],
                "skills": s.get("skills", ""),
                "req_skills_job": j.get("req_skills", ""),
                "gpa": s.get("gpa", 0.0),
                "stipend_internship": j.get("stipend", 0.0),
                "reservation": s.get("reservation", "GEN"),
                "gender": s.get("gender", "M"),
                "rural": s.get("rural", 0),

                # preference columns
                "pref_1": s.get("pref_1"),
                "pref_2": s.get("pref_2"),
                "pref_3": s.get("pref_3"),
                "pref_4": s.get("pref_4"),
                "pref_5": s.get("pref_5"),
                "pref_6": s.get("pref_6")
            })

    pairs_df = pd.DataFrame(pairs)
    print(f"Total pairs to score: {len(pairs_df)}")

    # ----------------------------------------------------------
    # 5) COMPUTE PREF_RANK FOR SCORING
    # ----------------------------------------------------------
    print("Assigning preference ranks...")

    def get_pref_rank(row):
        iid = row["internship_id"]
        for r in range(1, 7):
            if row.get(f"pref_{r}") == iid:
                return r
        return 7  # not in preference list

    pairs_df["pref_rank"] = pairs_df.apply(get_pref_rank, axis=1)

    # ----------------------------------------------------------
    # 6) MODEL SCORING
    # ----------------------------------------------------------
    scored_pairs = score_all_pairs(
        pairs_df,
        model_match,
        model_accept,
        vectorizer
    )

    scored_path = os.path.join(OUTPUT_DIR, "scored_pairs.csv")
    scored_pairs.to_csv(scored_path, index=False)
    print(f"Scored pairs saved to: {scored_path}")

    # ----------------------------------------------------------
    # 7) BUILD RANKLISTS
    # ----------------------------------------------------------
    print("Building ranklists...")
    ranklists = build_ranklists(scored_pairs, internships_df)
    print(f"Built ranklists for {len(ranklists)} internships.")

    # ----------------------------------------------------------
    # 8) RUN OPTION C WITH SIMULATED REJECTION + UPGRADES
    # ----------------------------------------------------------
    print("Running hybrid simulated allocation...")

    final_df, fairness_report = optionC_allotment_simulated_rejection(
        ranklists=ranklists,
        internships_df=internships_df,
        out_json_dir=JSON_DIR,
        max_rounds=8,
        default_accept_prob=0.7,
        seed=RANDOM_SEED
    )

    final_path = os.path.join(OUTPUT_DIR, "final_allocations_real.csv")
    final_df.to_csv(final_path, index=False)

    # save fairness json
    with open(os.path.join(JSON_DIR, "final_fairness_report.json"), "w") as f:
        json.dump(fairness_report, f, indent=2)

    print(f"Final allocations saved to: {final_path}")
    print(f"JSON logs saved in: {JSON_DIR}")
    print("\nPipeline Completed Successfully.")


if __name__ == "__main__":
    main()
