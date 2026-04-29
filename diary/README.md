# diary/ — public-mirror folder for the /diary feature

Everything in this folder is **public** — it lives in the GitHub repo for Cloudflare Pages.

The `/diary` page is built from this folder by `scripts/build_diary.py`, which writes `data/diary.json`.

## Subfolders

- `insights/` — public stubs for KB insights (Knowledge/Insights/ in LTD OS). Each stub is a Markdown file with frontmatter + a Thai summary ≤ 250 chars. Written by Indie via the `/diary-add` skill.
- `theses/` — one stub per active thesis (T1–T15) and candidate (C7–C15). Manual one-shot.
- `videos/` — optional manual override stubs for videos. Most videos are auto-derived from `data/episodes.json` at index time. Add a stub here only when you want a hand-crafted Thai summary that overrides the auto entry.

## Why a public mirror, not a direct read of LTD OS

The hub repo is public on GitHub. Even a `.gitignored` build folder containing full KB content would be a leak risk. The build script reads ONLY from this folder, so a bug in the indexer can only leak data already curated as public-safe.

## Stub schema

```yaml
---
title: "FundaAI: TPU 8t กับ Virgo network optics"
date: 2026-04-23
type: insight              # insight | thesis | video
tickers: [GOOGL, BRCM]
topics: [AI Infrastructure, Photonics]
linked_video_id: QKQ_mDCruIA
source_hash: <sha1 of source LTD OS file, optional>
---

Paint สรุปว่า networking กลายเป็นคอขวดของ TPU ที่ scale ใหญ่ — Virgo จะมาแก้ตรงนี้ และเป็นจุดที่ Broadcom เก็บ value ได้
```

Body ≤ 250 chars. Numeric figures from paid sources (FundaAI revenue projections etc.) must be stripped.
