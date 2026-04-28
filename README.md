# ลงทุน Diary — Members Hub

A small public landing page that bundles every entry from the **ลงทุน Diary** YouTube channel — public videos, members-only deep dives, and series — into a curated, browsable index.

Live at: https://longtundiary-hub.pages.dev

## What's here

```
.
├── index.html              — single-page hub
├── styles.css              — diary-system layout (extends colors_and_type.css)
├── colors_and_type.css     — design tokens (cream / sage / forest)
├── app.js                  — render + filter logic (vanilla JS, no build step)
├── assets/                 — brand artwork (logo, wallpaper)
├── data/
│   ├── episodes.json       — auto-built catalogue of every video
│   ├── paths.json          — curated 3-path entry experience (Beginner / General / Advanced)
│   └── series.json         — series → YouTube playlist mapping
└── scripts/
    └── build-data.py       — regenerates episodes.json from the LTD OS knowledge base
```

## Local preview

```bash
python3 -m http.server 8088
# open http://localhost:8088
```

No build step needed — everything is static.

## Refreshing the catalogue

The hub reads from a local LTD OS knowledge base (private). To refresh:

```bash
python3 scripts/build-data.py
git add data/episodes.json
git commit -m "Refresh catalogue"
git push   # Cloudflare auto-deploys on push to main
```

## Deploys

Cloudflare Pages, connected to the `main` branch of this repo. Build settings:
- **Build command:** none
- **Output directory:** `/`
- **Framework preset:** none (static)

## Design system

Visual language follows the `ลงทุน Diary` design system: cream-paper background, sage-cover panels, forest-ink outlines, hand-lettered display, no gradients, no glassmorphism. See `colors_and_type.css` for the full token set.
