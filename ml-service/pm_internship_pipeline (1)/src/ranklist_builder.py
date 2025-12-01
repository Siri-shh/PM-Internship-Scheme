import pandas as pd

def build_ranklists(pairs_df, internships_df):
    """
    Build ranklists for each internship:
    - SC
    - ST
    - OBC
    - UR (all categories)
    - RURAL (horizontal)
    
    Each entry in ranklist is a dict:
    {
        student_id,
        final_score,
        reservation,
        rural,
        gender
    }
    """

    ranklists = {}

    for _, row in internships_df.iterrows():
        iid = row["internship_id"]

        # all pairs for this internship
        sub = pairs_df[pairs_df["internship_id"] == iid].copy()

        # sort by score descending
        sub = sub.sort_values(by="final_score", ascending=False)

        # helper: convert to structured dict
        def make_struct(df):
            return [
                {
                    "student_id": r["student_id"],
                    "final_score": r["final_score"],
                    "reservation": r["reservation"],
                    "rural": r["rural"],
                    "gender": r["gender"]
                }
                for _, r in df.iterrows()
            ]

        # vertical lists (strict categories)
        rl_sc = sub[sub["reservation"] == "SC"]
        rl_st = sub[sub["reservation"] == "ST"]
        rl_obc = sub[sub["reservation"] == "OBC"]

        # UR list = all categories (no restriction)
        rl_ur = sub.copy()

        # horizontal RURAL
        rl_rural = sub[sub["rural"] == 1]

        ranklists[iid] = {
            "SC": make_struct(rl_sc),
            "ST": make_struct(rl_st),
            "OBC": make_struct(rl_obc),
            "UR": make_struct(rl_ur),
            "RURAL": make_struct(rl_rural)
        }

    return ranklists
