import os
import json
import pandas as pd
from collections import Counter


def save_roundwise_json(round_logs, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "round_data.json")
    with open(path, "w") as f:
        json.dump({"rounds": round_logs}, f, indent=2)
    print("Saved round_data.json ->", path)
    return path


def save_final_allocations_json(allocations, students_df, internships_df, out_dir):
    """
    allocations: iid -> list of dicts {student_id, category, final_score}
    """
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for iid, assigned in allocations.items():
        int_row = internships_df[internships_df['internship_id'] == iid]
        if len(int_row) == 0:
            continue
        int_row = int_row.iloc[0]
        out[iid] = {
            "capacity": int(int_row['capacity']),
            "filled": len(assigned),
            "sector": int_row.get('sector', None),
            "stipend": int(int_row.get('stipend', 0)),
            "allocations": []
        }
        for rec in assigned:
            sid = rec['student_id']
            srow = students_df[students_df['student_id'] == sid]
            if len(srow) == 0:
                continue
            srow = srow.iloc[0]
            out[iid]["allocations"].append({
                "student_id": sid,
                "category": rec.get('category'),
                "final_score": rec.get('final_score'),
                "gpa": float(srow.get('gpa', None)),
                "reservation": srow.get('reservation'),
                "rural": int(srow.get('rural', 0)),
                "gender": srow.get('gender')
            })

    path = os.path.join(out_dir, "final_allocations.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print("Saved final_allocations.json ->", path)
    return path


def save_fairness_json(allocations, students_df, out_dir):
    """
    Compute:
      - SC/ST/OBC/UR selection rate parity
      - Rural representation
      - Gender distribution
    """
    os.makedirs(out_dir, exist_ok=True)

    # counts eligible per category
    eligible_counts = students_df['reservation'].value_counts().to_dict()
    # selected counts per category
    selected = []
    for iid, assigned in allocations.items():
        for rec in assigned:
            selected.append(rec['student_id'])

    selected_df = students_df[students_df['student_id'].isin(selected)]

    selected_counts = selected_df['reservation'].value_counts().to_dict()

    parity = {}
    for cat in ['SC', 'ST', 'OBC', 'GEN']:
        eligible = int(eligible_counts.get(cat, 0))
        sel = int(selected_counts.get(cat, 0))
        rate = sel / eligible if eligible > 0 else None
        parity[cat] = {"eligible": eligible, "selected": sel, "rate": rate}

    # Rural representation
    eligible_rural = int(students_df[students_df['rural'] == 1].shape[0])
    selected_rural = int(selected_df[selected_df['rural'] == 1].shape[0])
    rural_ratio = selected_rural / eligible_rural if eligible_rural > 0 else None

    # Gender distribution among selected
    gender_counts = selected_df['gender'].value_counts().to_dict()

    report = {
        "category_parity": parity,
        "rural_representation": {
            "eligible_rural": eligible_rural,
            "selected_rural": selected_rural,
            "ratio": rural_ratio
        },
        "gender_distribution_selected": gender_counts,
        "total_selected": len(selected)
    }

    path = os.path.join(out_dir, "fairness_report.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    print("Saved fairness_report.json ->", path)
    return path
