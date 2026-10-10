// ============================================================
// Hidden Job Engine — data registry (ES module)
// Tuned for senior AI-infrastructure roles: inference / model
// serving, GPU clusters and data centers, ML platforms, and the
// Kubernetes / DevOps / SRE work underneath them.
//
// Every API endpoint, company slug, and deep link below was
// verified live on VERIFIED_ON (HTTP 200 + CORS-open where the
// browser fetches it directly).
// ============================================================

export const VERIFIED_ON = "2026-10-10";

// Role families used to match job titles. `re` runs against the job title
// (and tags where available). Ordered from most to least AI-specific;
// `boost` adds to the match score so AI-specific titles outrank generic ones.
export const ROLE_FAMILIES = [
  { key: "inference", boost: 3, label: "Inference / Model serving", re: /(inference|model serving|serving (infra|platform|systems)|llm serving|vllm|triton|tensorrt|sglang|kserve)/i },
  { key: "gpu", boost: 3, label: "GPU / HPC clusters", re: /(\bgpus?\b|accelerator|cuda|\bhpc\b|supercomput|(compute|cluster) (infra|platform|engineer|architect|management)|fleet (engineer|management|reliability)|\bslurm\b)/i },
  { key: "mlinfra", boost: 2, label: "AI / ML platform", re: /(ml ?infra|machine learning infra|ai infra|ml platform|ai platform|ml ?ops|llm ?ops|training (infra|platform)|research infra|ai cloud)/i },
  { key: "datacenter", boost: 1, label: "Data center", re: /(data ?cent(er|re)|datacenter|critical (facilities|environment)|infiniband|\brdma\b|roce|network (engineer|architect)|hardware (engineer|reliability))/i },
  { key: "k8s", boost: 1, label: "Kubernetes", re: /(kubernetes|\bk8s\b|container platform|orchestration|openshift)/i },
  { key: "platform", label: "Platform / DevOps / SRE", re: /(platform|infrastructure|\binfra\b|devops|\bsre\b|site reliability|reliability engineer|production engineer|cloud engineer)/i },
];

// Titles matching this are never engineering/architecture roles, even when
// they contain words like "infrastructure" or "platform" (e.g. "Tax Director -
// Infrastructure & Incentives", "Staff Product Manager, Data Platform",
// "Construction Project Manager, Data Centers"). Facility trades (electrical,
// mechanical, controls, commissioning) and hardware manufacturing are out of
// scope for software/infra searches. Tune freely.
export const EXCLUDE_TITLE_RE = /(product manage|product design|program manag|project manag|\baccounts?\b|field cto|solutions consultant|sales|marketing|recruit|talent|sourcer|attorney|legal|counsel|paralegal|\btax\b|account(ant|ing)|payroll|people (ops|operations|partner)|human resources|customer success|community|content|copywriter|executive assistant|workplace|physician|clinical|financ|construction|real estate|procurement|supply chain|sourcing|site selection|energy (development|procurement)|government affairs|policy|manufactur|pcba|mechanical|electrical|\bhvac\b|controls (engineer|technician)|commissioning|quality engineer)/i;

// Titles that state a level. A title with none of these words ("Software
// Engineer, Dedicated Inference", "Member of Technical Staff") is common at
// AI startups and labs, which often level after the interview loop.
const LEVELLED_RE = /(junior|\bjr\.?\b|intern|associate|entry|new grad|graduate|apprentice|senior|\bsr\.?\b|mid[- ]?level|\b(i|ii|iii|iv|1|2|3)\b|technician|\blead\b|manager)/i;
// "Member of Technical Staff" spans several levels, so it is not a Staff signal.
const STAFF_RE = /((?<!technical )staff|principal|distinguished|architect|\bhead\b|director|\bvp\b|fellow)/i;

// `re` only needs a .test(title) method, so a level can be a predicate.
export const SENIORITY_LEVELS = [
  { id: "staff-open", label: "Staff+ or unlevelled", re: { test: (t) => STAFF_RE.test(t) || !LEVELLED_RE.test(t) } },
  { id: "staff", label: "Staff / Principal +", re: STAFF_RE },
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
  { id: 200000, label: "≥ $200k" },
  { id: 250000, label: "≥ $250k" },
  { id: 300000, label: "≥ $300k" },
  { id: 400000, label: "≥ $400k" },
];

// Initial filter state, shared by the server-rendered controls and the
// client script so the page never flashes a different selection.
export const DEFAULT_FILTERS = {
  seniority: "staff-open",
  scope: "us",
  minSalary: 0,
  sort: "salary",
};

