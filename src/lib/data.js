// ============================================================
// Hidden Job Engine — data registry (ES module)
// Tuned for Staff/Principal platform, DevOps, SRE, cloud and
// security roles at high-paying remote-friendly companies.
//
// Every API endpoint, company slug, and deep link below was
// verified live on VERIFIED_ON (HTTP 200 + CORS-open where the
// browser fetches it directly).
// ============================================================

export const VERIFIED_ON = "2026-09-07";

// Role families used to match job titles. `re` runs against the job title
// (and tags where available). Defaults cover the platform-engineering family.
export const ROLE_FAMILIES = [
  { key: "platform", label: "Platform / Infra", re: /(platform|infrastructure|\binfra\b)/i },
  { key: "devops", label: "DevOps / CI-CD", re: /(devops|dev ops|ci\/?cd|release engineer|build engineer)/i },
  { key: "sre", label: "SRE / Reliability", re: /(\bsre\b|site reliability|reliability engineer|production engineer)/i },
  { key: "cloud", label: "Cloud / Solutions Architect", re: /(cloud (architect|engineer)|solutions? architect|cloud native|multi-?cloud)/i },
  { key: "k8s", label: "Kubernetes", re: /(kubernetes|\bk8s\b|openshift|container platform)/i },
  { key: "security", label: "Security / DevSecOps", re: /(security engineer|security architect|devsecops|zero trust|cryptograph|infrastructure security|cloud security|platform security)/i },
];

// Titles matching this are never engineering/architecture roles, even when they contain words like "infrastructure" or "platform"
// (e.g. "Tax Director - Infrastructure & Incentives", "Staff Product Manager,
// Data Platform"). Tune freely.
export const EXCLUDE_TITLE_RE = /(product manager|product design|program manager|project manager|account (executive|manager)|sales|marketing|recruit|talent|sourcer|attorney|legal|counsel|paralegal|\btax\b|account(ant|ing)|payroll|people (ops|operations|partner)|human resources|customer success|community manager|content|copywriter|executive assistant|workplace|physician|clinical)/i;

export const SENIORITY_LEVELS = [
  { id: "staff", label: "Staff / Principal +", re: /(staff|principal|distinguished|architect|\bhead\b|director|\bvp\b)/i },
  { id: "senior", label: "Senior +", re: /(senior|\bsr\.?\b|staff|principal|lead|distinguished|architect|\bhead\b|director)/i },
  { id: "any", label: "Any level", re: null },
];

export const REMOTE_SCOPES = [
  { id: "any-remote", label: "Any remote" },
  { id: "global", label: "🌍 Global-friendly" },
  { id: "india", label: "🇮🇳 India-eligible" },
  { id: "us", label: "🇺🇸 US remote" },
  { id: "all", label: "Everything (incl. on-site)" },
];

export const MIN_SALARY_OPTIONS = [
  { id: 0, label: "Any salary" },
  { id: -1, label: "Has posted salary" },
  { id: 150000, label: "≥ $150k" },
  { id: 200000, label: "≥ $200k" },
  { id: 250000, label: "≥ $250k" },
  { id: 300000, label: "≥ $300k" },
];

// Initial filter state, shared by the server-rendered controls and the
// client script so the page never flashes a different selection.
export const DEFAULT_FILTERS = {
  seniority: "staff",
  scope: "us",
  minSalary: 0,
  sort: "salary",
};

export const SORT_MODES = [
  { id: "salary", label: "Highest salary" },
  { id: "match", label: "Best match" },
  { id: "newest", label: "Newest" },
];

// Job titles for the deep-link query builder, ranked by target pay.
export const TITLES = [
  { label: "Principal Platform Engineer" },
  { label: "Principal Solutions Architect" },
  { label: "Distinguished Engineer, Infrastructure" },
  { label: "Staff Platform Engineer" },
  { label: "Staff Infrastructure Engineer" },
  { label: "Staff Site Reliability Engineer" },
  { label: "Principal DevOps Engineer" },
  { label: "Staff Cloud Architect" },
  { label: "Kubernetes Platform Architect" },
  { label: "Principal Security Architect" },
  { label: "DevSecOps Architect" },
  { label: "Senior Platform Engineer" },
];

