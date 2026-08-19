# Hidden Jobs Engine

A static, client-side job search engine tuned for Staff/Principal-level
platform, DevOps, SRE, cloud-architecture and security roles at
high-paying US/global companies. No backend, no build step, no API keys,
no tracking.

## Run it

```bash
cd jobs
python3 -m http.server 8080
# open http://localhost:8080
```

(Opening `index.html` directly via `file://` mostly works too, since all
APIs used are CORS-open, but a local server is more reliable.)

## What it does

- **Hidden-jobs scan** — fetches live openings straight from the public
  JSON APIs of 49 verified company ATS boards (Greenhouse, Ashby, Lever,
  SmartRecruiters). These are roles at the source, before/without job-board
  syndication. Ashby boards include real posted salary bands.
- **Aggregators** — RemoteOK, Remotive and Jobicy APIs, merged and deduped.
- **HN "Who is hiring?"** — pulls the latest monthly thread via the Algolia
  API and filters founder-direct posts to your role.
- **Deep links** — pre-built boolean queries for Google/LinkedIn plus ATS
  X-ray searches (`site:job-boards.greenhouse.io` etc.).
- **Filters** — role family, Staff/Principal+ seniority, remote scope
  (🌍 global / 🇮🇳 India-eligible / 🇺🇸 US), salary floor, and
  highest-salary-first sorting.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | page shell + tabs |
| `style.css` | UI (dark/light via `prefers-color-scheme`) |
| `data.js` | verified companies, endpoints, deep links, profile tuning |
| `engine.js` | pure logic: API adapters, salary parsing, remote classification, scoring (Node-testable) |
| `app.js` | DOM glue, fetch orchestration, rendering |

All endpoints, company slugs and deep links verified live on **2026-08-19**.
