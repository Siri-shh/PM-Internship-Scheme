import os
import pandas as pd


def export_allocations_csv(allocations, students_df, internships_df, out_dir):
    """
    Convert allocation dictionary into a clean CSV.
    """
    rows = []
    for internship_id, assigned_list in allocations.items():
        for position, rec in enumerate(assigned_list, start=1):
            student_id = rec['student_id']
            category = rec.get('category')
            s = students_df[students_df['student_id'] == student_id]
            if len(s) == 0:
                continue
            s = s.iloc[0]
            i = internships_df[internships_df['internship_id'] == internship_id]
            if len(i) == 0:
                continue
            i = i.iloc[0]
            rows.append({
                'internship_id': internship_id,
                'student_id': student_id,
                'category_allotted': category,
                'round_position': position,
                'gpa': s['gpa'],
                'reservation': s['reservation'],
                'rural': s['rural'],
                'gender': s['gender'],
                'sector': i['sector'],
                'stipend': i['stipend'],
                'location_type': i['location_type'],
                'final_score': rec.get('final_score')
            })

    df = pd.DataFrame(rows)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "final_allocations.csv")
    df.to_csv(out_path, index=False)
    print("Final allocation file saved at:", out_path)
    return df
