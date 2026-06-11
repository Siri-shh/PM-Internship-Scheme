import os
import json
import pandas as pd


def compute_preference_satisfaction(final_alloc_df: pd.DataFrame,
                                    pairs_df: pd.DataFrame,
                                    out_path: str = None):
    """
    Compute Preference Satisfaction Metrics.

    Args:
        final_alloc_df: DataFrame with columns ["student_id", "internship_id", "pref_rank", ...]
            (the output from the allocator).
        pairs_df: DataFrame containing all student-internship pairs that were used for scoring,
            must include columns: ["student_id", "internship_id", "pref_rank"].
            If pairs_df does not have pref_rank for the final pair, this function will compute it by merging.
        out_path: Optional path (folder+filename or folder) to save JSON (and CSV). If folder provided,
                 will save 'preference_satisfaction.json' and 'preference_satisfaction.csv' inside it.
                 If None, nothing is written to disk and the report dict is returned.

    Returns:
        report (dict) with keys:
          - total_placed
          - pct_first_choice
          - pct_top3
          - pct_top5
          - pct_outside_preferences
          - counts dict for the same categories
          - a small example table (first 20 placements with pref_rank)
    """

    # Basic validation
    if not {"student_id", "internship_id"}.issubset(final_alloc_df.columns):
        raise KeyError("final_alloc_df must contain 'student_id' and 'internship_id'")

    # Ensure pref_rank exists in final_alloc_df; if not, merge from pairs_df
    final = final_alloc_df.copy()
    if "pref_rank" not in final.columns:
        if not {"student_id", "internship_id", "pref_rank"}.issubset(pairs_df.columns):
            # try to compute pref_rank by grouping student's pref_1..pref_6 in pairs_df
            # fallback: merge on student+internship to get pref_rank if present
            raise KeyError("pref_rank missing in final_alloc_df and pairs_df does not contain 'pref_rank'")
        merged = final.merge(
            pairs_df[["student_id", "internship_id", "pref_rank"]],
            on=["student_id", "internship_id"],
            how="left"
        )
        final = merged

    # Now compute stats
    total_placed = final["student_id"].nunique()

    # safeguard for zero placed
    if total_placed == 0:
        report = {
            "total_placed": 0,
            "pct_first_choice": 0.0,
            "pct_top3": 0.0,
            "pct_top5": 0.0,
            "pct_outside_preferences": 0.0,
            "counts": {"first_choice": 0, "top3": 0, "top5": 0, "outside": 0},
            "example_table": []
        }
        if out_path:
            _write_reports(report, out_path)
        return report

    # convert pref_rank to int (safe)
    final["pref_rank"] = pd.to_numeric(final["pref_rank"], errors="coerce").fillna(999).astype(int)

    # Counts
    first_choice_count = int((final["pref_rank"] == 1).sum())
    top3_count = int((final["pref_rank"] <= 3).sum())
    top5_count = int((final["pref_rank"] <= 5).sum())
    outside_count = int((final["pref_rank"] > 6).sum())  # we use >6 as 'outside top-6'

    # Percentages
    pct_first = round(first_choice_count / total_placed, 4)
    pct_top3 = round(top3_count / total_placed, 4)
    pct_top5 = round(top5_count / total_placed, 4)
    pct_outside = round(outside_count / total_placed, 4)

    # Example table (first 20 rows) for quick inspection
    example = final[["student_id", "internship_id", "pref_rank"]].head(20).to_dict(orient="records")

    report = {
        "total_placed": int(total_placed),
        "pct_first_choice": pct_first,
        "pct_top3": pct_top3,
        "pct_top5": pct_top5,
        "pct_outside_preferences": pct_outside,
        "counts": {
            "first_choice": first_choice_count,
            "top3": top3_count,
            "top5": top5_count,
            "outside": outside_count
        },
        "example_table": example
    }

    if out_path:
        _write_reports(report, out_path)

    return report


def _write_reports(report: dict, out_path: str):
    """
    Internal helper to write JSON + CSV (CSV contains example_table rows).
    If out_path is a directory, files are created inside it.
    If out_path ends with .json or .csv the base directory is used to derive the other filename.
    """
    # Determine folder and filenames
    if out_path.endswith(".json"):
        folder = os.path.dirname(out_path) or "."
        json_path = out_path
        csv_path = os.path.join(folder, "preference_satisfaction.csv")
    elif out_path.endswith(".csv"):
        folder = os.path.dirname(out_path) or "."
        csv_path = out_path
        json_path = os.path.join(folder, "preference_satisfaction.json")
    else:
        # treat out_path as directory
        folder = out_path
        os.makedirs(folder, exist_ok=True)
        json_path = os.path.join(folder, "preference_satisfaction.json")
        csv_path = os.path.join(folder, "preference_satisfaction.csv")

    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Write example table to CSV if present
    example = report.get("example_table", [])
    if example:
        df_ex = pd.DataFrame(example)
        df_ex.to_csv(csv_path, index=False)
    else:
        # create an empty CSV with headers
        pd.DataFrame(columns=["student_id", "internship_id", "pref_rank"]).to_csv(csv_path, index=False)
