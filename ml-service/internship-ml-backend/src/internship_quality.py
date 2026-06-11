import os
import json
import pandas as pd


def compute_internship_quality_scores(
    pairs_df: pd.DataFrame,
    final_alloc_df: pd.DataFrame,
    internships_df: pd.DataFrame,
    out_path: str = None
):
    """
    Computes Internship Quality Score using:

    - Demand Score (students selecting it in any preference)
    - Preference-Weighted Demand Score (pref_1=1.0, pref_2=0.85, ...)
    - ML Match Quality Score (mean match_score)
    - ML Accept Quality Score (mean accept_score)
    - Final Allocation Popularity (placements count)
    - Composite Quality Score (0–100 scaled)

    Inputs:
        pairs_df: all candidate-internship pairs (must include match_score, accept_score, pref_rank)
        final_alloc_df: final allocations (student_id, internship_id)
        internships_df: internship details (internship_id, sector, capacity)

    Output:
        report (dict): quality scores for each internship
        Saves JSON + CSV if out_path provided
    """

    # ---------------------------------------------------------------------
    # PREPARE — ensure required columns exist
    # ---------------------------------------------------------------------
    required_pairs = ["internship_id", "match_score", "accept_score", "pref_rank"]
    for c in required_pairs:
        if c not in pairs_df.columns:
            raise KeyError(f"pairs_df must contain '{c}'")

    # Preference weights (same used in ranklists)
    PREF_SCORES = {
        1: 1.00,
        2: 0.85,
        3: 0.70,
        4: 0.55,
        5: 0.40,
        6: 0.25,
        7: 0.20,
    }

    pairs_df["pref_rank"] = pd.to_numeric(pairs_df["pref_rank"], errors="coerce").fillna(7).astype(int)
    pairs_df["pref_weight"] = pairs_df["pref_rank"].apply(lambda r: PREF_SCORES.get(r, 0.20))

    # ---------------------------------------------------------------------
    # COMPUTE SIGNALS
    # ---------------------------------------------------------------------

    summary = {}

    for iid, grp in pairs_df.groupby("internship_id"):

        demand = grp["student_id"].nunique()

        pref_weighted_demand = grp["pref_weight"].sum()

        match_quality = grp["match_score"].mean()
        accept_quality = grp["accept_score"].mean()

        # Final allocations count
        placements = final_alloc_df[final_alloc_df["internship_id"] == iid].shape[0]

        summary[iid] = {
            "demand_raw": int(demand),
            "pref_weighted_demand": float(round(pref_weighted_demand, 4)),
            "avg_match_score": float(round(match_quality, 4)),
            "avg_accept_score": float(round(accept_quality, 4)),
            "placements": int(placements)
        }

    # ---------------------------------------------------------------------
    # NORMALIZE INTO A QUALITY SCORE (0–100)
    # ---------------------------------------------------------------------

    df = pd.DataFrame.from_dict(summary, orient="index")

    # Normalize signals
    def normalize(series):
        if series.max() == series.min():
            return [0] * len(series)
        return (series - series.min()) / (series.max() - series.min())

    df["norm_demand"] = normalize(df["demand_raw"])
    df["norm_pref_demand"] = normalize(df["pref_weighted_demand"])
    df["norm_match"] = normalize(df["avg_match_score"])
    df["norm_accept"] = normalize(df["avg_accept_score"])
    df["norm_placements"] = normalize(df["placements"])

    # Weighting for final composite score
    df["quality_score"] = (
        0.25 * df["norm_demand"] +
        0.20 * df["norm_pref_demand"] +
        0.25 * df["norm_match"] +
        0.15 * df["norm_accept"] +
        0.15 * df["norm_placements"]
    ) * 100

    df = df.sort_values("quality_score", ascending=False)

    # Final output dictionary
    report = df.round(4).to_dict(orient="index")

    # ---------------------------------------------------------------------
    # SAVE IF NEEDED
    # ---------------------------------------------------------------------
    if out_path:
        folder = out_path if not out_path.endswith(".json") else os.path.dirname(out_path)
        if folder:
            os.makedirs(folder, exist_ok=True)

        json_path = out_path if out_path.endswith(".json") else os.path.join(folder, "internship_quality.json")
        csv_path = os.path.join(folder, "internship_quality.csv")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        df.to_csv(csv_path, index=True)

    return report
