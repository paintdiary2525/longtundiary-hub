#!/usr/bin/env python3
"""Build episodes.json for longtundiary-hub from VIDEO_DATE_INDEX.md + raw JSON video IDs.

Reads from the LTD OS knowledge base (private) and writes the processed JSON
into ../data/episodes.json (which IS public — no private fields exposed).

Override LTD_OS_ROOT via env var if your knowledge base lives elsewhere:
    LTD_OS_ROOT=/path/to/LTD\\ OS python3 scripts/build-data.py
"""

import json
import os
import re
from pathlib import Path

DEFAULT_LTD_OS_ROOT = Path.home() / "Desktop" / "LTD OS"
LTD_OS_ROOT = Path(os.environ.get("LTD_OS_ROOT", str(DEFAULT_LTD_OS_ROOT)))
INDEX_PATH = LTD_OS_ROOT / "Knowledge" / "VIDEO_DATE_INDEX.md"
RAW_DIR = LTD_OS_ROOT / "Knowledge" / "YouTube" / "raw"

OUTPUT = Path(__file__).resolve().parent.parent / "data" / "episodes.json"


def latest_videos_json() -> Path:
    candidates = sorted(RAW_DIR.glob("*_videos.json"))
    if not candidates:
        raise SystemExit(f"No *_videos.json found in {RAW_DIR}")
    return candidates[-1]


def normalize_title(t: str) -> str:
    return t.replace("\\|", "|").strip()


def main() -> None:
    if not INDEX_PATH.exists():
        raise SystemExit(f"Could not find {INDEX_PATH}. Set LTD_OS_ROOT env var to your LTD OS path.")
    raw_path = latest_videos_json()

    with open(raw_path, encoding="utf-8") as f:
        raw = json.load(f)
    title_to_id: dict[str, str] = {}
    for v in raw:
        title = normalize_title(v.get("title", ""))
        vid = v.get("video_id") or v.get("id")
        if title and vid:
            title_to_id[title] = vid

    with open(INDEX_PATH, encoding="utf-8") as f:
        text = f.read()

    SENTINEL = "\x00PIPE\x00"
    episodes: list[dict] = []
    in_table = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            in_table = False
            continue
        protected = line.replace("\\|", SENTINEL)
        parts = [p.replace(SENTINEL, "|").strip() for p in protected.strip("|").split("|")]
        if len(parts) < 5:
            continue
        if parts[0].startswith("---") or parts[0] == "Video Title":
            in_table = True
            continue
        if not in_table:
            continue
        title, date, series, topics, level = parts[0], parts[1], parts[2], parts[3], parts[4]
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            continue
        norm_title = normalize_title(title)
        membership = "Membership" in title or "MEMBERSHIP" in title or "membership" in title
        video_id = title_to_id.get(norm_title)
        episodes.append(
            {
                "title": norm_title,
                "date": date,
                "video_id": video_id,
                "url": f"https://youtube.com/watch?v={video_id}" if video_id else None,
                "series": [s.strip() for s in series.split(",") if s.strip()],
                "topics": [t.strip() for t in topics.split(",") if t.strip()],
                "level": level if level else None,
                "membership": membership,
            }
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "episodes": episodes,
        "count": len(episodes),
        "source": "VIDEO_DATE_INDEX.md",
        "raw": raw_path.name,
    }
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    missing_id = sum(1 for e in episodes if not e["video_id"])
    print(f"Wrote {len(episodes)} episodes to {OUTPUT} ({missing_id} missing video_id)")


if __name__ == "__main__":
    main()
