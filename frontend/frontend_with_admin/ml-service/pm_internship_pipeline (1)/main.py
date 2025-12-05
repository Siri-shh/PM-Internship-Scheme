import os
import json
import pandas as pd

from src.utils import ensure_dirs
from src.data_generator import generate_synthetic_data
from src.featurize import fit_vectorizer, featurize_pairs
from src.models import train_models, load_models
from src.ranklist_builder import build_ranklists
from src.optionC_allotment import optionC_allotment


# --------------------------------------------------------
# MAIN PIPELINE
# --------------------------------------------------------
def main():

    BASEDIR = "/content/pm_internship_pipeline"
    DATADIR = os.path.join(BASEDIR, "data")
    OUTDIR = os.path.join(BASEDIR, "out")
    JSON_OUT = os.path.join(OUTDIR, "json")
    MODEL_DIR = os.path.join(BASEDIR, "models")

    ensure_dirs(DATADIR, OUTDIR, JSON_OUT, MODEL_DIR)
    print("Folders ready.")

    # --------------------------------------------------------
    # STEP 1: SYNTHETIC DATA GENERATION
    # --------------------------------------------------------
    print("Generating synthetic data...")
    students_df, internships_df, past_df = generate_synthetic_data()

    students_df.to_csv(os.path.join(DATADIR, "students.csv"), index=False)
    internships_df.to_csv(os.path.join(DATADIR, "internships.csv"), index=False)
    past_df.to_csv(os.path.join(DATADIR, "historical_pairs.csv"), index=False)

    print(f"Saved synthetic CSVs to {DATADIR}")

    # --------------------------------------------------------
    # STEP 2: FIT VECTORIAL SKILL ENCODER
    # --------------------------------------------------------
    print("Fitting skill vectorizer...")
    fit_vectorizer(students_df, internships_df)

    # --------------------------------------------------------
    # STEP 3: TRAIN MODELS
    # --------------------------------------------------------
    print("Training models (this may take a minute)...")
    m1, m2 = train_models(past_df, internships_df, MODEL_DIR, seed=42)
    print(f"Models trained and saved to {MODEL_DIR}")

    # --------------------------------------------------------
    # STEP 4: SCORE ALL STUDENT–INTERNSHIP PAIRS
    # --------------------------------------------------------
    print("Preparing and scoring all student-internship pairs...")

    pairs = []
    for _, s in students_df.iterrows():
        for _, i in internships_df.iterrows():
            pairs.append({
                "student_id": s["student_id"],
                "internship_id": i["internship_id"],

                # student attributes
                "skills": s["skills"],
                "gpa": s["gpa"],
                "reservation": s["reservation"],
                "rural": s["rural"],
                "gender": s["gender"],

                # internship attributes
                "req_skills_job": i["req_skills"],
                "stipend_internship": i["stipend"],
                "tier": i["tier"],
                "location_type": i["location_type"]
            })

    pairs_df = pd.DataFrame(pairs)
    print("Total pairs to score:", len(pairs_df))

    # Load vectorizer
    cv = fit_vectorizer(None, None, load_only=True)

    # Feature matrix
    X = featurize_pairs(pairs_df, cv)

    print("Predicting match/accept probabilities...")
    pairs_df["match_prob"] = m1.predict_proba(X)[:, 1]
    pairs_df["accept_prob"] = m2.predict_proba(X)[:, 1]
    pairs_df["final_score"] = 0.6 * pairs_df["match_prob"] + 0.4 * pairs_df["accept_prob"]

    scored_path = os.path.join(BASEDIR, "scored_pairs.csv")
    pairs_df.to_csv(scored_path, index=False)
    print(f"Scored pairs saved to: {scored_path}")

    # --------------------------------------------------------
    # STEP 5: BUILD RANKLISTS
    # --------------------------------------------------------
    print("Building ranklists...")
    ranklists = build_ranklists(pairs_df, internships_df)
    print(f"Ranklists built for {len(ranklists)} internships.")

    # --------------------------------------------------------
    # STEP 6: OPTION C – MULTI-ROUND RESERVED CATEGORY FILLING
    # --------------------------------------------------------
    print("Running Option C Government-Style Allotment...")

    result = optionC_allotment(ranklists, internships_df, JSON_OUT)

    # DEBUG optional:
    # print("RETURN TYPE:", type(result))
    # print("RETURN KEYS:", result.keys())

    print("Converting result dictionary → DataFrame...")
    rows = []
    for intern_id, selected_list in result.items():
        for sel in selected_list:
            rows.append({
                "internship_id": intern_id,
                "student_id": sel["student_id"],
                "final_score": sel["final_score"],
                "reservation": sel["reservation"],
                "rural": sel["rural"],
                "gender": sel["gender"]
            })

    final_alloc_df = pd.DataFrame(rows)

    # Save CSV
    final_csv_path = os.path.join(OUTDIR, "final_allocations_optionC.csv")
    final_alloc_df.to_csv(final_csv_path, index=False)

    # Save JSON (entire allotment result)
    json_path = os.path.join(JSON_OUT, "final_allocations_optionC.json")
    with open(json_path, "w") as f:
        json.dump(result, f, indent=4)

    print(f"Final allocations (CSV) saved to: {final_csv_path}")
    print(f"Final allocations (JSON) saved to: {json_path}")

    print("Pipeline complete.")


# --------------------------------------------------------
# ENTRY POINT
# --------------------------------------------------------
if __name__ == "__main__":
    main()