export const SORT_MODES = [
  { id: "salary", label: "Highest salary" },
  { id: "match", label: "Best match" },
  { id: "newest", label: "Newest" },
];

// Job titles for the deep-link query builder — the wording AI-infra
// employers actually post, most specific first.
export const TITLES = [
  { label: "Inference Infrastructure Engineer" },
  { label: "ML Infrastructure Engineer" },
  { label: "AI Infrastructure Engineer" },
  { label: "GPU Infrastructure Engineer" },
  { label: "HPC Engineer" },
  { label: "Staff Software Engineer, Inference" },
  { label: "Member of Technical Staff, Infrastructure" },
  { label: "AI Platform Engineer" },
  { label: "GPU Cluster Architect" },
  { label: "Data Center Architect" },
  { label: "Kubernetes Platform Engineer" },
  { label: "Staff Site Reliability Engineer" },
  { label: "Principal Platform Engineer" },
];

// Skill clusters — used by the deep-link query builder and as boost ideas.
export const SKILL_CLUSTERS = [
  { key: "serving", label: "Model serving", terms: ["vLLM", "KServe", "Triton", "SGLang"] },
  { key: "gpu", label: "GPU operations", terms: ["GPU", "CUDA", "DCGM", "GPU Operator"] },
  { key: "cluster", label: "HPC & networking", terms: ["InfiniBand", "RDMA", "Slurm", "NCCL"] },
  { key: "k8s", label: "Kubernetes & GitOps", terms: ["Kubernetes", "Helm", "Argo CD", "Flux"] },
  { key: "scale", label: "Autoscaling & observability", terms: ["KEDA", "Prometheus", "Grafana", "OpenTelemetry"] },
  { key: "dist", label: "Distributed compute", terms: ["Ray", "Kueue", "PyTorch", "Distributed training"] },
  { key: "cloud", label: "Cloud & IaC", terms: ["Terraform", "AWS", "GCP", "Azure"] },
];

// ------------------------------------------------------------
// The hidden-jobs channel: companies whose ATS boards expose a
// public, CORS-open JSON API the browser can scan directly.
// ats: greenhouse | ashby | lever | smartrecruiters
// group: gpu-cloud | inference | lab | silicon | platform
// payTier: 3 = top-of-market, 2 = strong, 1 = solid
// hiring: worldwide | multi-region | us-lean  (measured from each board's
//   current location mix on VERIFIED_ON; a rough guide only)
// ------------------------------------------------------------
export const COMPANY_GROUPS = [
  { id: "gpu-cloud", label: "GPU clouds & AI data centers" },
  { id: "inference", label: "Inference & model-serving platforms" },
  { id: "lab", label: "Frontier labs & AI-native products" },
  { id: "silicon", label: "AI silicon" },
  { id: "platform", label: "ML platforms & cloud-native infra" },
];