// Skill clusters — used by the deep-link query builder.
export const SKILL_CLUSTERS = [
  { key: "core", label: "Core Platform", terms: ["Kubernetes", "Terraform", "GitOps"] },
  { key: "multicloud", label: "Multi-Cloud", terms: ["AWS", "Azure", "GCP", "OpenStack"] },
  { key: "security", label: "Post-Quantum & Security", terms: ["Post-Quantum", "Zero Trust", "WireGuard"] },
  { key: "sre", label: "SRE & Observability", terms: ["SRE", "Prometheus", "Grafana"] },
  { key: "cicd", label: "CI/CD & GitOps", terms: ["ArgoCD", "FluxCD", "GitHub Actions"] },
  { key: "airflow", label: "Airflow / Data Platform", terms: ["Airflow", "MLOps", "Data Platform"] },
];

// ------------------------------------------------------------
// The hidden-jobs channel: companies whose ATS boards expose a
// public, CORS-open JSON API the browser can scan directly.
// ats: greenhouse | ashby | lever | smartrecruiters
// payTier: 3 = top-of-market, 2 = strong, 1 = solid
// hiring: worldwide | multi-region | us-lean  (rough guide only)
// ------------------------------------------------------------
export const ATS_COMPANIES = [
  // Greenhouse
  { name: "GitLab", ats: "greenhouse", slug: "gitlab", payTier: 2, hiring: "worldwide", note: "All-remote, transparent global comp calculator" },
  { name: "Cloudflare", ats: "greenhouse", slug: "cloudflare", payTier: 2, hiring: "multi-region", note: "Edge + security platform heavyweight" },
  { name: "Elastic", ats: "greenhouse", slug: "elastic", payTier: 2, hiring: "worldwide", note: "Distributed by design; hires in India" },
  { name: "Datadog", ats: "greenhouse", slug: "datadog", payTier: 3, hiring: "multi-region", note: "Observability leader, top infra comp" },
  { name: "MongoDB", ats: "greenhouse", slug: "mongodb", payTier: 2, hiring: "multi-region", note: "India engineering offices (Gurugram/Bengaluru)" },
  { name: "Stripe", ats: "greenhouse", slug: "stripe", payTier: 3, hiring: "multi-region", note: "Top-tier comp; strong infra org" },
  { name: "Databricks", ats: "greenhouse", slug: "databricks", payTier: 3, hiring: "multi-region", note: "Bengaluru hub; top-of-market comp" },
  { name: "Anthropic", ats: "greenhouse", slug: "anthropic", payTier: 3, hiring: "us-lean", note: "Frontier AI; top-of-market comp" },
  { name: "Okta", ats: "greenhouse", slug: "okta", payTier: 2, hiring: "multi-region", note: "IAM / Zero Trust" },
  { name: "Coinbase", ats: "greenhouse", slug: "coinbase", payTier: 3, hiring: "us-lean", note: "Remote-first, top comp" },
  { name: "Grafana Labs", ats: "greenhouse", slug: "grafanalabs", payTier: 2, hiring: "worldwide", note: "All-remote across 30+ countries; observability" },
  { name: "Chainguard", ats: "greenhouse", slug: "chainguard", payTier: 2, hiring: "us-lean", note: "Supply-chain security; remote-first" },
  { name: "Vercel", ats: "greenhouse", slug: "vercel", payTier: 2, hiring: "multi-region", note: "Frontend cloud; platform/edge roles" },
  { name: "Tailscale", ats: "greenhouse", slug: "tailscale", payTier: 2, hiring: "us-lean", note: "WireGuard-based networking" },
  { name: "Fastly", ats: "greenhouse", slug: "fastly", payTier: 1, hiring: "multi-region", note: "Edge compute / CDN infra" },
  { name: "Cockroach Labs", ats: "greenhouse", slug: "cockroachlabs", payTier: 2, hiring: "us-lean", note: "Distributed SQL" },
  { name: "Wiz", ats: "greenhouse", slug: "wizinc", payTier: 3, hiring: "multi-region", note: "Cloud security rocketship" },
  { name: "Canonical", ats: "greenhouse", slug: "canonical", payTier: 1, hiring: "worldwide", note: "Fully remote worldwide (Ubuntu, MicroK8s) — hires in India" },
  { name: "CoreWeave", ats: "greenhouse", slug: "coreweave", payTier: 3, hiring: "us-lean", note: "AI cloud buildout; aggressive comp; strong Staff/Principal infra volume" },
  { name: "Twilio", ats: "greenhouse", slug: "twilio", payTier: 2, hiring: "multi-region", note: "Remote-friendly; India presence" },
  { name: "Reddit", ats: "greenhouse", slug: "reddit", payTier: 3, hiring: "us-lean", note: "Large-scale infra org" },
  { name: "Robinhood", ats: "greenhouse", slug: "robinhood", payTier: 3, hiring: "us-lean", note: "High US comp" },
  { name: "Fivetran", ats: "greenhouse", slug: "fivetran", payTier: 2, hiring: "multi-region", note: "Data infra; Bengaluru offices" },
  { name: "Dropbox", ats: "greenhouse", slug: "dropbox", payTier: 3, hiring: "us-lean", note: "Virtual-first" },
  { name: "PagerDuty", ats: "greenhouse", slug: "pagerduty", payTier: 1, hiring: "multi-region", note: "Incident response platform" },
  { name: "Buildkite", ats: "greenhouse", slug: "buildkite", payTier: 1, hiring: "worldwide", note: "CI/CD; remote, APAC-friendly" },
  { name: "Netlify", ats: "greenhouse", slug: "netlify", payTier: 1, hiring: "us-lean", note: "Platform / web infra" },
  { name: "CircleCI", ats: "greenhouse", slug: "circleci", payTier: 1, hiring: "multi-region", note: "CI/CD" },
  { name: "Pulumi", ats: "greenhouse", slug: "pulumicorporation", payTier: 2, hiring: "us-lean", note: "IaC — Terraform-adjacent" },
  { name: "Affirm", ats: "greenhouse", slug: "affirm", payTier: 2, hiring: "us-lean", note: "Fintech infra; verified live, strong Staff+ volume" },
  { name: "Samsara", ats: "greenhouse", slug: "samsara", payTier: 2, hiring: "us-lean", note: "IoT platform; verified live infra hiring" },
  { name: "Huntress", ats: "greenhouse", slug: "huntress", payTier: 2, hiring: "worldwide", note: "Managed detection/security platform; genuinely remote-first US team" },
  { name: "Airbnb", ats: "greenhouse", slug: "airbnb", payTier: 3, hiring: "us-lean", note: "Top-of-market comp; real 'Remote - USA' tagged Staff platform roles" },
  { name: "Pinterest", ats: "greenhouse", slug: "pinterest", payTier: 3, hiring: "us-lean", note: "Top-of-market comp; real 'Remote, US' tagged Principal/Staff platform roles" },
  { name: "Postman", ats: "greenhouse", slug: "postman", payTier: 2, hiring: "us-lean", note: "API platform; Head of Infra/SRE + Principal Security roles" },
  // Ashby (exposes real salary bands via its API)
  { name: "OpenAI", ats: "ashby", slug: "openai", payTier: 3, hiring: "us-lean", note: "Top-of-market comp; SF-hybrid mostly" },
  { name: "Notion", ats: "ashby", slug: "notion", payTier: 3, hiring: "us-lean", note: "High comp; infra roles" },
  { name: "Ramp", ats: "ashby", slug: "ramp", payTier: 3, hiring: "us-lean", note: "High-growth fintech; strong infra pay" },
  { name: "Replit", ats: "ashby", slug: "replit", payTier: 2, hiring: "us-lean", note: "Cloud dev platform; K8s-heavy" },
  { name: "Docker", ats: "ashby", slug: "docker", payTier: 2, hiring: "worldwide", note: "Remote-first; container tooling" },
  { name: "Supabase", ats: "ashby", slug: "supabase", payTier: 2, hiring: "worldwide", note: "Fully remote, hires worldwide" },
  { name: "Render", ats: "ashby", slug: "render", payTier: 2, hiring: "us-lean", note: "Cloud platform (PaaS)" },
  { name: "Linear", ats: "ashby", slug: "linear", payTier: 2, hiring: "multi-region", note: "Remote (US/EU)" },
  { name: "Astronomer", ats: "ashby", slug: "astronomer", payTier: 2, hiring: "multi-region", note: "Managed Apache Airflow platform" },
  { name: "Coder", ats: "ashby", slug: "coder", payTier: 2, hiring: "us-lean", note: "Remote dev environments on K8s" },
  { name: "PostHog", ats: "ashby", slug: "posthog", payTier: 2, hiring: "worldwide", note: "Remote worldwide" },
  { name: "Vanta", ats: "ashby", slug: "vanta", payTier: 2, hiring: "us-lean", note: "Security/compliance automation" },
  { name: "Modal", ats: "ashby", slug: "modal", payTier: 3, hiring: "us-lean", note: "AI infra; serverless GPU cloud" },
  { name: "Neon", ats: "ashby", slug: "neon", payTier: 2, hiring: "multi-region", note: "Serverless Postgres; remote EU/US" },
  { name: "Railway", ats: "ashby", slug: "railway", payTier: 2, hiring: "worldwide", note: "PaaS; remote global" },
  { name: "ClickHouse", ats: "ashby", slug: "clickhouse", payTier: 2, hiring: "worldwide", note: "Remote-first across 20+ countries; moved off Greenhouse to Ashby — strong Staff+ infra volume" },
  { name: "Cursor (Anysphere)", ats: "ashby", slug: "cursor", payTier: 3, hiring: "us-lean", note: "Top-of-market AI coding platform; verified live infra hiring" },
  // Lever
  { name: "Palantir", ats: "lever", slug: "palantir", payTier: 3, hiring: "us-lean", note: "Top pay; mostly on-site" },
  { name: "Sysdig", ats: "lever", slug: "sysdig", payTier: 2, hiring: "multi-region", note: "Falco / K8s runtime security" },
  // SmartRecruiters
  { name: "Mirantis", ats: "smartrecruiters", slug: "mirantis", webSlug: "Mirantis", payTier: 1, hiring: "worldwide", note: "Kubernetes + OpenStack" },
];

