import json
import os
import pandas as pd

def compute_fairness(final_alloc, students_df, out_json_dir):

    # Flatten selected students
    selected_ids = []
    for iid, lst in final_alloc.items():
        for s in lst:
            selected_ids.append(s["student_id"])

    selected_df = students_df[students_df["student_id"].isin(selected_ids)]

    # Calculate selection rates
    stats = {}

    # Category Parity
    categories = ["SC", "ST", "OBC", "GEN"]

    stats["category_parity"] = {}
    for c in categories:
        eligible = len(students_df[students_df["reservation"] == c])
        selected = len(selected_df[selected_df["reservation"] == c])
        stats["category_parity"][c] = {
            "eligible": eligible,
            "selected": selected,
            "rate": selected / max(1, eligible)
        }

    # Rural Representation
    eligible_r = len(students_df[students_df["rural"] == 1])
    selected_r = len(selected_df[selected_df["rural"] == 1])

    stats["rural_representation"] = {
        "eligible_rural": eligible_r,
        "selected_rural": selected_r,
        "rate": selected_r / max(1, eligible_r)
    }

    # Gender Distribution
    genders = selected_df["gender"].value_counts().to_dict()
    stats["gender_distribution"] = genders

    os.makedirs(out_json_dir, exist_ok=True)
    with open(os.path.join(out_json_dir, "fairness_report.json"), "w") as f:
        json.dump(stats, f, indent=4)

    return stats