export const ATS_COMPANIES = [
  // GPU clouds & AI data centers
  { group: "gpu-cloud", name: "CoreWeave", ats: "greenhouse", slug: "coreweave", payTier: 3, hiring: "us-lean", note: "Largest neocloud; heavy data-center and fleet-engineering hiring, mostly on-site" },
  { group: "gpu-cloud", name: "Lambda", ats: "ashby", slug: "lambda", payTier: 3, hiring: "us-lean", note: "GPU cloud; posts salary bands, strong Staff+ compute / fleet / HPC volume" },
  { group: "gpu-cloud", name: "Crusoe", ats: "ashby", slug: "crusoe", payTier: 2, hiring: "us-lean", note: "AI data centers + cloud; managed Kubernetes and orchestration teams" },
  { group: "gpu-cloud", name: "Nebius", ats: "greenhouse", slug: "nebius", payTier: 2, hiring: "multi-region", note: "Neocloud with EU/US/APAC hubs; GPU cluster architects, some India roles" },
  { group: "gpu-cloud", name: "Together AI", ats: "greenhouse", slug: "togetherai", payTier: 3, hiring: "multi-region", note: "GPU cloud + inference; AI-infrastructure systems roles incl. Bangalore" },
  { group: "gpu-cloud", name: "Fluidstack", ats: "ashby", slug: "fluidstack", payTier: 2, hiring: "us-lean", note: "Large-scale GPU clusters for labs; data-center architecture roles" },
  { group: "gpu-cloud", name: "Vultr", ats: "ashby", slug: "vultr", payTier: 1, hiring: "multi-region", note: "Cloud + GPU; many remote roles and an India team" },
  { group: "gpu-cloud", name: "TensorWave", ats: "ashby", slug: "tensorwave", payTier: 2, hiring: "us-lean", note: "AMD-GPU cloud; remote Kubernetes-platform and network roles" },
  { group: "gpu-cloud", name: "RunPod", ats: "ashby", slug: "runpod", payTier: 2, hiring: "multi-region", note: "Serverless GPU cloud; fully remote team" },
  { group: "gpu-cloud", name: "Vast.ai", ats: "ashby", slug: "vastai", payTier: 1, hiring: "us-lean", note: "GPU marketplace; GPU systems / HPC support engineers" },
  { group: "gpu-cloud", name: "Hyperbolic", ats: "ashby", slug: "hyperbolic", payTier: 2, hiring: "us-lean", note: "GPU cloud + inference; forward-deployed infra roles" },
  { group: "gpu-cloud", name: "SF Compute", ats: "ashby", slug: "sfcompute", payTier: 2, hiring: "us-lean", note: "GPU compute market; HPC / GPU cluster architects" },
  { group: "gpu-cloud", name: "Prime Intellect", ats: "ashby", slug: "primeintellect", payTier: 2, hiring: "us-lean", note: "Decentralized training + GPU infra; remote-friendly MTS roles" },
  { group: "gpu-cloud", name: "DigitalOcean", ats: "greenhouse", slug: "digitalocean98", payTier: 2, hiring: "multi-region", note: "GPU droplets / AI cloud; large India engineering presence" },
  // Inference & model-serving platforms
  { group: "inference", name: "Fireworks AI", ats: "ashby", slug: "fireworks", payTier: 3, hiring: "us-lean", note: "Inference cloud; posts bands, MTS infra / training-infra roles" },
  { group: "inference", name: "Baseten", ats: "ashby", slug: "baseten", payTier: 3, hiring: "us-lean", note: "Inference platform; dedicated-inference, SRE and cloud-platform roles" },
  { group: "inference", name: "Modal", ats: "ashby", slug: "modal", payTier: 3, hiring: "us-lean", note: "Serverless GPU compute; inference-runtime and platform roles" },
  { group: "inference", name: "Anyscale", ats: "ashby", slug: "anyscale", payTier: 3, hiring: "multi-region", note: "Ray; distributed LLM inference + platform infra, India team" },
  { group: "inference", name: "Inferact", ats: "ashby", slug: "inferact", payTier: 3, hiring: "us-lean", note: "vLLM company; remote MTS roles in inference and cloud orchestration" },
  { group: "inference", name: "RadixArk", ats: "ashby", slug: "radixark", payTier: 2, hiring: "us-lean", note: "SGLang company; inference-engine and serving roles" },
  { group: "inference", name: "OpenRouter", ats: "ashby", slug: "openrouter", payTier: 2, hiring: "us-lean", note: "LLM routing gateway; remote SRE / provider-operations roles" },
  { group: "inference", name: "Ollama", ats: "ashby", slug: "ollama", payTier: 2, hiring: "us-lean", note: "Local / self-hosted model runtime" },
  { group: "inference", name: "Deepgram", ats: "ashby", slug: "deepgram", payTier: 2, hiring: "multi-region", note: "Voice AI; remote Kubernetes / ML-ops infra roles" },
  { group: "inference", name: "ElevenLabs", ats: "ashby", slug: "elevenlabs", payTier: 2, hiring: "worldwide", note: "Voice AI; distributed team incl. India, inference research engineers" },
  { group: "inference", name: "Pinecone", ats: "ashby", slug: "pinecone", payTier: 2, hiring: "us-lean", note: "Vector database; US-remote retrieval-infra roles with bands" },
  // Frontier labs & AI-native products
  { group: "lab", name: "OpenAI", ats: "ashby", slug: "openai", payTier: 3, hiring: "multi-region", note: "Top-of-market bands; compute, fleet and inference infrastructure" },
  { group: "lab", name: "Anthropic", ats: "greenhouse", slug: "anthropic", payTier: 3, hiring: "multi-region", note: "Top-of-market comp; data-center, compute and inference infra" },
  { group: "lab", name: "xAI", ats: "greenhouse", slug: "xai", payTier: 3, hiring: "us-lean", note: "Colossus supercomputer buildout; some roles listed as global" },
  { group: "lab", name: "Cohere", ats: "ashby", slug: "cohere", payTier: 3, hiring: "multi-region", note: "Enterprise LLMs; inference infrastructure, US/CA/EU" },
  { group: "lab", name: "Perplexity", ats: "ashby", slug: "perplexity", payTier: 3, hiring: "us-lean", note: "AI inference + AI infrastructure MTS roles with bands" },
  { group: "lab", name: "Character.AI", ats: "ashby", slug: "character", payTier: 3, hiring: "us-lean", note: "ML infrastructure for very high-QPS serving" },
  { group: "lab", name: "Thinking Machines", ats: "ashby", slug: "thinkingmachines", payTier: 3, hiring: "us-lean", note: "Frontier lab; inference + infra + post-training SRE, on-site" },
  { group: "lab", name: "Reka", ats: "ashby", slug: "reka", payTier: 2, hiring: "worldwide", note: "Multimodal lab; remote GPU-performance roles" },
  { group: "lab", name: "Poolside", ats: "ashby", slug: "poolside", payTier: 3, hiring: "multi-region", note: "Coding models; inference-infrastructure engineering" },
  { group: "lab", name: "Cognition", ats: "ashby", slug: "cognition", payTier: 3, hiring: "multi-region", note: "Devin; ML infrastructure and infra engineering" },
  { group: "lab", name: "Cursor (Anysphere)", ats: "ashby", slug: "cursor", payTier: 3, hiring: "multi-region", note: "AI coding; large inference footprint, some India roles" },
  { group: "lab", name: "Zyphra", ats: "ashby", slug: "zyphra", payTier: 2, hiring: "us-lean", note: "Open models; platform engineering" },
  // AI silicon
  { group: "silicon", name: "Cerebras", ats: "ashby", slug: "cerebras", payTier: 3, hiring: "multi-region", note: "Wafer-scale inference cloud; inference-platform + cluster roles, India team" },
  { group: "silicon", name: "SambaNova", ats: "greenhouse", slug: "sambanovasystems", payTier: 2, hiring: "multi-region", note: "AI chips + cloud; India presence" },
  { group: "silicon", name: "Etched", ats: "ashby", slug: "etched", payTier: 3, hiring: "us-lean", note: "Transformer ASIC; supercomputing and infra-software roles" },
  { group: "silicon", name: "Tenstorrent", ats: "greenhouse", slug: "tenstorrent", payTier: 2, hiring: "multi-region", note: "RISC-V AI chips; data-center workload roles, India team" },
  { group: "silicon", name: "d-Matrix", ats: "ashby", slug: "d-matrix", payTier: 2, hiring: "us-lean", note: "Inference silicon; LLM-inference + platform software" },
  { group: "silicon", name: "MatX", ats: "ashby", slug: "matx", payTier: 2, hiring: "us-lean", note: "LLM chips; node and cluster-management software" },
  { group: "silicon", name: "Graphcore", ats: "greenhouse", slug: "graphcore", payTier: 2, hiring: "multi-region", note: "IPU / SoftBank; infrastructure + MLOps roles, India team" },
  // ML platforms & cloud-native infra
  { group: "platform", name: "Databricks", ats: "greenhouse", slug: "databricks", payTier: 3, hiring: "multi-region", note: "Mosaic AI / model serving; big Bengaluru hub" },
  { group: "platform", name: "Scale AI", ats: "greenhouse", slug: "scaleai", payTier: 3, hiring: "us-lean", note: "Frontier AI infrastructure + GenAI platform" },
  { group: "platform", name: "Cloudflare", ats: "greenhouse", slug: "cloudflare", payTier: 2, hiring: "multi-region", note: "Workers AI — GPU inference at the edge" },
  { group: "platform", name: "Datadog", ats: "greenhouse", slug: "datadog", payTier: 3, hiring: "multi-region", note: "Observability incl. GPU / LLM monitoring; top infra comp" },
  { group: "platform", name: "Grafana Labs", ats: "greenhouse", slug: "grafanalabs", payTier: 2, hiring: "worldwide", note: "All-remote; observability stack used across GPU fleets" },
  { group: "platform", name: "GitLab", ats: "greenhouse", slug: "gitlab", payTier: 2, hiring: "worldwide", note: "All-remote incl. India; AI agent platform + infra" },
  { group: "platform", name: "Canonical", ats: "greenhouse", slug: "canonical", payTier: 1, hiring: "worldwide", note: "Fully remote; Kubeflow, Charmed Kubernetes, GPU enablement" },
  { group: "platform", name: "Docker", ats: "ashby", slug: "docker", payTier: 2, hiring: "multi-region", note: "Docker Model Runner, container infra" },
  { group: "platform", name: "Sysdig", ats: "lever", slug: "sysdig", payTier: 2, hiring: "multi-region", note: "K8s runtime security; AI-platform roles" },
  { group: "platform", name: "Replit", ats: "ashby", slug: "replit", payTier: 3, hiring: "us-lean", note: "AI app platform; K8s-heavy infra with posted bands" },
  { group: "platform", name: "Pinterest", ats: "greenhouse", slug: "pinterest", payTier: 3, hiring: "us-lean", note: "US-remote AI-platform and serving-infra roles" },
  { group: "platform", name: "Reddit", ats: "greenhouse", slug: "reddit", payTier: 3, hiring: "us-lean", note: "US-remote ML platform / serving infra" },
];

