# Hidden Jobs Engine

A static, client-side job search engine for senior **AI-infrastructure**
roles: inference / model serving, GPU clusters and AI data centers, ML
platforms, and the Kubernetes / DevOps / SRE work underneath them. Built with [Astro](https://astro.build);
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
  JSON APIs of 56 AI-infrastructure employers (Greenhouse, Ashby, Lever),
  grouped as GPU clouds & AI data centers, inference platforms, frontier
  labs, AI silicon, and ML / cloud-native platforms. Ashby boards include
  real posted salary bands.
- **Aggregators** — RemoteOK, Remotive and Jobicy APIs, merged and deduped.
- **HN "Who is hiring?"** — pulls the latest monthly thread via the Algolia
  API and filters founder-direct posts to your role.
- **Deep links** — pre-built boolean queries for Google/LinkedIn plus ATS
  X-ray searches (`site:job-boards.greenhouse.io` etc.).
- **Filters** — role family (inference, GPU/HPC, AI/ML platform, data
  center, Kubernetes, platform/DevOps/SRE), seniority, remote scope
  (🌍 global / 🇮🇳 India-eligible / 🇺🇸 US), salary floor and sorting.
  The default seniority, **Staff+ or unlevelled**, keeps the "Member of
  Technical Staff" and level-less titles AI labs and startups use. "Best
  match" ranks inference/GPU titles above generic platform ones.

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

All endpoints, company slugs and deep links verified live on **2026-10-10**
(56 scannable employers; NVIDIA, AMD, Groq, Hugging Face, Mistral and the
hyperscalers use Workday/Gem/Workable/custom sites and are listed for manual
checks).

Remote classification notes:

- Ashby marks hybrid postings `isRemote: true`; the adapter trusts
  `workplaceType` instead, so office-hybrid roles no longer show as remote.
- Greenhouse has no structured remote flag: a location spanning several
  cities/regions ("Central - United States", "Austin; Boston; ... United
  States") is read as remote-eligible-in-region; single-office listings
  ("San Jose, California, USA") stay on-site.
