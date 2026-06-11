import os
import json
import pandas as pd


def build_sector_fairness_report(
    final_alloc_df: pd.DataFrame,
    students_df: pd.DataFrame,
    internships_df: pd.DataFrame,
    out_path: str = None
):
    """
    Build sector-wise allocation and fairness metrics.

    Inputs:
        final_alloc_df : DataFrame containing final allocations:
            - student_id
            - internship_id
            - pref_rank (optional)

        students_df : Full student dataset:
            - student_id
            - reservation
            - gender
            - rural

        internships_df:
            - internship_id
            - sector

        out_path : folder or file name base to store JSON + CSV

    Returns:
        A dictionary with sector-level metrics:
            - total placed in each sector
            - reservation/gender/rural breakdown
            - placement rate
            - demand vs capacity (if needed)
            - top sectors by representation
    """

    # Validate
    if "internship_id" not in final_alloc_df.columns:
        raise KeyError("final_alloc_df must contain internship_id")

    if "sector" not in internships_df.columns:
        raise KeyError("internships_df must contain sector column")

    # Merge allocations with sector & student attributes
    merged = final_alloc_df.merge(
        internships_df[["internship_id", "sector"]],
        on="internship_id",
        how="left"
    ).merge(
        students_df[["student_id", "reservation", "gender", "rural"]],
        on="student_id",
        how="left"
    )

    # Group by sector
    sector_summary = {}

    for sector, group in merged.groupby("sector"):

        total_sector_placed = len(group)

        # Reservation stats
        reservation_breakdown = (
            group["reservation"].value_counts().to_dict()
        )
        reservation_breakdown = {k: int(v) for k, v in reservation_breakdown.items()}

        # Gender stats
        gender_breakdown = (
            group["gender"].value_counts().to_dict()
        )
        gender_breakdown = {k: int(v) for k, v in gender_breakdown.items()}

        # Rural stats
        rural_count = int((group["rural"] == 1).sum())

        # Eligible students for this sector (those who have it in prefs)
        # OPTIONAL: advanced — for now, we use student count as base
        eligible_count = len(students_df)

        placement_rate = round(total_sector_placed / eligible_count, 4)

        sector_summary[sector] = {
            "placed": int(total_sector_placed),
            "reservation": reservation_breakdown,
            "gender": gender_breakdown,
            "rural_placed": rural_count,
            "placement_rate": placement_rate,
        }

    # Create output dict
    report = {
        "total_sectors": len(sector_summary),
        "sector_stats": sector_summary
    }

    # Save if needed
    if out_path:
        folder = out_path if not out_path.endswith(".json") else os.path.dirname(out_path)
        if folder:
            os.makedirs(folder, exist_ok=True)

        json_path = out_path if out_path.endswith(".json") else os.path.join(folder, "sector_fairness.json")
        csv_path = os.path.join(folder, "sector_fairness.csv")

        # Save JSON
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Save CSV
        rows = []
        for sector, stats in sector_summary.items():
            row = {"sector": sector, **stats}
            rows.append(row)
        pd.DataFrame(rows).to_csv(csv_path, index=False)

    return report
