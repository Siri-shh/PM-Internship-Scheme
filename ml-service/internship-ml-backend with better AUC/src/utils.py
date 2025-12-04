import os
import json


def ensure_dirs(*paths):
    """
    Create all directories passed to this function.
    If the directory already exists, it is ignored.
    """

    for p in paths:
        if p is None:
            continue
        try:
            os.makedirs(p, exist_ok=True)
        except OSError:
            # In case of race condition between processes
            pass


def save_json(path, data):
    """
    Saves a Python dict or list into a JSON file with indentation.

    Args:
        path (str): Full file path to write.
        data (dict/list): JSON-serializable object.
    """

    folder = os.path.dirname(path)
    if folder and not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