// High-pay targets whose ATS has no public CORS-open API — check manually.
export const EXTRA_TARGETS = [
  { name: "HashiCorp (IBM)", careers: "https://www.hashicorp.com/careers", note: "Terraform / Vault" },
  { name: "Red Hat", careers: "https://www.redhat.com/en/jobs", note: "OpenShift; many India-remote reqs" },
  { name: "SUSE / Rancher", careers: "https://www.suse.com/careers/", note: "Kubernetes-native, distributed teams" },
  { name: "Automattic", careers: "https://automattic.com/work-with-us/", note: "Fully distributed, hires worldwide" },
  { name: "1Password", careers: "https://1password.com/careers", note: "Security-first, remote (Ashby board has 0 CORS-listed staff+ matches currently — check manually)" },
  { name: "Akamai", careers: "https://www.akamai.com/careers", note: "Edge/security infra; India presence" },
  { name: "Confluent", careers: "https://careers.confluent.io/", note: "Kafka/streaming infra" },
  { name: "Snowflake", careers: "https://careers.snowflake.com/", note: "Top-of-market data infra comp" },
  { name: "Palo Alto Networks", careers: "https://jobs.paloaltonetworks.com/", note: "Prisma Cloud; cloud security" },
  { name: "Teleport", careers: "https://goteleport.com/careers/", note: "Infrastructure access; Zero Trust" },
  { name: "Snyk", careers: "https://snyk.io/careers/", note: "DevSecOps" },
  { name: "Chronosphere", careers: "https://chronosphere.io/careers/", note: "Observability; remote-first" },
  { name: "Temporal", careers: "https://temporal.io/careers", note: "Distributed systems; moved off its public Greenhouse API — check manually" },
];

