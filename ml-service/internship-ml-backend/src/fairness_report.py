import pandas as pd


def build_fairness_report(
    final_alloc_df,
    students_df,
    round_logs
):
    """
    Builds an easy-to-explain fairness report.

    final_alloc_df : DataFrame of placed students
    students_df     : Full dataset
    round_logs      : Allocation simulation round-wise logs

    Output dictionary:
        - total applicants
        - total placed
        - placement rate
        - category-wise stats
        - gender distribution
        - rural fairness
        - simulation round logs
    """

    # -----------------------------------------------------
    # BASIC STATS
    # -----------------------------------------------------
    placed_students = final_alloc_df["student_id"].unique().tolist()
    total_placed = len(placed_students)
    total_applicants = len(students_df)

    # Only placed student rows
    placed_df = students_df[students_df["student_id"].isin(placed_students)].copy()

    # -----------------------------------------------------
    # CATEGORY-WISE FAIRNESS
    # -----------------------------------------------------
    category_stats = {}

    for cat in ["GEN", "OBC", "SC", "ST"]:
        eligible = students_df[students_df["reservation"] == cat].shape[0]
        placed = placed_df[placed_df["reservation"] == cat].shape[0]

        category_stats[cat] = {
            "eligible": int(eligible),
            "placed": int(placed),
            "placement_rate": round(placed / eligible, 4) if eligible > 0 else 0.0
        }

    # -----------------------------------------------------
    # GENDER FAIRNESS
    # -----------------------------------------------------
    gender_counts = placed_df["gender"].value_counts().to_dict()
    gender_counts = {k: int(v) for k, v in gender_counts.items()}

    # -----------------------------------------------------
    # RURAL FAIRNESS
    # -----------------------------------------------------
    rural_eligible = students_df[students_df["rural"] == 1].shape[0]
    rural_placed = placed_df[placed_df["rural"] == 1].shape[0]

    rural_stats = {
        "eligible": int(rural_eligible),
        "placed": int(rural_placed),
        "placement_rate": (
            round(rural_placed / rural_eligible, 4)
            if rural_eligible > 0 else 0.0
        )
    }

    # -----------------------------------------------------
    # FINAL REPORT
    # -----------------------------------------------------
    report = {
        "total_applicants": int(total_applicants),
        "total_placed": int(total_placed),
        "placement_rate": round(total_placed / total_applicants, 4)
                           if total_applicants > 0 else 0.0,

        "category_wise": category_stats,
        "gender_wise": gender_counts,
        "rural": rural_stats,

        "round_stats": round_logs
    }

    return report
