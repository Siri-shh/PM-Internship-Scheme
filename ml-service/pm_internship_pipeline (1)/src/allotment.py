import pandas as pd
from collections import defaultdict


def build_ranklists(students_df, internships_df, final_scores_df):
    """
    Build category-wise and rural-wise ranklists for each internship.
    final_scores_df contains: student_id, internship_id, final_score
    """
    merged = final_scores_df.merge(
        students_df[['student_id', 'reservation', 'rural', 'gender', 'gpa']],
        on='student_id',
        how='left'
    )

    ranklists = {}

    for _, intern in internships_df.iterrows():
        iid = intern['internship_id']

        subset = merged[merged['internship_id'] == iid].copy()
        subset = subset.sort_values('final_score', ascending=False)

        ranklists[iid] = {
            'SC': subset[subset['reservation'] == 'SC'][['student_id', 'final_score']].to_dict('records'),
            'ST': subset[subset['reservation'] == 'ST'][['student_id', 'final_score']].to_dict('records'),
            'OBC': subset[subset['reservation'] == 'OBC'][['student_id', 'final_score']].to_dict('records'),
            'UR': subset[['student_id', 'final_score']].to_dict('records'),
            'RURAL': subset[subset['rural'] == 1][['student_id', 'final_score']].to_dict('records'),
            'capacity': int(intern['capacity']),
            'cap_sc': int(intern['cap_sc']),
            'cap_st': int(intern['cap_st']),
            'cap_obc': int(intern['cap_obc']),
            'cap_ur': int(intern['cap_ur']),
            'cap_rural': int(intern['cap_rural']),
        }

    return ranklists


def multi_round_allotment(ranklists, students_pref_map, final_scores_df, max_rounds=10):
    """
    Multi-round reservation-first allotment (prototype), with round-wise logs.

    Returns:
      allocations: internship_id -> list of dicts {student_id, category, final_score}
      round_logs: list of per-round metrics and allocations
      unallocated_students: set
    """

    # helper: quick lookup of final_score per pair
    score_lookup = final_scores_df.set_index(['student_id', 'internship_id'])['final_score'].to_dict()

    allocations = {iid: [] for iid in ranklists}
    allocated_student = {}  # student_id -> internship_id

    # pointers per internship per category (index into ranklist lists)
    pointers = {iid: {'SC': 0, 'ST': 0, 'OBC': 0, 'UR': 0, 'RURAL': 0} for iid in ranklists}

    round_logs = []
    all_students = set()
    for iid, info in ranklists.items():
        for cat in ['SC', 'ST', 'OBC', 'UR', 'RURAL']:
            for rec in info[cat]:
                all_students.add(rec['student_id'])

    rounds = 0
    while rounds < max_rounds:
        rounds += 1
        round_allocated = defaultdict(list)  # iid -> list of student_ids allocated this round
        # category counters per internship for this round
        round_cat_counts = defaultdict(lambda: defaultdict(int))

        # allocate per internship
        for iid, info in ranklists.items():
            cap_sc = info['cap_sc']
            cap_st = info['cap_st']
            cap_obc = info['cap_obc']
            cap_ur = info['cap_ur']
            cap_rural = info['cap_rural']

            # SC
            while len([s for s in allocations[iid] if s['category'] == 'SC']) < cap_sc:
                lst = info['SC']
                p = pointers[iid]['SC']
                if p >= len(lst):
                    break
                cand = lst[p]['student_id']
                pointers[iid]['SC'] += 1
                if cand in allocated_student:
                    continue
                allocations[iid].append({
                    'student_id': cand,
                    'category': 'SC',
                    'final_score': score_lookup.get((cand, iid), None)
                })
                allocated_student[cand] = iid
                round_allocated[iid].append(cand)
                round_cat_counts[iid]['SC'] += 1

            # ST
            while len([s for s in allocations[iid] if s['category'] == 'ST']) < cap_st:
                lst = info['ST']
                p = pointers[iid]['ST']
                if p >= len(lst):
                    break
                cand = lst[p]['student_id']
                pointers[iid]['ST'] += 1
                if cand in allocated_student:
                    continue
                allocations[iid].append({
                    'student_id': cand,
                    'category': 'ST',
                    'final_score': score_lookup.get((cand, iid), None)
                })
                allocated_student[cand] = iid
                round_allocated[iid].append(cand)
                round_cat_counts[iid]['ST'] += 1

            # OBC
            while len([s for s in allocations[iid] if s['category'] == 'OBC']) < cap_obc:
                lst = info['OBC']
                p = pointers[iid]['OBC']
                if p >= len(lst):
                    break
                cand = lst[p]['student_id']
                pointers[iid]['OBC'] += 1
                if cand in allocated_student:
                    continue
                allocations[iid].append({
                    'student_id': cand,
                    'category': 'OBC',
                    'final_score': score_lookup.get((cand, iid), None)
                })
                allocated_student[cand] = iid
                round_allocated[iid].append(cand)
                round_cat_counts[iid]['OBC'] += 1

            # UR
            while len([s for s in allocations[iid] if s['category'] == 'UR']) < cap_ur:
                lst = info['UR']
                p = pointers[iid]['UR']
                if p >= len(lst):
                    break
                cand = lst[p]['student_id']
                pointers[iid]['UR'] += 1
                if cand in allocated_student:
                    continue
                allocations[iid].append({
                    'student_id': cand,
                    'category': 'UR',
                    'final_score': score_lookup.get((cand, iid), None)
                })
                allocated_student[cand] = iid
                round_allocated[iid].append(cand)
                round_cat_counts[iid]['UR'] += 1

            # RURAL
            while len([s for s in allocations[iid] if s['category'] == 'RURAL']) < cap_rural:
                lst = info['RURAL']
                p = pointers[iid]['RURAL']
                if p >= len(lst):
                    break
                cand = lst[p]['student_id']
                pointers[iid]['RURAL'] += 1
                if cand in allocated_student:
                    continue
                allocations[iid].append({
                    'student_id': cand,
                    'category': 'RURAL',
                    'final_score': score_lookup.get((cand, iid), None)
                })
                allocated_student[cand] = iid
                round_allocated[iid].append(cand)
                round_cat_counts[iid]['RURAL'] += 1

        # Build round summary
        total_allocated_this_round = sum(len(v) for v in round_allocated.values())
        internships_snapshot = {}
        for iid, students in round_allocated.items():
            internships_snapshot[iid] = {
                'allocated_this_round': len(students),
                'allocated_students': students,
                'category_counts': round_cat_counts[iid]
            }

        round_logs.append({
            'round': rounds,
            'total_allocated': int(total_allocated_this_round),
            'internships': internships_snapshot
        })

        # stop if nothing allocated this round
        if total_allocated_this_round == 0:
            break

    # unallocated students
    unallocated_students = list(all_students - set(allocated_student.keys()))

    return allocations, round_logs, unallocated_students
