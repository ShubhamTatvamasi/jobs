// Curated data for the Hidden Job Search Engine
// Tailored to: Shubham Tatvamasi — Principal Solutions Architect
// Multi-Cloud, Kubernetes, Post-Quantum Security | Based in India, seeking
// globally-remote roles at US(-headquartered) companies.

const PROFILE = {
  name: "Shubham Tatvamasi",
  location: "Noida, India",
  headline: "Principal Solutions Architect — Multi-Cloud, Kubernetes & Post-Quantum Security",
};

// Job titles ranked by target seniority/pay for this profile.
const TITLES = [
  { label: "Principal Solutions Architect", weight: 5 },
  { label: "Principal Platform Engineer", weight: 5 },
  { label: "Staff Platform Engineer", weight: 5 },
  { label: "Staff Infrastructure Engineer", weight: 4 },
  { label: "Staff Site Reliability Engineer", weight: 4 },
  { label: "Principal DevOps Engineer", weight: 4 },
  { label: "Staff Cloud Architect", weight: 4 },
  { label: "Kubernetes Platform Architect", weight: 4 },
  { label: "DevSecOps Architect", weight: 3 },
  { label: "Principal Security Architect (Cloud)", weight: 3 },
  { label: "Distinguished Engineer, Infrastructure", weight: 5 },
];

// Core skill clusters from the resume, used to build precise boolean queries.
const SKILL_CLUSTERS = [
  {
    key: "core",
    label: "Core Platform",
    terms: ["Kubernetes", "AWS", "Terraform", "GitOps"],
  },
  {
    key: "multicloud",
    label: "Multi-Cloud",
    terms: ["AWS", "Azure", "GCP", "OpenStack"],
  },
  {
    key: "security",
    label: "Post-Quantum & Security",
    terms: ["Post-Quantum", "Zero Trust", "cert-manager", "WireGuard"],
  },
  {
    key: "sre",
    label: "SRE & Observability",
    terms: ["SRE", "Prometheus", "Grafana", "Incident Response"],
  },
  {
    key: "cicd",
    label: "CI/CD & GitOps",
    terms: ["ArgoCD", "FluxCD", "GitHub Actions", "CI/CD"],
  },
];

// Phrases that signal a role is genuinely open to remote-from-India /
// worldwide candidates, vs. "Remote - US" which usually means US-residents-only.
const REMOTE_GOOD_PHRASES = [
  "remote worldwide",
  "global remote",
  "work from anywhere",
  "remote - international",
  "remote - APAC",
  "remote - India",
  "anywhere in the world",
  "EOR",
  "contractor - India",
];

const REMOTE_BAD_PHRASES = [
  "Remote - US",
  "Remote - USA",
  "Remote - North America",
  "must be authorized to work in the United States",
  "US citizens only",
];

// Job boards / ATS platforms, each with a URL template.
// {q} = URL-encoded query string.
// queryType: "boolean" boards get the Google-style quotes/OR/parens query;
// "plain" boards get a plain keyword string, since their own search boxes do
// simple text matching and would search boolean syntax as literal characters.
const BOARDS = [
  {
    id: "google",
    name: "Google",
    kind: "meta",
    queryType: "boolean",
    build: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    kind: "board",
    queryType: "plain",
    build: (q) =>
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
        q
      )}&f_WT=2`, // f_WT=2 = Remote
  },
  // NOTE: site:boards.greenhouse.io / site:jobs.lever.co / site:jobs.ashbyhq.com
  // / site:apply.workable.com used to work as a poor-man's cross-company ATS
  // search, but verified (via Bing, since Google JS-walls curl) that these
  // subdomains now return ZERO indexed pages — most companies redirect their
  // old ATS-hosted board URL straight to a white-labeled careers page on
  // their own domain (e.g. boards.greenhouse.io/stripe -> stripe.com/careers),
  // so the raw ATS subdomain is no longer a meaningfully crawlable target.
  // Replaced with plain-keyword general search instead of a dead site: filter.
  {
    id: "greenhouse",
    name: "Greenhouse-hosted roles",
    kind: "web",
    queryType: "boolean",
    build: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${q} greenhouse`)}`,
  },
  {
    id: "lever",
    name: "Lever-hosted roles",
    kind: "web",
    queryType: "boolean",
    build: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${q} lever`)}`,
  },
  {
    id: "ashby",
    name: "Ashby-hosted roles",
    kind: "web",
    queryType: "boolean",
    build: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${q} ashby`)}`,
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    kind: "board",
    queryType: "plain",
    build: (q) => `https://remoteok.com/?search=${encodeURIComponent(q)}`,
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList Talent)",
    kind: "board",
    queryType: "plain",
    build: (q) =>
      `https://wellfound.com/jobs?query=${encodeURIComponent(q)}&remote=true`,
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    kind: "board",
    queryType: "plain",
    build: (q) =>
      `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(
        q
      )}`,
  },
  {
    id: "himalayas",
    name: "Himalayas",
    kind: "board",
    queryType: "plain",
    // himalayas.app runs a Cloudflare JS challenge on every path, so its
    // search query-param can't be verified via curl. Link to the base jobs
    // listing (verified reachable in-browser) instead of guessing a param.
    build: () => `https://himalayas.app/jobs`,
  },
  {
    id: "levelsfyi",
    name: "Levels.fyi (comp research)",
    kind: "comp",
    queryType: "boolean",
    // levels.fyi has no working query-string search (verified: ?search=
    // is silently ignored and renders the homepage). Route through Google
    // site-search instead, which actually filters.
    build: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(
        `site:levels.fyi ${q}`
      )}`,
  },
];

// Live, no-auth JSON API sources fetched directly in-browser (CORS-open).
const LIVE_APIS = [
  {
    id: "remoteok-api",
    name: "RemoteOK",
    url: "https://remoteok.com/api",
    parse: (data, terms) => {
      if (!Array.isArray(data)) return [];
      return data
        .filter((d) => d.position || d.title)
        .filter((d) => {
          const hay = `${d.position || d.title || ""} ${d.description || ""} ${(d.tags || []).join(" ")}`.toLowerCase();
          return terms.some((t) => hay.includes(t.toLowerCase()));
        })
        .map((d) => ({
          title: d.position || d.title,
          company: d.company,
          url: d.url || `https://remoteok.com/l/${d.id}`,
          location: d.location || "Worldwide",
          salary:
            d.salary_min && d.salary_max
              ? `$${Math.round(d.salary_min / 1000)}k–$${Math.round(
                  d.salary_max / 1000
                )}k`
              : d.salary || "",
          tags: d.tags || [],
          source: "RemoteOK",
          date: d.date || "",
        }));
    },
  },
  // NOTE: Himalayas' /jobs/api has no Access-Control-Allow-Origin header
  // (verified via curl preflight), so browser fetches are blocked by CORS.
  // It's kept as a deep-link board in BOARDS instead of a live source here.
];

