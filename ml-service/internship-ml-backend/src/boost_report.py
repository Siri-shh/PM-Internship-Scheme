import pandas as pd
import json
import os


def build_student_boost_report(
    boosted_df,
    final_alloc_df,
    out_path
):
    """
    Extended boost impact analysis.

    boosted_df must contain:
        student_id, reservation, rural, boost_amount,
        base_score, boosted_score, internship_id

    final_alloc_df must contain:
        student_id, internship_id

    Outputs:
        A JSON with the following:
            - total boosted students
            - boosted & selected counts
            - boost success rate
            - category uplift success
            - rural uplift success
            - counterfactual helped students
            - NEW: boost source contribution (caste vs rural)
            - NEW: ranking position change due to boost
            - NEW: would-have-lost-seat-without-boost list
            - NEW: internship-level uplift impact
            - NEW: top beneficiaries (sorted)
    """

    # ---------------------------------------------------------
    # Filter only boosted pairs
    # ---------------------------------------------------------
    boosted_pairs = boosted_df[boosted_df["boost_amount"] > 0].copy()

    # Compress student-level data
    student_boost = (
        boosted_pairs.groupby("student_id")
        .agg(
            max_boost_amt=("boost_amount", "max"),
            reservation=("reservation", "first"),
            rural=("rural", "first"),
            pre_boost_best=("base_score", "max"),
            post_boost_best=("boosted_score", "max")
        )
        .reset_index()
    )

    total_boosted_students = len(student_boost)

    # ---------------------------------------------------------
    # Identify selected students
    # ---------------------------------------------------------
    placed_students = set(final_alloc_df["student_id"].unique())

    boosted_selected_students = student_boost[
        student_boost["student_id"].isin(placed_students)
    ].copy()

    boosted_not_selected_students = student_boost[
        ~student_boost["student_id"].isin(placed_students)
    ].copy()

    uplift_success_count = len(boosted_selected_students)

    # Category uplift stats
    category_success = boosted_selected_students["reservation"].value_counts().to_dict()
    category_success = {k: int(v) for k, v in category_success.items()}

    rural_uplift_success = int((boosted_selected_students["rural"] == 1).sum())

    # ---------------------------------------------------------
    # Counterfactual reasoning: Did boost help?
    # ---------------------------------------------------------
    THRESH = 0.01  # if score increases > 0.01 → boost helped

    boosted_selected_students["counterfactual_helped"] = (
        boosted_selected_students["post_boost_best"]
        - boosted_selected_students["pre_boost_best"]
    ) > THRESH

    helped_count = int(boosted_selected_students["counterfactual_helped"].sum())

    # Attribution by category
    category_attribution = (
        boosted_selected_students[
            boosted_selected_students["counterfactual_helped"]
            == True
        ]["reservation"]
        .value_counts()
        .to_dict()
    )
    category_attribution = {k: int(v) for k, v in category_attribution.items()}

    rural_attribution = int(
        boosted_selected_students[
            (boosted_selected_students["counterfactual_helped"])
            & (boosted_selected_students["rural"] == 1)
        ].shape[0]
    )

    # ---------------------------------------------------------
    # NEW: Boost source attribution (caste vs rural)
    # ---------------------------------------------------------
    caste_help = int(
        boosted_selected_students[
            (boosted_selected_students["counterfactual_helped"])
            & (boosted_selected_students["reservation"].isin(["SC", "ST", "OBC"]))
        ].shape[0]
    )

    rural_help = rural_attribution

    # ---------------------------------------------------------
    # NEW: Ranking change estimation
    # ---------------------------------------------------------
    # Approximation: boost lifts ranking by Δscore relative to distribution
    student_boost["rank_improvement_estimate"] = (
        student_boost["post_boost_best"] - student_boost["pre_boost_best"]
    ) * 1000  # scaled for interpretability

    # ---------------------------------------------------------
    # NEW: Students who would have lost seats without boost
    # ---------------------------------------------------------
    counterfactual_lost_students = boosted_selected_students[
        boosted_selected_students["counterfactual_helped"] == True
    ]["student_id"].tolist()

    # ---------------------------------------------------------
    # NEW: Internship-level boost effectiveness
    # ---------------------------------------------------------
    merged = boosted_selected_students.merge(
        final_alloc_df,
        on="student_id",
        how="left"
    )

    internship_boost_stats = (
        merged.groupby("internship_id")["counterfactual_helped"]
        .sum()
        .sort_values(ascending=False)
        .astype(int)
        .to_dict()
    )

    # ---------------------------------------------------------
    # NEW: Top beneficiaries (sorted by boost amount)
    # ---------------------------------------------------------
    top_beneficiaries = (
        student_boost.sort_values(by="max_boost_amt", ascending=False)
        .head(20)
        .to_dict(orient="records")
    )

    # ---------------------------------------------------------
    # Final aggregate metrics
    # ---------------------------------------------------------
    avg_student_boost = float(student_boost["max_boost_amt"].mean())
    max_student_boost = float(student_boost["max_boost_amt"].max())
    coverage_ratio = total_boosted_students / boosted_df["student_id"].nunique()

    report = {
        "boosted_students": int(total_boosted_students),
        "boosted_selected": uplift_success_count,
        "boosted_not_selected": int(total_boosted_students - uplift_success_count),
        "uplift_success_rate": round(
            uplift_success_count / total_boosted_students, 4
        ),

        "category_uplift_success": category_success,
        "rural_uplift_success": rural_uplift_success,

        # Counterfactual metrics
        "counterfactual_helped_students": helped_count,
        "counterfactual_help_rate": round(
            helped_count / total_boosted_students, 4
        ),
        "category_counterfactual_help": category_attribution,
        "rural_counterfactual_help": rural_attribution,

        # NEW
        "boost_source_attribution": {
            "caste_helped": caste_help,
            "rural_helped": rural_help,
        },

        "avg_student_boost": round(avg_student_boost, 4),
        "max_boost_per_student": round(max_student_boost, 4),
        "coverage_ratio": round(coverage_ratio, 4),

        # NEW extended diagnostics
        "students_saved_by_boost": counterfactual_lost_students,
        "internship_boost_impact": internship_boost_stats,
        "rank_improvement_estimate": student_boost[
            ["student_id", "rank_improvement_estimate"]
        ].to_dict(orient="records"),
        "top_beneficiaries": top_beneficiaries
    }

    # Save
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)

    return report