// AI-infra employers whose careers site has no public CORS-open API
// (Workday, Gem, Workable, custom) — check manually.
export const EXTRA_TARGETS = [
  { name: "NVIDIA", careers: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", note: "DGX Cloud, GPU Operator, NIM; large India teams (Bengaluru, Hyderabad, Pune)" },
  { name: "AMD", careers: "https://careers.amd.com/careers-home/jobs", note: "Instinct GPUs + ROCm; India engineering presence" },
  { name: "Groq", careers: "https://jobs.gem.com/groq", note: "LPU inference cloud (Gem board)" },
  { name: "Hugging Face", careers: "https://apply.workable.com/huggingface/", note: "Remote-first; inference endpoints, TGI (Workable board)" },
  { name: "Mistral AI", careers: "https://mistral.ai/careers", note: "EU frontier lab building its own compute" },
  { name: "DeepInfra", careers: "https://jobs.gem.com/deep-infra", note: "Inference API; some EU-remote roles (Gem board)" },
  { name: "Voltage Park", careers: "https://www.voltagepark.com/careers", note: "Non-profit-backed H100 cloud" },
  { name: "Nscale", careers: "https://www.nscale.com/careers", note: "European AI hyperscaler / data centers" },
  { name: "Red Hat", careers: "https://www.redhat.com/en/jobs", note: "OpenShift AI, llm-d, vLLM upstream; many India-remote reqs" },
  { name: "Microsoft (Azure AI infra)", careers: "https://jobs.careers.microsoft.com/global/en/search?q=GPU%20infrastructure", note: "Azure AI supercomputing; India hubs" },
  { name: "Google (Cloud TPU / GKE)", careers: "https://www.google.com/about/careers/applications/jobs/results/?q=ML%20infrastructure", note: "GKE AI, TPU fleet; India hubs" },
  { name: "Meta (AI infra)", careers: "https://www.metacareers.com/jobs?q=AI%20infrastructure", note: "Research SuperCluster, inference fleet" },
  { name: "Oracle (OCI AI)", careers: "https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions?keyword=GPU", note: "OCI superclusters; large India presence" },
];

// Aggregator + community APIs, all verified CORS-open (no key needed).
export const AGG_ENDPOINTS = {
  remoteok: "https://remoteok.com/api",
  remotive: (q) => `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=100`,
  jobicy: (q) => `https://jobicy.com/api/v2/remote-jobs?count=100&tag=${encodeURIComponent(q)}`,
};

// One search term per role family, for APIs that take a keyword.
export const FAMILY_SEARCH_TERMS = {
  inference: "inference",
  gpu: "gpu",
  mlinfra: "mlops",
  datacenter: "data center",
  k8s: "kubernetes",
  platform: "platform engineer",
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
  { id: "inferencejobs", name: "Inference Jobs", kind: "ai board", queryType: "plain", note: "Board dedicated to inference / GPU-infra roles",
    build: (q) => `https://www.inferencejobs.com/jobs?q=${encodeURIComponent(q)}` },
  { id: "aijobs", name: "aijobs.net", kind: "ai board", queryType: "plain", note: "AI/ML jobs, filtered to remote",
    build: (q) => `https://aijobs.net/?key=${encodeURIComponent(q)}&remote=true` },
  { id: "a16z", name: "a16z portfolio jobs", kind: "vc board", queryType: "plain", note: "Jobs across a16z's AI portfolio (Mistral, etc.)",
    build: (q) => `https://jobs.a16z.com/jobs?q=${encodeURIComponent(q)}` },
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
  "remote — APAC", "remote — EMEA", "remote — LATAM", "remote — India", "anywhere in the world",
  "we hire through an EOR (Deel / Remote.com / Oyster)", "contractor — international",
  "async-first / timezone-flexible",
];

export const REMOTE_BAD_PHRASES = [
  "Remote — US", "Remote — USA", "Remote — North America",
  "must be authorized to work in the United States", "US citizens only",
  "must overlap with PT 9–5", "W2 employees only",
];
