import pandas as pd

# ---------------------------------------------------------
# Boosting Parameters (can be tuned easily)
# ---------------------------------------------------------

RESERVATION_BOOST = {
    "GEN": 0.00,
    "OBC": 0.03,
    "SC": 0.05,
    "ST": 0.07
}

RURAL_BOOST = 0.03
FEMALE_BOOST = 0.03

# Soft preference scaling
PREF_SCORES = {
    1: 1.00,
    2: 0.85,
    3: 0.70,
    4: 0.55,
    5: 0.40,
    6: 0.25,
    7: 0.20,   # fallback if not in top-6
}


# ---------------------------------------------------------
# Build Ranklists
# ---------------------------------------------------------
def build_ranklists(scored_pairs_df: pd.DataFrame, internships_df: pd.DataFrame):
    """
    Input:
        scored_pairs_df → DataFrame containing:
            student_id, internship_id, match_score, accept_score, pref_rank
            reservation, gender, rural, boosted_score(optional)

    Output:
        dict: { internship_id : [ { student info + score }, ... ] }
    """

    required = [
        "student_id",
        "internship_id",
        "match_score",
        "accept_score",
        "pref_rank",
        "reservation",
        "gender",
        "rural"
    ]

    for c in required:
        if c not in scored_pairs_df.columns:
            raise KeyError(f"ranklist_builder missing required column '{c}'")

    ranklists = {}

    # Group per internship
    for iid, subdf in scored_pairs_df.groupby("internship_id"):

        df = subdf.copy()   # avoid SettingWithCopy issues

        # -----------------------------------------------------
        # Apply boosts
        # -----------------------------------------------------
        df["reserv_boost"] = df["reservation"].map(RESERVATION_BOOST).fillna(0.0)
        df["gender_boost"] = df["gender"].apply(lambda g: FEMALE_BOOST if g == "F" else 0.0)
        df["rural_boost"] = df["rural"].apply(lambda r: RURAL_BOOST if int(r) == 1 else 0.0)

        # Preference score (ensure int)
        df["pref_rank"] = df["pref_rank"].astype(int)
        df["pref_score"] = df["pref_rank"].apply(lambda r: PREF_SCORES.get(r, 0.20))

        # -----------------------------------------------------
        # FINAL SCORE LOGIC
        # -----------------------------------------------------
        # If boosting already created "boosted_score", use that as the base model score.
        if "boosted_score" in df.columns:
            base_score = df["boosted_score"]
        else:
            base_score = df["match_score"] * df["accept_score"]

        df["final_score"] = (
            base_score * df["pref_score"]
            + df["reserv_boost"]
            + df["gender_boost"]
            + df["rural_boost"]
        )

        # Sort highest score first
        df = df.sort_values(by="final_score", ascending=False)

        # Keep only allocator-required fields
        ranklists[iid] = df[[
            "student_id",
            "final_score",
            "reservation",
            "gender",
            "rural",
            "pref_rank",
            "match_score",
            "accept_score",
        ]].to_dict(orient="records")

    print(f"Ranklists built for {len(ranklists)} internships.")
    return ranklists
