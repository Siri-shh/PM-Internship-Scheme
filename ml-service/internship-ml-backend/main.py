#!/usr/bin/env python3
"""
Enhanced main.py
Complete ML-driven Internship Allocation Pipeline with Advanced Analytics.
"""

import os
import json
import pandas as pd

# Utility
from src.utils import ensure_dirs

# Core pipeline modules
from src.data_real_past_generator import generate_pseudo_past_data
from src.models import train_models, score_all_pairs
from src.boost_engine import apply_middle_tier_boost
from src.ranklist_builder import build_ranklists
from src.optionC_allotment import optionC_allotment_simulated_rejection

# New analytics modules
from src.preference_metrics import compute_preference_satisfaction
from src.boost_report import build_student_boost_report
from src.sector_fairness import build_sector_fairness_report
from src.round_dynamics import analyze_round_dynamics
from src.internship_quality import compute_internship_quality_scores


# ------------------------------------------------------------
# Directory paths
# ------------------------------------------------------------
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
MODELS_DIR = os.path.join(ROOT_DIR, "models")
OUTPUT_DIR = os.path.join(ROOT_DIR, "output")
JSON_DIR = os.path.join(ROOT_DIR, "json_outputs")

RANDOM_SEED = 123


def main(n_samples_past=15000, generator_seed=123, generator_weights=None):
    print("\n======== INTERNSHIP ALLOCATION PIPELINE STARTED ========\n")

    ensure_dirs(DATA_DIR, MODELS_DIR, OUTPUT_DIR, JSON_DIR)

    # ------------------------------------------------------------
    # LOAD STUDENTS + INTERNSHIPS
    # ------------------------------------------------------------
    print("Loading datasets...")

    students_path = os.path.join(DATA_DIR, "students.csv")
    internships_path = os.path.join(DATA_DIR, "internships.csv")

    students_df = pd.read_csv(students_path)
    internships_df = pd.read_csv(internships_path)

    if "skills" in students_df:
        students_df["skills"] = students_df["skills"].astype(str).str.replace(";", " ")

    if "req_skills" in internships_df:
        internships_df["req_skills"] = internships_df["req_skills"].astype(str).str.replace(";", " ")

    print(f"Loaded {len(students_df)} students and {len(internships_df)} internships.\n")

    # ------------------------------------------------------------
    # GENERATE PAST PAIRS
    # ------------------------------------------------------------
    print("Generating pseudo-historical past data...")

    past_df = generate_pseudo_past_data(
        students_df=students_df,
        internships_df=internships_df,
        n_samples=n_samples_past,
        seed=generator_seed,
        save_path=os.path.join(DATA_DIR, "past_pairs_gen.csv"),
        weights=generator_weights
    )

    print("Past data generated.\n")

    # ------------------------------------------------------------
    # TRAIN MODELS
    # ------------------------------------------------------------
    print("Training ML models...\n")

    model_match, model_accept, vectorizer = train_models(
        past_df,
        students_df,
        internships_df,
        seed=RANDOM_SEED
    )

    print("Model training complete.\n")

    # ------------------------------------------------------------
    # BUILD ALL POSSIBLE PAIRS
    # ------------------------------------------------------------
    print("Preparing all student-internship pairs...")

    pairs = []
    for _, s in students_df.iterrows():
        for _, j in internships_df.iterrows():
            pairs.append({
                "student_id": s["student_id"],
                "internship_id": j["internship_id"],
                "skills": s["skills"],
                "req_skills_job": j["req_skills"],
                "gpa": s.get("gpa", 0),
                "stipend_internship": j.get("stipend", 0),
                "reservation": s.get("reservation", "GEN"),
                "gender": s.get("gender", "M"),
                "rural": s.get("rural", 0),

                "pref_1": s.get("pref_1"),
                "pref_2": s.get("pref_2"),
                "pref_3": s.get("pref_3"),
                "pref_4": s.get("pref_4"),
                "pref_5": s.get("pref_5"),
                "pref_6": s.get("pref_6"),
            })

    pairs_df = pd.DataFrame(pairs)
    print(f"Total combinations: {len(pairs_df)}\n")

    # Compute preference ranking
    def _pref_rank(row):
        iid = row["internship_id"]
        for r in range(1, 7):
            if row.get(f"pref_{r}") == iid:
                return r
        return 7

    pairs_df["pref_rank"] = pairs_df.apply(_pref_rank, axis=1)

    # ------------------------------------------------------------
    # SCORE WITH ML MODELS
    # ------------------------------------------------------------
    print("Scoring pairs using ML models...")

    scored_pairs = score_all_pairs(pairs_df, model_match, model_accept, vectorizer)

    # ------------------------------------------------------------
    # APPLY FAIRNESS BOOST
    # ------------------------------------------------------------
    print("Applying fairness boosting...")
    scored_pairs = apply_middle_tier_boost(scored_pairs)

    boosted_path = os.path.join(OUTPUT_DIR, "boosted_pairs_debug.csv")
    scored_pairs.to_csv(boosted_path, index=False)
    print(f"Boosted pairs saved → {boosted_path}\n")

    # ------------------------------------------------------------
    # BUILD RANKLISTS
    # ------------------------------------------------------------
    print("Building ranklists for allocator...")

    ranklists = build_ranklists(scored_pairs, internships_df)
    print("Ranklists ready.\n")

    # ------------------------------------------------------------
    # RUN ALLOCATION SIMULATION
    # ------------------------------------------------------------
    print("Running multi-round allocation simulation...\n")

    final_df, round_logs = optionC_allotment_simulated_rejection(
        ranklists,
        internships_df,
        JSON_DIR,
        max_rounds=8,
        default_accept_prob=0.70,
        seed=RANDOM_SEED
    )

    final_alloc_path = os.path.join(OUTPUT_DIR, "final_allocations_real.csv")
    final_df.to_csv(final_alloc_path, index=False)

    print(f"Final allocation saved → {final_alloc_path}\n")

    # ------------------------------------------------------------
    # ADVANCED ANALYTICS OUTPUTS
    # ------------------------------------------------------------
    print("Generating advanced analytics...\n")

    compute_preference_satisfaction(
        final_alloc_df=final_df,
        pairs_df=pairs_df,
        out_path=os.path.join(JSON_DIR, "preference_satisfaction")
    )

    build_student_boost_report(
        boosted_df=scored_pairs,
        final_alloc_df=final_df,
        out_path=os.path.join(JSON_DIR, "student_boost_impact.json")
    )

    build_sector_fairness_report(
        final_alloc_df=final_df,
        students_df=students_df,
        internships_df=internships_df,
        out_path=os.path.join(JSON_DIR, "sector_fairness")
    )

    analyze_round_dynamics(
        round_logs,
        out_path=os.path.join(JSON_DIR, "round_dynamics")
    )

    compute_internship_quality_scores(
        pairs_df,
        final_df,
        internships_df,
        out_path=os.path.join(JSON_DIR, "internship_quality")
    )

    print("\n======== PIPELINE COMPLETED SUCCESSFULLY ========")
    print(f"JSON analytics saved inside: {JSON_DIR}")
    print("=================================================\n")


if __name__ == "__main__":
    main(n_samples_past=15000, generator_seed=RANDOM_SEED)
