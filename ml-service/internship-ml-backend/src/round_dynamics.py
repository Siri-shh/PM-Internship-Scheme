import os
import json
import pandas as pd


def analyze_round_dynamics(round_logs, out_path):
    """
    Converts multi-round logs into a clean analytics summary:
        - offers per round
        - acceptance rates
        - upgrade counts
        - fill speed
    Automatically handles missing keys safely.
    """

    if not round_logs:
        return {"error": "No round logs found."}

    # Convert list of dicts → DataFrame
    df = pd.DataFrame(round_logs)

    # Required columns (safe default = 0)
    numeric_cols = [
        "offers_made",
        "acceptances",
        "rejections",
        "upgrades",
        "seats_filled_this_round"
    ]

    # Ensure all numeric columns exist
    for col in numeric_cols:
        if col not in df.columns:
            df[col] = 0  # missing → treat as zero

        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Compute acceptance rate
    df["accept_rate"] = df.apply(
        lambda row: row["acceptances"] / row["offers_made"]
        if row["offers_made"] > 0 else 0,
        axis=1
    )

    # Compute rejection rate
    df["reject_rate"] = df.apply(
        lambda row: row["rejections"] / row["offers_made"]
        if row["offers_made"] > 0 else 0,
        axis=1
    )

    # Seats filled trend
    df["cumulative_filled"] = df["seats_filled_this_round"].cumsum()

    summary = {
        "rounds": len(df),
        "total_offers": int(df["offers_made"].sum()),
        "total_acceptances": int(df["acceptances"].sum()),
        "total_rejections": int(df["rejections"].sum()),
        "total_upgrades": int(df["upgrades"].sum()),
        "acceptance_rate_overall": float(
            df["acceptances"].sum() / df["offers_made"].sum()
        ) if df["offers_made"].sum() > 0 else 0,
        "round_level_details": df.to_dict(orient="records")
    }

    # Save JSON output
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path + ".json", "w") as f:
        json.dump(summary, f, indent=2)

    return summary
