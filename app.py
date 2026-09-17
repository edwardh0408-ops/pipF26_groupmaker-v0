"""GroupMaker v0 — backend.

Serves the roster, randomizes groups, and (in production) serves the
built frontend from frontend/dist.
"""

import csv
import json
import os
import random
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "roster.json")
SURVEY_FILE = os.path.join(os.path.dirname(__file__), "data", "survey_responses.csv")

SURVEY_COLUMNS = ["name", "school_year", "working_style", "interest"]
SCHOOL_YEARS = {"First-year", "Sophomore", "Junior", "Senior", "Other"}

app = Flask(__name__, static_folder=None)


def load_roster():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/roster")
def get_roster():
    return jsonify(load_roster())


@app.post("/api/groups/randomize")
def randomize_groups():
    body = request.get_json(silent=True) or {}
    group_size = int(body.get("group_size", 4))
    group_size = max(2, min(group_size, 10))

    students = load_roster()["students"]
    random.shuffle(students)

    groups = [students[i : i + group_size] for i in range(0, len(students), group_size)]

    # Fold a too-small last group into the others, one member each.
    if len(groups) > 1 and len(groups[-1]) < max(2, group_size - 1):
        leftovers = groups.pop()
        for i, student in enumerate(leftovers):
            groups[i % len(groups)].append(student)

    return jsonify({"groups": [{"number": i + 1, "members": g} for i, g in enumerate(groups)]})


@app.post("/api/survey")
def submit_survey():
    body = request.get_json(silent=True) or {}
    roster_names = {s["name"] for s in load_roster()["students"]}

    missing = [col for col in SURVEY_COLUMNS if not str(body.get(col, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    name = str(body["name"]).strip()
    school_year = str(body["school_year"]).strip()
    working_style = str(body["working_style"]).strip()
    interest = str(body["interest"]).strip()

    if name not in roster_names:
        return jsonify({"error": "Name must match a student on the roster"}), 400
    if school_year not in SCHOOL_YEARS:
        return jsonify({"error": "Invalid school year"}), 400

    write_header = not os.path.isfile(SURVEY_FILE)
    os.makedirs(os.path.dirname(SURVEY_FILE), exist_ok=True)
    with open(SURVEY_FILE, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow([*SURVEY_COLUMNS, "submitted_at"])
        writer.writerow(
            [
                name,
                school_year,
                working_style,
                interest,
                datetime.now(timezone.utc).isoformat(),
            ]
        )

    return jsonify({"ok": True})


# ---- Serve the built frontend (production) ----------------------------------
# In development you won't use these routes: Vite serves the frontend at
# localhost:5173 and proxies /api requests here.


@app.get("/")
def index():
    return send_from_directory(DIST_DIR, "index.html")


@app.get("/<path:path>")
def assets(path):
    full = os.path.join(DIST_DIR, path)
    if os.path.isfile(full):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