// Aggregator + community APIs, all verified CORS-open (no key needed).
export const AGG_ENDPOINTS = {
  remoteok: "https://remoteok.com/api",
  remotive: (q) => `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=100`,
  jobicy: (q) => `https://jobicy.com/api/v2/remote-jobs?count=100&tag=${encodeURIComponent(q)}`,
};

// One search term per role family, for APIs that take a keyword.
export const FAMILY_SEARCH_TERMS = {
  platform: "platform engineer",
  devops: "devops",
  sre: "sre",
  cloud: "cloud architect",
  k8s: "kubernetes",
  security: "security engineer",
};

export const HN_API = {
  findThread: "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10",
  comments: (storyId) => `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=1000`,
  itemUrl: (id) => `https://news.ycombinator.com/item?id=${id}`,
};

// Deep links for the query-builder tab. {q} is filled with the built query.
// queryType "boolean" gets quotes/OR syntax; "plain" gets bare keywords.
export const BOARDS = [
  { id: "google", name: "Google", kind: "meta", queryType: "boolean", note: "Boolean web search",
    build: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "gh-xray", name: "Greenhouse X-ray", kind: "x-ray", queryType: "boolean", note: "Every Greenhouse company at once (verified indexed)",
    build: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:job-boards.greenhouse.io ${q}`)}` },
  { id: "lever-xray", name: "Lever X-ray", kind: "x-ray", queryType: "boolean", note: "site:jobs.lever.co across all companies",
    build: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:jobs.lever.co ${q}`)}` },
  { id: "ashby-xray", name: "Ashby X-ray", kind: "x-ray", queryType: "boolean", note: "site:jobs.ashbyhq.com across all companies",
    build: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:jobs.ashbyhq.com ${q}`)}` },
  { id: "linkedin", name: "LinkedIn Jobs", kind: "board", queryType: "plain", note: "Pre-filtered to Remote",
    build: (q) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&f_WT=2` },
  { id: "remoteok", name: "RemoteOK", kind: "board", queryType: "plain", note: "Remote-only board",
    build: (q) => `https://remoteok.com/?search=${encodeURIComponent(q)}` },
  { id: "wwr", name: "We Work Remotely", kind: "board", queryType: "plain", note: "Remote-only board",
    build: (q) => `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(q)}` },
  { id: "wellfound", name: "Wellfound", kind: "board", queryType: "plain", note: "Startup jobs — search opens, type query if not prefilled",
    build: (q) => `https://wellfound.com/jobs?query=${encodeURIComponent(q)}&remote=true` },
  { id: "hiringcafe", name: "Hiring.cafe", kind: "board", queryType: "plain", note: "Aggregates ATS boards — search manually",
    build: () => `https://hiring.cafe/` },
  { id: "himalayas", name: "Himalayas", kind: "board", queryType: "plain", note: "Remote board — search manually",
    build: () => `https://himalayas.app/jobs` },
  { id: "levels", name: "Levels.fyi", kind: "comp", queryType: "plain", note: "Compensation research — search manually",
    build: () => `https://www.levels.fyi/jobs` },
];

// Remote-scope cheat sheet.
export const REMOTE_GOOD_PHRASES = [
  "remote worldwide", "global remote", "work from anywhere", "remote — international",
  "remote — APAC", "remote — EMEA", "remote — LATAM", "anywhere in the world",
  "we hire through an EOR (Deel / Remote.com / Oyster)", "contractor — international",
  "async-first / timezone-flexible",
];

export const REMOTE_BAD_PHRASES = [
  "Remote — US", "Remote — USA", "Remote — North America",
  "must be authorized to work in the United States", "US citizens only",
  "must overlap with PT 9–5", "W2 employees only",
];
