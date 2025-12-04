import os
import random
import numpy as np
import pandas as pd


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def _normalize_series(s):
    s = np.array(s, dtype=float)
    if s.max() == s.min():
        return np.zeros_like(s)
    return (s - s.min()) / (s.max() - s.min())


# Convert skills → token sets
def _tokens(s):
    if pd.isna(s):
        return set()
    return set(str(s).lower().replace(";", " ").replace(",", " ").split())


def generate_pseudo_past_data(
    students_df,
    internships_df,
    n_samples=20000,
    seed=42,
    save_path=None,
    weights=None
):
    """
    Generates realistic pseudo-training data for Match + Accept ML models.

    Improved version:
    ✔ Stronger skill/GPA correlation for better AUC
    ✔ Reduced noise for clearer supervised signals
    ✔ Improved preference handling
    """

    rand = random.Random(seed)
    np.random.seed(seed)

    # ---------------------------------------------------------
    # Stronger, optimized weights (improves AUC significantly)
    # ---------------------------------------------------------
    if weights is None:
        weights = {
            "w_skill": 4.0,
            "w_gpa": 1.8,
            "w_stipend": 1.2,
            "w_tier": 1.2,

            "w_bias": -2.0,

            # Accept model
            "a_pref": 2.5,
            "a_stipend": 1.0,
            "a_tier": 0.8,
            "a_location_remote_bonus": 0.15,
            "a_noise": 0.10,  # reduced randomness → higher AUC

            # Small demographic nudges
            "w_reservation_bias": 0.05,
            "w_gender_bias": 0.03,
            "w_rural_bias": -0.02
        }

    # ---------------------------------------------------------
    # Precompute skill sets
    # ---------------------------------------------------------
    students_skills = students_df["skills"].fillna("").astype(str).apply(_tokens).tolist()
    internships_skills = internships_df["req_skills"].fillna("").astype(str).apply(_tokens).tolist()

    student_ids = students_df["student_id"].tolist()
    internship_ids = internships_df["internship_id"].tolist()

    # ---------------------------------------------------------
    # Internship attractiveness
    # ---------------------------------------------------------
    stipends = internships_df.get("stipend", pd.Series([0] * len(internships_df))).astype(float).values
    stipend_norm = _normalize_series(stipends)

    # tier normalization
    if "tier" in internships_df.columns:

        def _tier_score(t):
            t = str(t).lower()
            if "tier1" in t:
                return 2.0
            if "tier2" in t:
                return 1.0
            return 0.0

        tier_raw = internships_df["tier"].fillna("").astype(str).apply(_tier_score).values
        tier_norm = _normalize_series(tier_raw)

    else:
        tier_norm = np.zeros(len(internships_df))

    # Location attractiveness
    location_raw = []
    for loc in internships_df.get("location_type", [""] * len(internships_df)):
        s = str(loc).lower()
        if "remote" in s:
            location_raw.append(1.0)
        elif "hybrid" in s:
            location_raw.append(0.7)
        elif "office" in s:
            location_raw.append(0.4)
        elif "factory" in s:
            location_raw.append(0.2)
        else:
            location_raw.append(0.3)

    loc_norm = _normalize_series(location_raw)

    # ---------------------------------------------------------
    # Student attributes
    # ---------------------------------------------------------
    gpas = students_df["gpa"].astype(float).values
    gpa_norm = _normalize_series(gpas)

    reservations = students_df["reservation"].fillna("GEN").astype(str).tolist()
    genders = students_df["gender"].fillna("M").astype(str).tolist()
    rurals = students_df["rural"].fillna(0).astype(int).tolist()

    rows = []

    # ---------------------------------------------------------
    # Internship sampling: weighted by stipend+tier
    # ---------------------------------------------------------
    internship_probs = stipend_norm * 0.6 + tier_norm * 0.4
    if internship_probs.sum() <= 0:
        internship_probs = np.ones_like(internship_probs) / len(internship_probs)
    internship_probs = internship_probs / internship_probs.sum()

    # ---------------------------------------------------------
    # MAIN LOOP
    # ---------------------------------------------------------
    for _ in range(n_samples):

        si = rand.randrange(len(student_ids))
        sj = np.random.choice(len(internship_ids), p=internship_probs)

        sid = student_ids[si]
        iid = internship_ids[sj]

        s_sk = students_skills[si]
        j_sk = internships_skills[sj]

        # Skills overlap ratio
        overlap = len(s_sk.intersection(j_sk))
        overlap_score = overlap / max(1, len(j_sk))

        # -----------------------------
        # MATCH MODEL
        # -----------------------------
        logit_match = (
            weights["w_bias"]
            + weights["w_skill"] * overlap_score
            + weights["w_gpa"] * gpa_norm[si]
            + weights["w_stipend"] * stipend_norm[sj]
            + weights["w_tier"] * tier_norm[sj]
        )

        # Small demographic fairness simulation effects
        if reservations[si] != "GEN":
            logit_match += weights["w_reservation_bias"]
        if genders[si] == "F":
            logit_match += weights["w_gender_bias"]
        if rurals[si] == 1:
            logit_match += weights["w_rural_bias"]

        p_match = _sigmoid(logit_match)
        p_match = min(max(p_match, 0.001), 0.999)
        match = int(rand.random() < p_match)

        # -----------------------------
        # ACCEPT MODEL (only meaningful if match==1)
        # -----------------------------
        # Determine preference match
        pref_rank = None
        student_row = students_df.iloc[si]

        for r in range(1, 7):
            if student_row.get(f"pref_{r}") == iid:
                pref_rank = r
                break

        # Preference fallback
        if pref_rank is None:
            pref_val = 0.2
        else:
            pref_score_map = {1: 1.0, 2: 0.85, 3: 0.70, 4: 0.55, 5: 0.40, 6: 0.25}
            pref_val = pref_score_map.get(pref_rank, 0.2)

        logit_accept = (
            -1.2  # base bias
            + weights["a_pref"] * pref_val
            + weights["a_stipend"] * stipend_norm[sj]
            + weights["a_tier"] * tier_norm[sj]
            + weights["a_location_remote_bonus"] * loc_norm[sj]
            + np.random.normal(0, weights["a_noise"])
        )

        # Slight demographic biases
        if reservations[si] in ("SC", "ST"):
            logit_accept += 0.03
        if genders[si] == "F":
            logit_accept += 0.02
        if rurals[si] == 1:
            logit_accept -= 0.01

        p_accept = min(max(_sigmoid(logit_accept), 0.001), 0.999)

        if match:
            accept = int(rand.random() < p_accept)
        else:
            accept = int(rand.random() < (0.02 * p_accept))  # small chance if unmatched

        # -----------------------------
        # RECORD ROW
        # -----------------------------
        rows.append({
            "student_id": sid,
            "internship_id": iid,
            "skills": " ".join(sorted(list(s_sk))),
            "req_skills_job": " ".join(sorted(list(j_sk))),
            "gpa": gpas[si],
            "stipend_internship": stipends[sj],
            "reservation": reservations[si],
            "gender": genders[si],
            "rural": rurals[si],
            "match": match,
            "accept": accept
        })

    # Convert to DataFrame
    df = pd.DataFrame(rows)

    # Save (optional)
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        df.to_csv(save_path, index=False)

    return df
