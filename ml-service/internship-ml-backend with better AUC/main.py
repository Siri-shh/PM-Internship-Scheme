#!/usr/bin/env python3
"""
main.py
End-to-end Internship Allocation ML Pipeline
Cleaned, optimized, and fully stable version.
"""

import os
import json
import pandas as pd

from src.utils import ensure_dirs
from src.data_real_past_generator import generate_pseudo_past_data
from src.models import train_models, score_all_pairs
from src.boost_engine import apply_middle_tier_boost
from src.ranklist_builder import build_ranklists
from src.optionC_allotment import optionC_allotment_simulated_rejection
from src.fairness_report import build_fairness_report
from src.boost_report import build_student_boost_report


# --------------------------------------------------------------------
# Directory Configuration
# --------------------------------------------------------------------
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
MODELS_DIR = os.path.join(ROOT_DIR, "models")
OUTPUT_DIR = os.path.join(ROOT_DIR, "output")
JSON_DIR = os.path.join(ROOT_DIR, "json_outputs")

RANDOM_SEED = 123


# --------------------------------------------------------------------
# MAIN PIPELINE
# --------------------------------------------------------------------
def main(
    n_samples_past=15000,
    generator_seed=123,
    generator_weights=None
):
    """
    Full end-to-end Allocation Pipeline:
      1. Load real input data
      2. Generate pseudo past-match data
      3. Train ML models
      4. Score all student–internship pairs
      5. Apply fairness boosting
      6. Build ranklists
      7. Run allocation simulation
      8. Write fairness & boost reports
    """

    # Create required directories
    ensure_dirs(DATA_DIR, MODELS_DIR, OUTPUT_DIR, JSON_DIR)

    print("Loading real datasets...")

    students_path = os.path.join(DATA_DIR, "students.csv")
    internships_path = os.path.join(DATA_DIR, "internships.csv")

    if not os.path.exists(students_path):
        raise FileNotFoundError("students.csv not found in /data directory")

    if not os.path.exists(internships_path):
        raise FileNotFoundError("internships.csv not found in /data directory")

    students_df = pd.read_csv(students_path)
    internships_df = pd.read_csv(internships_path)

    # Clean semicolon skills formatting
    students_df["skills"] = students_df["skills"].astype(str).str.replace(";", " ")
    internships_df["req_skills"] = internships_df["req_skills"].astype(str).str.replace(";", " ")

    if "capacity" not in internships_df.columns:
        raise KeyError("Missing column: 'capacity' in internships.csv")

    print(f"Loaded {len(students_df)} students and {len(internships_df)} internships.")

    # ----------------------------------------------------------------------
    # STEP 1: Generate Past Training Data
    # ----------------------------------------------------------------------
    print("Generating realistic pseudo historical training pairs (v2)...")

    past_df = generate_pseudo_past_data(
        students_df=students_df,
        internships_df=internships_df,
        n_samples=n_samples_past,
        seed=generator_seed,
        save_path=os.path.join(DATA_DIR, "past_pairs_gen.csv"),
        weights=generator_weights
    )

    print("Pseudo past pairs saved.")

    # ----------------------------------------------------------------------
    # STEP 2: Train ML Models
    # ----------------------------------------------------------------------
    print("Training ML models...")

    model_match, model_accept, vectorizer = train_models(
        past_df,
        students_df,
        internships_df,
        seed=RANDOM_SEED
    )

    print("Models trained and saved.")

    # ----------------------------------------------------------------------
    # STEP 3: Build all student-internship pairs for scoring
    # ----------------------------------------------------------------------
    print("Preparing student–internship scoring pairs...")

    pairs = []
    for _, s in students_df.iterrows():
        for _, j in internships_df.iterrows():
            pairs.append({
                "student_id": s["student_id"],
                "internship_id": j["internship_id"],
                "skills": s["skills"],
                "req_skills_job": j["req_skills"],
                "gpa": s.get("gpa", 0.0),
                "stipend_internship": j.get("stipend", 0.0),
                "reservation": s.get("reservation", "GEN"),
                "gender": s.get("gender", "M"),
                "rural": s.get("rural", 0),

                # student preferences for later pref_rank computation
                "pref_1": s.get("pref_1"),
                "pref_2": s.get("pref_2"),
                "pref_3": s.get("pref_3"),
                "pref_4": s.get("pref_4"),
                "pref_5": s.get("pref_5"),
                "pref_6": s.get("pref_6"),
            })

    pairs_df = pd.DataFrame(pairs)

    print(f"Total scoring pairs: {len(pairs_df)}")

    # ----------------------------------------------------------------------
    # STEP 4: Assign preference rank
    # ----------------------------------------------------------------------
    print("Assigning preference ranks...")

    def get_pref_rank(row):
        iid = row["internship_id"]
        for r in range(1, 7):
            if row.get(f"pref_{r}") == iid:
                return r
        return 7  # Not listed

    pairs_df["pref_rank"] = pairs_df.apply(get_pref_rank, axis=1)

    # ----------------------------------------------------------------------
    # STEP 5: Score all pairs using ML models
    # ----------------------------------------------------------------------
    print("Scoring student–internship pairs with ML models...")

    scored_pairs = score_all_pairs(pairs_df, model_match, model_accept, vectorizer)

    # ----------------------------------------------------------------------
    # STEP 6: Apply Middle-Tier Fairness Boosting
    # ----------------------------------------------------------------------
    print("Applying middle-tier fairness boosting...")

    scored_pairs = apply_middle_tier_boost(scored_pairs)

    boosted_path = os.path.join(OUTPUT_DIR, "boosted_pairs_debug.csv")
    scored_pairs.to_csv(boosted_path, index=False)
    print(f"Boosted scored pairs saved to: {boosted_path}")

    # ----------------------------------------------------------------------
    # STEP 7: Build Ranklists for Allocation
    # ----------------------------------------------------------------------
    print("Building ranklists...")

    ranklists = build_ranklists(scored_pairs, internships_df)

    print(f"Built ranklists for {len(ranklists)} internships.")

    # ----------------------------------------------------------------------
    # STEP 8: Run Allocation Engine
    # ----------------------------------------------------------------------
    print("Running simulated multi-round allocation...")

    final_df, round_logs = optionC_allotment_simulated_rejection(
        ranklists=ranklists,
        internships_df=internships_df,
        out_json_dir=JSON_DIR,
        max_rounds=8,
        default_accept_prob=0.7,
        seed=RANDOM_SEED
    )

    final_path = os.path.join(OUTPUT_DIR, "final_allocations_real.csv")
    final_df.to_csv(final_path, index=False)

    # ----------------------------------------------------------------------
    # STEP 9: Build Boost Uplift Report
    # ----------------------------------------------------------------------
    print("Generating student-level boost uplift report...")

    student_boost_path = os.path.join(JSON_DIR, "student_boost_impact.json")
    build_student_boost_report(
        boosted_df=scored_pairs,
        final_alloc_df=final_df,
        out_path=student_boost_path
    )

    # ----------------------------------------------------------------------
    # STEP 10: Build Fairness Report
    # ----------------------------------------------------------------------
    print("Generating fairness report...")

    fairness_report = build_fairness_report(
        final_alloc_df=final_df,
        students_df=students_df,
        round_logs=round_logs
    )

    fairness_path = os.path.join(JSON_DIR, "final_fairness_report.json")
    with open(fairness_path, "w") as f:
        json.dump(fairness_report, f, indent=2)

    # ----------------------------------------------------------------------
    print("\n===== PIPELINE COMPLETED SUCCESSFULLY =====")
    print(f"Final allocations saved to: {final_path}")
    print(f"JSON outputs stored in: {JSON_DIR}")


# --------------------------------------------------------------------
# ENTRY POINT
# --------------------------------------------------------------------
if __name__ == "__main__":
    main(n_samples_past=15000, generator_seed=RANDOM_SEED)