// Highest-paying company clusters known for senior infra/platform pay + genuine
// global-remote or India-inclusive hiring (curated from public compensation data
// such as levels.fyi / Glassdoor bands — verify current openings on each site).
const TARGET_COMPANIES = [
  { name: "HashiCorp", note: "Terraform/Vault maker, remote-first, strong infra comp", careers: "https://www.hashicorp.com/en/careers/open-positions" },
  { name: "GitLab", note: "All-remote by design, transparent global comp bands", careers: "https://about.gitlab.com/jobs/all-jobs/" },
  { name: "Elastic", note: "Distributed-first, hires broadly outside US", careers: "https://www.elastic.co/careers/open-jobs" },
  { name: "Automattic", note: "Fully distributed, no HQ, hires worldwide", careers: "https://automattic.com/work-with-us/" },
  { name: "Cloudflare", note: "Strong platform/security org, some global-remote reqs", careers: "https://www.cloudflare.com/careers/jobs/" },
  { name: "Datadog", note: "Observability leader, high infra comp, mixed remote policy", careers: "https://careers.datadoghq.com/" },
  { name: "MongoDB", note: "Platform/infra roles, remote-friendly", careers: "https://www.mongodb.com/careers/" },
  { name: "Chronosphere", note: "Observability startup, remote-first", careers: "https://chronosphere.io/careers/" },
  { name: "Grafana Labs", note: "All-remote, deep Kubernetes/observability overlap", careers: "https://grafana.com/about/careers/" },
  { name: "SUSE / Rancher", note: "Kubernetes-native, distributed workforce", careers: "https://www.suse.com/careers/" },
  { name: "Canonical", note: "Fully remote company, strong infra/OSS overlap", careers: "https://canonical.com/careers/all" },
  { name: "Red Hat", note: "OpenShift/Kubernetes, many remote reqs globally", careers: "https://www.redhat.com/en/jobs" },
  { name: "1Password", note: "Security-first, all-remote", careers: "https://1password.com/careers/" },
  { name: "Okta", note: "Zero Trust/IAM overlap with your security background", careers: "https://www.okta.com/company/careers/" },
  { name: "Sysdig", note: "Kubernetes security, remote-friendly", careers: "https://sysdig.com/careers/" },
  { name: "Palo Alto Networks (Prisma Cloud)", note: "Cloud security, some global-remote infra roles", careers: "https://jobs.paloaltonetworks.com/" },
  { name: "Wiz", note: "Cloud security unicorn, rapidly hiring globally", careers: "https://www.wiz.io/careers" },
  { name: "Akamai", note: "Edge/security infra, distributed teams", careers: "https://www.akamai.com/careers" },
  { name: "Cockroach Labs", note: "Distributed DB, remote-first culture", careers: "https://www.cockroachlabs.com/careers/" },
  { name: "Confluent", note: "Kafka/streaming infra, hybrid-remote", careers: "https://careers.confluent.io/" },
];
