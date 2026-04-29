#!/usr/bin/env python3
"""Build data/diary.json for the /diary page.

Reads ONLY from the public-mirror folder `diary/**` plus `data/episodes.json`.
Never touches the private LTD OS knowledge base — that's a deliberate
defense-in-depth boundary (see diary/README.md).

Sources:
  diary/insights/*.md   — Indie-authored stubs (≤250-char Thai summary)
  diary/theses/*.md     — one stub per thesis
  diary/videos/*.md     — optional manual overrides for video summaries
  data/episodes.json    — auto-derives video entries (overridden by diary/videos/)

Output:
  data/diary.json       — consumed by diary-app.js

Usage:
    python3 scripts/build_diary.py
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIARY_DIR = ROOT / "diary"
EPISODES_PATH = ROOT / "data" / "episodes.json"
OUTPUT = ROOT / "data" / "diary.json"

MAX_BODY_CHARS = 300
PAID_FIGURE_RE = re.compile(r"\$\s*\d+(?:\.\d+)?\s*[BT]\b", re.IGNORECASE)
TOP_N_CHIPS = 10


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Tiny YAML-ish frontmatter parser. Supports scalar, inline list `[a, b]`,
    and block list (subsequent `- value` lines). No nested objects needed."""
    if not text.startswith("---"):
        return {}, text.strip()
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text.strip()
    fm_text = text[3:end].strip("\n")
    body = text[end + 4 :].lstrip("\n").rstrip()

    fm: dict = {}
    current_list_key: str | None = None
    for raw_line in fm_text.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if line.startswith(" ") or line.startswith("\t"):
            stripped = line.strip()
            if stripped.startswith("- ") and current_list_key is not None:
                fm[current_list_key].append(_unquote(stripped[2:].strip()))
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if not value:
            fm[key] = []
            current_list_key = key
            continue
        current_list_key = None
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1]
            fm[key] = [_unquote(x.strip()) for x in inner.split(",") if x.strip()]
        else:
            fm[key] = _unquote(value)
    return fm, body


def _unquote(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"'):
        return s[1:-1]
    return s


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:60] or "untitled"


def file_hash(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()[:12]


def load_stubs(folder: Path, default_type: str) -> tuple[list[dict], list[str]]:
    """Read every .md in folder. Returns (entries, warnings)."""
    entries: list[dict] = []
    warnings: list[str] = []
    if not folder.exists():
        return entries, warnings

    for path in sorted(folder.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(text)
        title = (fm.get("title") or "").strip()
        if not title:
            warnings.append(f"{path.name}: missing title — skipped")
            continue

        body = body.strip()
        if len(body) > MAX_BODY_CHARS:
            warnings.append(
                f"{path.name}: body {len(body)} chars > {MAX_BODY_CHARS} — truncated"
            )
            body = body[:MAX_BODY_CHARS].rstrip() + "…"
        if PAID_FIGURE_RE.search(body):
            warnings.append(
                f"{path.name}: body contains big-$ figure — review for paid-source leak"
            )
        if not body:
            warnings.append(f"{path.name}: empty body — needs manual summary")

        entry_type = (fm.get("type") or default_type).strip()
        date = (fm.get("date") or "").strip()
        video_id = (fm.get("linked_video_id") or "").strip()
        external_url = (
            f"https://youtube.com/watch?v={video_id}" if video_id else fm.get("external_url", "")
        )

        entries.append(
            {
                "id": f"{entry_type}-{path.stem}",
                "title": title,
                "summary_thai": body,
                "type": entry_type,
                "tickers": _as_list(fm.get("tickers")),
                "topics": _as_list(fm.get("topics")),
                "date": date,
                "linked_video_id": video_id or None,
                "external_url": external_url or None,
                "source_hash": fm.get("source_hash") or None,
            }
        )
    return entries, warnings


def _as_list(v) -> list[str]:
    if not v:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    return [str(v).strip()]


def load_video_entries(override_ids: set[str]) -> list[dict]:
    """Derive one entry per episode in data/episodes.json. Skip any video_id
    that already has a manual stub in diary/videos/ — that override wins."""
    if not EPISODES_PATH.exists():
        return []
    payload = json.loads(EPISODES_PATH.read_text(encoding="utf-8"))
    out: list[dict] = []
    for ep in payload.get("episodes", []):
        vid = ep.get("video_id")
        if not vid or vid in override_ids:
            continue
        topics = ep.get("topics") or []
        series = ep.get("series") or []
        # Auto summary stays empty — title carries the meaning. Frontend
        # gracefully renders title + topics + date when summary is blank.
        out.append(
            {
                "id": f"video-{vid}",
                "title": ep.get("title") or "",
                "summary_thai": "",
                "type": "video",
                "tickers": [],
                "topics": topics,
                "series": series,
                "level": ep.get("level"),
                "membership": bool(ep.get("membership")),
                "date": ep.get("date") or "",
                "linked_video_id": vid,
                "external_url": ep.get("url") or f"https://youtube.com/watch?v={vid}",
                "source_hash": None,
            }
        )
    return out


def top_n(values: list[str], n: int) -> list[str]:
    counts = Counter(values)
    return [v for v, _ in counts.most_common(n)]


def main() -> int:
    insights, w1 = load_stubs(DIARY_DIR / "insights", "insight")
    theses, w2 = load_stubs(DIARY_DIR / "theses", "thesis")
    xposts, w_x = load_stubs(DIARY_DIR / "xposts", "xpost")
    video_overrides, w3 = load_stubs(DIARY_DIR / "videos", "video")

    override_ids = {e["linked_video_id"] for e in video_overrides if e.get("linked_video_id")}
    auto_videos = load_video_entries(override_ids)

    raw_entries = insights + theses + xposts + video_overrides + auto_videos

    # Dedupe by id (defensive — upstream episodes.json occasionally has dup
    # rows; keep the first occurrence in the priority order above).
    seen: set[str] = set()
    entries: list[dict] = []
    dup_warnings: list[str] = []
    for e in raw_entries:
        if e["id"] in seen:
            dup_warnings.append(f"duplicate id {e['id']} — second occurrence dropped")
            continue
        seen.add(e["id"])
        entries.append(e)

    # Sort newest first by date (empty dates last).
    def sort_key(e: dict) -> tuple[int, str]:
        return (0, e["date"]) if e.get("date") else (1, "")

    entries.sort(key=sort_key, reverse=True)

    all_tickers = [t for e in entries for t in e.get("tickers", [])]
    all_topics = [t for e in entries for t in e.get("topics", [])]

    payload = {
        "updated": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds"),
        "feed": "diary",
        "entries": entries,
        "meta": {
            "counts": {
                "total": len(entries),
                "insights": len(insights),
                "theses": len(theses),
                "xposts": len(xposts),
                "videos": len(video_overrides) + len(auto_videos),
            },
            "top_tickers": top_n(all_tickers, TOP_N_CHIPS),
            "top_topics": top_n(all_topics, TOP_N_CHIPS),
        },
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    raw_size = OUTPUT.stat().st_size
    print(
        f"Wrote {len(entries)} entries to {OUTPUT.relative_to(ROOT)} "
        f"({len(insights)} insights · {len(theses)} theses · {len(xposts)} xposts · "
        f"{len(video_overrides)} video-overrides · {len(auto_videos)} auto-videos) "
        f"— {raw_size // 1024} KB raw"
    )

    warnings = w1 + w2 + w_x + w3 + dup_warnings
    if warnings:
        print(f"\n⚠ {len(warnings)} warning(s):")
        for w in warnings:
            print(f"  · {w}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
