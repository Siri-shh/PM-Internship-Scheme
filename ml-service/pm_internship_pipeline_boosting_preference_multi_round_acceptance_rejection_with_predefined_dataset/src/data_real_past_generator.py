"""
data_real_past_generator.py

Generates pseudo historical match/accept data
from REAL students.csv and internships.csv.

Used because the real system lacks past training records.
This allows ML models to learn approximate behavior.
"""

import random
import pandas as pd


def generate_pseudo_past_data(students_df, internships_df, n_samples=5000):
    """
    Generates synthetic past pairs using real student/internship data.

    Params:
        students_df: DataFrame of real students
        internships_df: DataFrame of real internships
        n_samples: number of past training samples

    Returns:
        DataFrame with fields:
            student_id
            internship_id
            skills
            req_skills_job
            gpa
            stipend_internship
            reservation
            gender
            rural
            match
            accept
    """

    rows = []

    student_ids = students_df["student_id"].tolist()
    internship_ids = internships_df["internship_id"].tolist()

    for _ in range(n_samples):
        sid = random.choice(student_ids)
        iid = random.choice(internship_ids)

        s = students_df[students_df["student_id"] == sid].iloc[0]
        j = internships_df[internships_df["internship_id"] == iid].iloc[0]

        # Convert skills to sets for overlap
        sskills = set(str(s.get("skills", "")).split())
        jskills = set(str(j.get("req_skills", "")).split())

        overlap = len(sskills.intersection(jskills))

        # base matching probability:
        base_prob = (
            overlap * 0.15 +                 # skill overlap
            max(0, (s.get("gpa", 6) - 5) * 0.05)  # good GPA helps
        )

        base_prob = max(0.01, min(base_prob, 0.9))

        match = int(random.random() < base_prob)

        # acceptance probability if matched
        accept = int(match and (random.random() < 0.7))

        rows.append({
            "student_id": sid,
            "internship_id": iid,
            "skills": s.get("skills", ""),
            "req_skills_job": j.get("req_skills", ""),
            "gpa": s.get("gpa", 0.0),
            "stipend_internship": j.get("stipend", 0.0),
            "reservation": s.get("reservation", "GEN"),
            "gender": s.get("gender", "M"),
            "rural": s.get("rural", 0),
            "match": match,
            "accept": accept,
        })

    return pd.DataFrame(rows)
