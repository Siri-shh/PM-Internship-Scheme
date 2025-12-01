import json
import os

def optionC_allotment(ranklists, internships_df, out_json_dir):
    """
    Government-Style Reservation:
    - Fill vertical seats (SC, ST, OBC, UR)
    - Apply horizontal RURAL inside same capacity
    - No seat inflation: filled ≤ capacity ALWAYS
    """

    final_alloc = {}
    round_logs = []

    for _, row in internships_df.iterrows():
        iid = row["internship_id"]
        cap = row["capacity"]

        cap_sc = row["cap_sc"]
        cap_st = row["cap_st"]
        cap_obc = row["cap_obc"]
        cap_ur = row["cap_ur"]
        cap_rural = row["cap_rural"]

        rl = ranklists[iid]

        ######################################################################
        # STEP 1: Fill vertical seats
        ######################################################################
        selected = []

        # SC
        for s in rl["SC"]:
            if len(selected) < cap_sc:
                selected.append(s)

        # ST
        for s in rl["ST"]:
            if len(selected) < cap_sc + cap_st:
                selected.append(s)

        # OBC
        for s in rl["OBC"]:
            if len(selected) < cap_sc + cap_st + cap_obc:
                selected.append(s)

        # UR (fills remaining)
        for s in rl["UR"]:
            if len(selected) < cap_sc + cap_st + cap_obc + cap_ur:
                selected.append(s)

        # ---------------------------
        # Remove duplicate students by student_id
        # ---------------------------
        unique = {}
        for stu in selected:
            unique[stu["student_id"]] = stu
        selected = list(unique.values())

        # Safety clamp
        selected = selected[:cap]

        ######################################################################
        # STEP 2: Apply Horizontal RURAL Quota (inside capacity)
        ######################################################################
        rural_count = sum(1 for x in selected if x["rural"] == 1)

        if rural_count < cap_rural:
            needed = cap_rural - rural_count

            # Rural candidates not yet selected
            rural_pool = [x for x in rl["RURAL"] if x["student_id"] not in {y["student_id"] for y in selected}]
            to_add = rural_pool[:needed]

            # Remove lowest-ranked non-rural candidates
            non_rural = [x for x in selected if x["rural"] == 0]
            non_rural_sorted = sorted(non_rural, key=lambda x: x["final_score"])

            to_remove = non_rural_sorted[:needed]

            # Replace
            for r in to_remove:
                selected = [x for x in selected if x["student_id"] != r["student_id"]]

            for a in to_add:
                if len(selected) < cap:
                    selected.append(a)

        # Final clamp
        selected = selected[:cap]

        # Save final allocations for this internship
        final_alloc[iid] = selected

        # Round log
        round_logs.append({
            "internship_id": iid,
            "capacity": cap,
            "selected_count": len(selected),
            "vertical_caps": {
                "SC": cap_sc, "ST": cap_st, "OBC": cap_obc, "UR": cap_ur
            },
            "rural_cap": cap_rural,
            "rural_selected": sum(1 for x in selected if x["rural"] == 1)
        })

    ######################################################################
    # SAVE JSON LOGS
    ######################################################################
    os.makedirs(out_json_dir, exist_ok=True)

    with open(os.path.join(out_json_dir, "optionC_roundwise.json"), "w") as f:
        json.dump(round_logs, f, indent=4)

    # Save final result as JSON
    final_json = {}
    for iid, selected_list in final_alloc.items():
        final_json[iid] = []
        for s in selected_list:
            final_json[iid].append({
                "student_id": s["student_id"],
                "final_score": float(s["final_score"]),
                "reservation": s["reservation"],
                "rural": int(s["rural"]),
                "gender": s["gender"]
            })

    with open(os.path.join(out_json_dir, "optionC_final_allocations.json"), "w") as f:
        json.dump(final_json, f, indent=4)

    return final_alloc
