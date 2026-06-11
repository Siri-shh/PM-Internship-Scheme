import os
import json
import random
import pandas as pd


# ================================================================
# MAIN ALLOTMENT ENGINE
# ================================================================
def optionC_allotment_simulated_rejection(
    ranklists,
    internships_df,
    out_json_dir,
    max_rounds=8,
    default_accept_prob=0.7,
    seed=123,
):
    """
    A realistic multi-round allocation simulation engine.

    Features:
    ✔ Ranking-based offers
    ✔ Acceptance probability simulation
    ✔ Upgrades when a better preference appears later
    ✔ Per-round logging
    ✔ Returns final allocations + fairness snapshot
    """

    random.seed(seed)
    os.makedirs(out_json_dir, exist_ok=True)

    # Seats available per internship
    seats = dict(zip(internships_df["internship_id"], internships_df["capacity"]))

    # Student final outcomes
    student_alloc = {}        # sid → internship_id
    student_pref = {}         # sid → pref_rank

    # Event logs for JSON exports
    offer_events = []
    round_logs = []

    # ============================================================
    # MULTI-ROUND ALLOCATION LOOP
    # ============================================================
    for rnd in range(1, max_rounds + 1):

        offers_made = 0
        acceptances = 0
        rejections = 0
        upgrades = 0
        filled_this_round = 0

        seats_at_round_start = seats.copy()

        # ---------------------------------------------------------
        # Iterate through each internship ID
        # ---------------------------------------------------------
        for iid, ranked_list in ranklists.items():

            cap = seats.get(iid, 0)
            if cap <= 0:
                continue

            for stu in ranked_list:

                if cap <= 0:
                    break

                sid = stu["student_id"]
                stu_pref = int(stu["pref_rank"])

                # Skip if student already has a better or equal-preference seat
                if sid in student_pref and student_pref[sid] <= stu_pref:
                    continue

                # -----------------------------------------------------
                # Simulated accept/reject
                # -----------------------------------------------------
                p_accept = float(stu.get("accept_score", default_accept_prob))
                accepted = random.random() < p_accept
                offers_made += 1

                if not accepted:
                    rejections += 1
                    offer_events.append({
                        "round": rnd,
                        "student_id": sid,
                        "internship_id": iid,
                        "accepted": False,
                        "reason": "rejected_by_probability"
                    })
                    continue

                # -----------------------------------------------------
                # If accepted → check upgrade case
                # -----------------------------------------------------
                previous_assignment = student_alloc.get(sid)
                previous_pref = student_pref.get(sid, 999)

                if previous_assignment is not None:
                    if stu_pref < previous_pref:
                        upgrades += 1
                        # Release old seat
                        seats[previous_assignment] += 1
                    else:
                        # Not a better preference → skip
                        continue

                # Assign new internship
                student_alloc[sid] = iid
                student_pref[sid] = stu_pref

                cap -= 1
                seats[iid] = cap

                acceptances += 1
                filled_this_round += 1

                offer_events.append({
                    "round": rnd,
                    "student_id": sid,
                    "internship_id": iid,
                    "accepted": True,
                    "final_score": float(stu.get("final_score", 0)),
                    "pref_rank": stu_pref
                })

        # Save per-round stat
        round_logs.append({
            "round": rnd,
            "offers_made": offers_made,
            "acceptances": acceptances,
            "rejections": rejections,
            "upgrades": upgrades,
            "seats_filled_this_round": filled_this_round,
            "seats_available_at_start": seats_at_round_start,
        })

        # Stop if no seats filled this round → stable
        if filled_this_round == 0:
            break

    # ============================================================
    # Convert final allocations → DataFrame
    # ============================================================
    final_rows = []
    for sid, iid in student_alloc.items():
        final_rows.append({
            "student_id": sid,
            "internship_id": iid,
            "pref_rank": student_pref[sid],
        })

    final_df = pd.DataFrame(final_rows)

    # ============================================================
    # FAIRNESS SNAPSHOT
    # ============================================================
    fairness = _compute_fairness(final_df, ranklists)

    # ============================================================
    # Export JSON logs
    # ============================================================
    with open(os.path.join(out_json_dir, "sim_rounds.json"), "w") as f:
        json.dump(round_logs, f, indent=2)

    with open(os.path.join(out_json_dir, "sim_offer_events.json"), "w") as f:
        json.dump(offer_events, f, indent=2)

    return final_df, round_logs


# ================================================================
# FAIRNESS COMPUTATION
# ================================================================
def _compute_fairness(final_df, ranklists):

    # Flatten full pool
    full_list = []
    for lst in ranklists.values():
        full_list.extend(lst)

    full_df = pd.DataFrame(full_list)

    # Unique applicant counts
    total_applicants = full_df["student_id"].nunique()
    total_placed = final_df["student_id"].nunique()

    # Category statistics
    cat_stats = {}
    for cat in ["GEN", "OBC", "SC", "ST"]:
        eligible = (full_df["reservation"] == cat).sum()
        selected = full_df.merge(final_df, on="student_id")["reservation"].eq(cat).sum()

        cat_stats[cat] = {
            "eligible": int(eligible),
            "selected": int(selected),
            "rate": (selected / eligible) if eligible > 0 else 0,
        }

    # Gender stats
    merged = full_df.merge(final_df, on="student_id")
    gender_counts = merged["gender"].value_counts().to_dict()

    # Rural stats
    rural_eligible = (full_df["rural"] == 1).sum()
    rural_selected = merged["rural"].eq(1).sum()

    return {
        "total_applicants": int(total_applicants),
        "total_placed": int(total_placed),
        "placement_rate": total_placed / total_applicants if total_applicants else 0,
        "category_stats": cat_stats,
        "gender_counts_selected": {k: int(v) for k, v in gender_counts.items()},
        "rural": {
            "eligible": int(rural_eligible),
            "selected": int(rural_selected)
        }
    }
