import random
import pandas as pd
import numpy as np

################################################################################
# DATA GENERATOR V2 — REALISTIC STUDENTS + INTERNSHIPS
################################################################################

random.seed(42)
np.random.seed(42)

SECTORS = ["IT", "Finance", "Mechanical", "Civil", "Electronics", "Marketing"]

ALL_SKILLS = [
    "python", "sql", "ml", "excel", "java", "communication",
    "design", "networking", "cloud", "frontend", "backend",
    "writing", "presentation", "analysis", "autocad", "manufacturing"
]

RESERVATION_CATEGORIES = ["GEN", "OBC", "SC", "ST"]
GENDER = ["M", "F"]

################################################################################
# GENERATE INTERNSHIPS
################################################################################
def generate_internships(n):
    internships = []

    for i in range(n):
        internship_id = f"I{str(i+1).zfill(3)}"

        # City Tier (affects preference & acceptance probability)
        tier = random.choices(
            ["Tier1", "Tier2", "Tier3"],
            weights=[0.5, 0.3, 0.2]
        )[0]

        # Workplace Environment (Office, Factory, Remote)
        location_type = random.choices(
            ["Office", "Factory", "Remote"],
            weights=[0.6, 0.25, 0.15]
        )[0]

        # Stipend = 4500 + addons
        stipend = 4500 + random.choice([0, 500, 1000])

        # Seat capacity & reservation splits
        cap = random.randint(5, 20)
        cap_sc = max(1, cap // 10)
        cap_st = max(1, cap // 20)
        cap_obc = max(1, cap // 6)
        cap_ur = cap - (cap_sc + cap_st + cap_obc)

        cap_rural = max(1, cap // 5)

        req_skills = " ".join(random.sample(ALL_SKILLS, random.randint(2, 5)))

        internships.append({
            "internship_id": internship_id,
            "sector": random.choice(SECTORS),
            "tier": tier,
            "location_type": location_type,
            "stipend": stipend,
            "capacity": cap,
            "cap_sc": cap_sc,
            "cap_st": cap_st,
            "cap_obc": cap_obc,
            "cap_ur": cap_ur,
            "cap_rural": cap_rural,
            "req_skills": req_skills
        })

    return pd.DataFrame(internships)


################################################################################
# GENERATE STUDENTS
################################################################################
def generate_students(n, internships_df):
    students = []

    for i in range(n):
        student_id = f"S{str(i+1).zfill(5)}"

        gpa = round(np.random.normal(7.5, 1.1), 2)
        gpa = max(5.0, min(10.0, gpa))

        # skills
        skills = " ".join(random.sample(ALL_SKILLS, random.randint(3, 6)))

        # reservation category
        reservation = random.choices(
            RESERVATION_CATEGORIES, 
            weights=[0.55, 0.27, 0.12, 0.06]
        )[0]

        # rural flag (0/1)
        rural = np.random.choice([0, 1], p=[0.7, 0.3])

        # gender
        gender = random.choice(GENDER)

        # preference assignment (skill + tier influenced)
        prefs = assign_preferences(skills, internships_df)

        student = {
            "student_id": student_id,
            "gpa": gpa,
            "skills": skills,
            "reservation": reservation,
            "rural": rural,
            "gender": gender,
        }

        # Add pref_1 to pref_6
        for k, v in prefs.items():
            student[k] = v

        students.append(student)

    return pd.DataFrame(students)


################################################################################
# CREATE REALISTIC PREFERENCES BASED ON SKILLS + TIER
################################################################################
def assign_preferences(student_skills, internships_df):
    skill_set = set(student_skills.split())

    scored = []
    for _, row in internships_df.iterrows():
        req = set(row["req_skills"].split())
        overlap = len(skill_set.intersection(req))

        tier_score = {"Tier1": 3, "Tier2": 2, "Tier3": 1}[row["tier"]]

        location_score = {
            "Office": 3,
            "Remote": 2,
            "Factory": 1
        }[row["location_type"]]

        total_score = overlap * 2 + tier_score + location_score

        scored.append((row["internship_id"], total_score))

    # sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    top = [x[0] for x in scored[:6]]

    return {
        "pref_1": top[0] if len(top) > 0 else None,
        "pref_2": top[1] if len(top) > 1 else None,
        "pref_3": top[2] if len(top) > 2 else None,
        "pref_4": top[3] if len(top) > 3 else None,
        "pref_5": top[4] if len(top) > 4 else None,
        "pref_6": top[5] if len(top) > 5 else None,
    }


################################################################################
# GENERATE HISTORICAL PAIRS (MATCH HISTORY)
################################################################################
def generate_historical_pairs(students_df, internships_df, n_pairs=3000):
    rows = []

    for _ in range(n_pairs):
        s = students_df.sample(1).iloc[0]
        i = internships_df.sample(1).iloc[0]

        skill_overlap = len(set(s["skills"].split()).intersection(set(i["req_skills"].split())))

        base_prob = 0.1 + 0.1 * skill_overlap

        # higher GPA → higher chance
        base_prob += (s["gpa"] - 6.0) * 0.05

        # location influence
        if i["location_type"] == "Office":
            base_prob += 0.05
        if i["location_type"] == "Factory":
            base_prob -= 0.05

        match = np.random.rand() < base_prob
        accept = match and (np.random.rand() < (0.4 + 0.05 * skill_overlap))

        rows.append({
            "student_id": s["student_id"],
            "internship_id": i["internship_id"],
            "skills": s["skills"],
            "req_skills": i["req_skills"],
            "gpa": s["gpa"],
            "stipend": i["stipend"],
            "match": int(match),
            "accept": int(accept)
        })

    return pd.DataFrame(rows)


################################################################################
# MAIN GENERATOR FUNCTION
################################################################################
def generate_synthetic_data(
    n_students=2000,
    n_internships=40,
    n_pairs=3000
):
    internships_df = generate_internships(n_internships)
    students_df = generate_students(n_students, internships_df)
    past_df = generate_historical_pairs(students_df, internships_df, n_pairs)
    return students_df, internships_df, past_df
