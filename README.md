# Hidden Jobs Engine

A static, client-side job search engine tuned for Staff/Principal-level
platform, DevOps, SRE, cloud-architecture and security roles at
high-paying US/global companies. Built with [Astro](https://astro.build);
no backend, no API keys, no tracking.

Live at **https://shubhamtatvamasi.com/jobs/**

## Develop

```bash
npm install
npm run dev       # http://localhost:4321/jobs/
npm test          # engine unit tests (node --test)
npm run build     # static site → dist/
npm run preview
```

## Deploy

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which tests, builds and publishes `dist/` to GitHub Pages
(repo **Settings → Pages → Source: GitHub Actions**). The site is served
under the `/jobs` base path of the `shubhamtatvamasi.com` user site — see
`astro.config.mjs`.

## What it does

- **Hidden-jobs scan** — fetches live openings straight from the public
  JSON APIs of 55 verified company ATS boards (Greenhouse, Ashby, Lever,
  SmartRecruiters). These are roles at the source, before/without job-board
  syndication. Ashby boards include real posted salary bands.
- **Aggregators** — RemoteOK, Remotive and Jobicy APIs, merged and deduped.
- **HN "Who is hiring?"** — pulls the latest monthly thread via the Algolia
  API and filters founder-direct posts to your role.
- **Deep links** — pre-built boolean queries for Google/LinkedIn plus ATS
  X-ray searches (`site:job-boards.greenhouse.io` etc.).
- **Filters** — role family, Staff/Principal+ seniority, remote scope
  (🌍 global / 🇮🇳 India-eligible / 🇺🇸 US), salary floor, and
  highest-salary-first sorting. Defaults to **🇺🇸 US remote**, sorted by
  highest salary.

Sections are hash-routed (`#scan`, `#agg`, `#hn`, `#links`, `#companies`,
`#guide`), so any tab can be linked directly. Light/dark theme follows the
OS and can be toggled from the header.

## Layout

| Path | Purpose |
| --- | --- |
| `src/pages/index.astro` | page shell; server-renders controls, companies, deep links, playbook |
| `src/components/JobPanel.astro` | shared markup for the three live-fetch sections |
| `src/layouts/Base.astro` | `<head>`, fonts, theme bootstrap |
| `src/styles/global.css` | design tokens + layout |
| `src/lib/data.js` | verified companies, endpoints, deep links, role/skill tuning |
| `src/lib/engine.js` | pure logic: API adapters, salary parsing, remote classification, scoring |
| `src/scripts/app.js` | client glue: tabs, filters, fetch orchestration, rendering |
| `test/engine.test.js` | Node tests for `engine.js` |

All endpoints, company slugs and deep links verified live on **2026-09-07**
(55 companies, 0 dead slugs; ClickHouse moved Greenhouse→Ashby, Temporal
dropped its public API and moved to manual-check). Added Huntress, Airbnb,
Pinterest, Postman, Cursor after confirming each has real Staff/Principal
platform-family openings today (not just a live board).

Remote classification also got more accurate for Greenhouse listings, which
carry no structured remote flag: a location spanning several cities/regions
("Central - United States", "Austin; Boston; ... United States") is now read
as remote-eligible-in-region instead of falling through to "on-site", and a
company tagged `hiring: "worldwide"` in `data.js` has its bare
"United States" listings (no city, e.g. Huntress) treated as remote too.
Single-office listings ("San Jose, California, USA") are unaffected and
still classify as on-site.
