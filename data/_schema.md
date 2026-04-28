# Hub data schema

Reference for Press (and humans editing JSON by hand).

## `news.json` — Daily Tech News

```json
{
  "updated": "YYYY-MM-DD",
  "feed": "tech-news-daily",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "thai_date": "29 เมษายน 2026",
      "headlines": [
        {
          "emoji": "🔬",
          "ticker": "$NVDA",
          "blurb": "Thai sentence describing the headline (15-30 words)",
          "category": "B"
        }
      ],
      "sources": ["Bloomberg", "Reuters"]
    }
  ]
}
```

Notes:
- Newest day at index 0. Page renders top 7 days only.
- `category` is optional (A = earnings/price, B = product/business, C = macro/regulatory).
- `sources` is a flat list of publisher names (display only).

## `substack.json` — Weekly Substack Picks

```json
{
  "updated": "YYYY-MM-DD",
  "feed": "substack-weekly",
  "weeks": [
    {
      "week_label": "Research Digest — สัปดาห์ 21–27 เมษายน 2026",
      "papers": [
        {
          "title": "Original English Title",
          "author": "Dylan Patel",
          "author_url": "https://semianalysis.com",
          "core_thesis": "2-3 sentences in Thai",
          "key_takeaway": "2-3 sentences in Thai"
        }
      ]
    }
  ]
}
```

Notes:
- Newest week at index 0. Page renders top 5 weeks only.
- `author_url` is optional. If absent, author name renders without a link and Press's report flags it.
- The CTA "อ่านสรุปเต็มใน Discord →" is added by the renderer, not stored in JSON.
