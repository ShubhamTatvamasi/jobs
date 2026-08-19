// ============================================================
// Hidden Job Engine — UI + fetch orchestration.
// Load order: data.js → engine.js → app.js (no build step).
// ============================================================

window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.message, e.filename, e.lineno);
});

const state = {
  tab: "scanner",
  families: new Set(ROLE_FAMILIES.map((f) => f.key)),
  seniority: "staff",
  scope: "any-remote",
  minSalary: 0,
  keywords: "",
  sort: "salary",
  // fetched data (kept raw; filters re-apply instantly without refetching)
  atsJobs: null,
  atsStatus: {},
  scanning: false,
  aggJobs: null,
  aggErrors: [],
  aggLoading: false,
  hnJobs: null,
  hnError: null,
  hnThreadTitle: "",
  hnLoading: false,
  // deep-link builder
  clusters: new Set(["core"]),
  // pagination
  visible: { scanner: 60, agg: 60, hn: 60 },
};

const PAGE_SIZE = 60;
const CACHE_KEY = "hje-ats-cache-v2";
const CACHE_TTL_MS = 15 * 60 * 1000;

// ---------- tiny DOM helpers ----------

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function timeAgo(ms) {
  if (!ms) return "";
  const d = Date.now() - ms;
  const days = Math.floor(d / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

// ---------- filter context ----------

function filterCtx() {
  const seniority = SENIORITY_LEVELS.find((s) => s.id === state.seniority);
  return {
    families: ROLE_FAMILIES.filter((f) => state.families.has(f.key)),
    seniorityRe: seniority ? seniority.re : null,
    scope: state.scope,
    minSalary: state.minSalary,
    keywords: state.keywords.split(",").map((s) => s.trim()).filter(Boolean),
    excludeRe: EXCLUDE_TITLE_RE,
  };
}

// ---------- init ----------

function init() {
  buildTabs();
  buildControls();
  buildDeepLinkBuilder();
  renderCompanies();
  renderGuide();
  renderScanner();
  renderAggregators();
  renderHN();
  const cached = loadCache();
  if (cached) {
    state.atsJobs = cached.jobs;
    state.atsStatus = cached.status;
    renderScanner();
    renderCompanies();
  }
}

document.addEventListener("DOMContentLoaded", init);

// ---------- tabs ----------

const TABS = [
  { id: "scanner", label: "Hidden-Jobs Scan" },
  { id: "agg", label: "Aggregators" },
  { id: "hn", label: "HN Who's Hiring" },
  { id: "links", label: "Deep Links" },
  { id: "companies", label: "Companies" },
  { id: "guide", label: "Guide" },
];

function buildTabs() {
  const nav = $("tabNav");
  TABS.forEach((t) => {
    const b = el("button", "tab-btn" + (state.tab === t.id ? " active" : ""), t.label);
    b.dataset.tab = t.id;
    if (state.tab === t.id) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => switchTab(t.id));
    nav.appendChild(b);
  });
  updateTabVisibility();
}

function switchTab(id) {
  state.tab = id;
  document.querySelectorAll(".tab-btn").forEach((b) => {
    const active = b.dataset.tab === id;
    b.classList.toggle("active", active);
    if (active) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
  updateTabVisibility();
}

function updateTabVisibility() {
  TABS.forEach((t) => {
    const sec = $(`tab-${t.id}`);
    if (sec) sec.hidden = t.id !== state.tab;
  });
  $("controls").hidden = !["scanner", "agg", "hn"].includes(state.tab);
}

function setTabCount(id, n) {
  const btn = document.querySelector(`.tab-btn[data-tab="${id}"]`);
  const base = TABS.find((t) => t.id === id).label;
  if (btn) btn.textContent = n != null ? `${base} (${n})` : base;
}

// ---------- shared controls ----------

function buildControls() {
  // role family chips
  const famRow = $("familyChips");
  ROLE_FAMILIES.forEach((f) => {
    const chip = el("button", "chip" + (state.families.has(f.key) ? " active" : ""), f.label);
    chip.setAttribute("aria-pressed", String(state.families.has(f.key)));
    chip.addEventListener("click", () => {
      if (state.families.has(f.key)) state.families.delete(f.key);
      else state.families.add(f.key);
      chip.classList.toggle("active");
      chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
      onFiltersChanged();
    });
    famRow.appendChild(chip);
  });

  fillSelect($("senioritySelect"), SENIORITY_LEVELS.map((s) => [s.id, s.label]), state.seniority);
  fillSelect($("scopeSelect"), REMOTE_SCOPES.map((s) => [s.id, s.label]), state.scope);
  fillSelect($("salarySelect"), MIN_SALARY_OPTIONS.map((s) => [String(s.id), s.label]), String(state.minSalary));
  fillSelect($("sortSelect"), SORT_MODES.map((s) => [s.id, s.label]), state.sort);

  $("senioritySelect").addEventListener("change", (e) => { state.seniority = e.target.value; onFiltersChanged(); });
  $("scopeSelect").addEventListener("change", (e) => { state.scope = e.target.value; onFiltersChanged(); });
  $("salarySelect").addEventListener("change", (e) => { state.minSalary = Number(e.target.value); onFiltersChanged(); });
  $("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; onFiltersChanged(); });
  $("keywordsInput").addEventListener("input", (e) => { state.keywords = e.target.value; onFiltersChanged(); });
}

function fillSelect(sel, pairs, current) {
  pairs.forEach(([value, label]) => {
    const opt = el("option", "", label);
    opt.value = value;
    if (value === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function onFiltersChanged() {
  state.visible = { scanner: PAGE_SIZE, agg: PAGE_SIZE, hn: PAGE_SIZE };
  renderScanner();
  renderAggregators();
  renderHN();
  renderCompanies();
}

// ---------- generic fetch ----------

async function fetchJson(url, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------- ATS scanner ----------

$("scanBtn")?.addEventListener("click", () => scanATS(true));

async function scanATS(force) {
  if (state.scanning) return;
  if (!force && state.atsJobs) return;
  state.scanning = true;
  // Collected locally and assigned atomically at the end, so the Companies
  // tab keeps the previous scan's counts while a rescan is in flight.
  const status = {};
  const statusEl = $("scanStatus");
  const total = ATS_COMPANIES.length;
  let done = 0;
  let found = 0;
  const results = [];
  const queue = [...ATS_COMPANIES];

  const progress = () => {
    statusEl.innerHTML = "";
    statusEl.appendChild(el("span", "spinner"));
    statusEl.appendChild(document.createTextNode(
      ` Scanning company boards… ${done}/${total} · ${found.toLocaleString()} open roles indexed`));
    $("scanBar").style.width = `${Math.round((done / total) * 100)}%`;
  };
  progress();
  $("scanBarWrap").hidden = false;

  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      const adapter = ATS_ADAPTERS[c.ats];
      try {
        const data = await fetchJson(adapter.apiUrl(c));
        const jobs = adapter.normalize(c, data);
        results.push(...jobs);
        found += jobs.length;
        status[c.slug] = { ok: true, total: jobs.length };
      } catch (err) {
        status[c.slug] = { ok: false, error: err.name === "AbortError" ? "timeout" : err.message };
      }
      done++;
      progress();
    }
  }

  await Promise.all(Array.from({ length: 8 }, worker));

  state.atsJobs = results;
  state.atsStatus = status;
  state.scanning = false;
  $("scanBarWrap").hidden = true;
  saveCache(results, state.atsStatus);
  renderScanner();
  renderCompanies();
}

function renderScanner() {
  const grid = $("scanGrid");
  const statusEl = $("scanStatus");
  grid.innerHTML = "";

  if (!state.atsJobs) {
    // progress() owns the status line during a scan
    if (!state.scanning) {
      statusEl.textContent =
        `Ready to scan ${ATS_COMPANIES.length} verified company boards (Greenhouse, Ashby, Lever, SmartRecruiters) ` +
        `directly from your browser — no keys, no backend. These roles come straight from each company's ATS, ` +
        `including ones that never reach the big job boards.`;
    }
    return;
  }

  const filtered = sortJobs(applyFilters(state.atsJobs, filterCtx()), state.sort);
  if (!state.scanning) {
    const failures = Object.entries(state.atsStatus).filter(([, s]) => !s.ok);
    const withSalary = filtered.filter((j) => j.salaryMax > 0).length;
    statusEl.textContent =
      `${state.atsJobs.length.toLocaleString()} open roles indexed across ` +
      `${Object.keys(state.atsStatus).length} companies — ${filtered.length.toLocaleString()} match your filters` +
      ` (${withSalary} with posted salary).` +
      (failures.length ? ` Unreachable: ${failures.map(([slug]) => slug).join(", ")}.` : "");
  }
  setTabCount("scanner", filtered.length);
  renderJobCards(grid, filtered, "scanner");
}

// ---------- aggregators ----------

$("aggBtn")?.addEventListener("click", fetchAggregators);

async function fetchAggregators() {
  if (state.aggLoading) return;
  state.aggLoading = true;
  const statusEl = $("aggStatus");
  statusEl.innerHTML = "";
  statusEl.appendChild(el("span", "spinner"));
  statusEl.appendChild(document.createTextNode(" Fetching RemoteOK, Remotive and Jobicy…"));

  const famKeys = [...state.families];
  const searchTerms = (famKeys.length ? famKeys : Object.keys(FAMILY_SEARCH_TERMS))
    .map((k) => FAMILY_SEARCH_TERMS[k])
    .filter(Boolean);

  const tasks = [
    fetchJson(AGG_ENDPOINTS.remoteok).then((d) => AGG_ADAPTERS.remoteok(d)).catch((e) => ({ err: `RemoteOK: ${e.message}` })),
    ...searchTerms.map((t) =>
      fetchJson(AGG_ENDPOINTS.remotive(t)).then((d) => AGG_ADAPTERS.remotive(d)).catch((e) => ({ err: `Remotive(${t}): ${e.message}` }))),
    ...searchTerms.map((t) =>
      fetchJson(AGG_ENDPOINTS.jobicy(t)).then((d) => AGG_ADAPTERS.jobicy(d)).catch((e) => ({ err: `Jobicy(${t}): ${e.message}` }))),
  ];

  const settled = await Promise.all(tasks);
  state.aggErrors = settled.filter((r) => r && r.err).map((r) => r.err);
  state.aggJobs = dedupeJobs(settled.filter(Array.isArray).flat());
  state.aggLoading = false;
  renderAggregators();
}

function renderAggregators() {
  const grid = $("aggGrid");
  const statusEl = $("aggStatus");
  if (state.aggLoading) return;
  grid.innerHTML = "";
  if (!state.aggJobs) {
    statusEl.textContent =
      "Pulls current openings from RemoteOK, Remotive and Jobicy (all CORS-open, no keys), merged and de-duplicated, then run through your filters.";
    return;
  }
  const filtered = sortJobs(applyFilters(state.aggJobs, filterCtx()), state.sort);
  statusEl.textContent =
    `${state.aggJobs.length.toLocaleString()} remote listings pulled — ${filtered.length.toLocaleString()} match your filters.` +
    (state.aggErrors.length ? ` Some sources failed: ${state.aggErrors.join("; ")}.` : "");
  setTabCount("agg", filtered.length);
  renderJobCards(grid, filtered, "agg");
}

// ---------- HN Who's Hiring ----------

$("hnBtn")?.addEventListener("click", fetchHN);

async function fetchHN() {
  if (state.hnLoading) return;
  state.hnLoading = true;
  const statusEl = $("hnStatus");
  statusEl.innerHTML = "";
  statusEl.appendChild(el("span", "spinner"));
  statusEl.appendChild(document.createTextNode(" Finding the latest “Ask HN: Who is hiring?” thread…"));

  try {
    const threads = await fetchJson(HN_API.findThread);
    const thread = pickHiringThread(threads.hits);
    if (!thread) throw new Error("No hiring thread found");
    state.hnThreadTitle = thread.title;
    const comments = await fetchJson(HN_API.comments(thread.objectID));
    state.hnJobs = normalizeHNComments(thread.objectID, comments.hits);
    state.hnError = null;
  } catch (err) {
    state.hnJobs = null;
    state.hnError = err.message;
  }
  state.hnLoading = false;
  renderHN();
}

function renderHN() {
  const grid = $("hnGrid");
  const statusEl = $("hnStatus");
  if (state.hnLoading) return;
  grid.innerHTML = "";
  if (!state.hnJobs) {
    setTabCount("hn", null);
    statusEl.textContent = state.hnError
      ? `Could not fetch the HN thread (${state.hnError}). Open it directly: news.ycombinator.com → search "Ask HN: Who is hiring".`
      : "Every month HN runs an “Ask HN: Who is hiring?” thread — hundreds of direct-from-founder posts that never appear on any job board. This fetches the latest thread live and filters it to your role.";
    return;
  }
  // HN posts rarely carry parseable titles/locations, so seniority and salary
  // filters stay, but family matching runs against the full post text.
  const ctx = filterCtx();
  ctx.seniorityRe = null; // titles are free-form; don't over-filter
  const filtered = sortJobs(applyFilters(state.hnJobs, ctx), state.sort);
  statusEl.textContent =
    `${state.hnThreadTitle}: ${state.hnJobs.length} top-level posts — ${filtered.length} match your role families / filters.`;
  setTabCount("hn", filtered.length);
  renderJobCards(grid, filtered, "hn");
}

// ---------- job cards ----------

function renderJobCards(grid, jobs, tabKey) {
  const limit = state.visible[tabKey] || PAGE_SIZE;
  const shown = jobs.slice(0, limit);

  if (!jobs.length) {
    grid.appendChild(el("div", "empty-note",
      "No matches with the current filters. Try widening remote scope, lowering the salary floor, or setting seniority to “Any level”."));
    return;
  }

  shown.forEach((job) => {
    const a = el("a", "card job-card");
    a.href = safeUrl(job.url);
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const head = el("div", "card-head");
    head.appendChild(el("span", `card-badge src-${job.source.toLowerCase()}`, job.source));
    if (job.salaryText || job.salaryMax) {
      head.appendChild(el("span", "job-salary", job.salaryText || fmtSalaryNum(0, job.salaryMax)));
    }
    a.appendChild(head);

    a.appendChild(el("span", "card-title", job.title));
    if (job.company) a.appendChild(el("span", "card-sub", job.company + (job.dept ? ` · ${job.dept}` : "")));
    if (job.snippet) a.appendChild(el("p", "job-snippet", job.snippet.slice(0, 260) + (job.snippet.length > 260 ? "…" : "")));

    const meta = el("div", "job-meta");
    const rc = REMOTE_CLASS_META[job.remoteClass];
    if (rc) meta.appendChild(el("span", `pill rc-${job.remoteClass}`, rc.label));
    if (job.location) meta.appendChild(el("span", "pill", job.location.length > 40 ? job.location.slice(0, 40) + "…" : job.location));
    if (job.postedAt) meta.appendChild(el("span", "pill dim", timeAgo(job.postedAt)));
    a.appendChild(meta);

    grid.appendChild(a);
  });

  if (jobs.length > limit) {
    const more = el("button", "more-btn", `Show ${Math.min(PAGE_SIZE, jobs.length - limit)} more (${(jobs.length - limit).toLocaleString()} left)`);
    more.addEventListener("click", () => {
      state.visible[tabKey] = limit + PAGE_SIZE;
      if (tabKey === "scanner") renderScanner();
      else if (tabKey === "agg") renderAggregators();
      else renderHN();
    });
    grid.appendChild(more);
  }
}

// ---------- deep-link builder ----------

function buildDeepLinkBuilder() {
  const sel = $("titleSelect");
  TITLES.forEach((t) => {
    const opt = el("option", "", t.label);
    opt.value = t.label;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", renderLinks);

  const wrap = $("skillClusters");
  SKILL_CLUSTERS.forEach((c) => {
    const chip = el("button", "chip" + (state.clusters.has(c.key) ? " active" : ""), c.label);
    chip.setAttribute("aria-pressed", String(state.clusters.has(c.key)));
    chip.addEventListener("click", () => {
      if (state.clusters.has(c.key)) state.clusters.delete(c.key);
      else state.clusters.add(c.key);
      chip.classList.toggle("active");
      chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
      renderLinks();
    });
    wrap.appendChild(chip);
  });

  $("extraKeywords").addEventListener("input", renderLinks);
  renderLinks();
}

function selectedSkillTerms() {
  const terms = [];
  SKILL_CLUSTERS.filter((c) => state.clusters.has(c.key)).forEach((c) => {
    c.terms.forEach((t) => { if (!terms.includes(t)) terms.push(t); });
  });
  return terms;
}

function extraTerms() {
  return $("extraKeywords").value.split(",").map((s) => s.trim()).filter(Boolean);
}

function renderLinks() {
  const title = $("titleSelect").value;
  const skills = selectedSkillTerms();
  const extras = extraTerms();
  const booleanQuery = buildBooleanQuery(title, skills, extras);
  const plainQuery = buildPlainQuery(title, skills, extras);
  $("queryPreview").textContent = booleanQuery;

  const grid = $("linksGrid");
  grid.innerHTML = "";
  BOARDS.forEach((board) => {
    const q = board.queryType === "plain" ? plainQuery : booleanQuery;
    const a = el("a", "card");
    a.href = board.build(q);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.appendChild(el("span", "card-badge", board.kind));
    a.appendChild(el("span", "card-title", board.name));
    a.appendChild(el("span", "card-sub", board.note));
    grid.appendChild(a);
  });
}

// ---------- companies ----------

function renderCompanies() {
  const grid = $("companyGrid");
  grid.innerHTML = "";
  const tier = (n) => "$".repeat(n + 1);
  ATS_COMPANIES.forEach((c) => {
    const adapter = ATS_ADAPTERS[c.ats];
    const a = el("a", "card company-card");
    a.href = adapter.boardUrl(c);
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const head = el("div", "card-head");
    head.appendChild(el("span", `card-badge src-${c.ats}`, c.ats));
    head.appendChild(el("span", "pay-tier", tier(c.payTier)));
    a.appendChild(head);

    a.appendChild(el("span", "card-title", c.name));
    a.appendChild(el("span", "card-sub", c.note));

    const meta = el("div", "job-meta");
    meta.appendChild(el("span", `pill hiring-${c.hiring}`,
      c.hiring === "worldwide" ? "🌍 hires worldwide" : c.hiring === "multi-region" ? "multi-region" : "US-lean"));
    const st = state.atsStatus[c.slug];
    if (st && st.ok) meta.appendChild(el("span", "pill dim", `${st.total} open roles`));
    if (st && !st.ok) meta.appendChild(el("span", "pill dim", "unreachable"));
    a.appendChild(meta);
    grid.appendChild(a);
  });

  const extraGrid = $("extraCompanyGrid");
  extraGrid.innerHTML = "";
  EXTRA_TARGETS.forEach((c) => {
    const a = el("a", "card");
    a.href = c.careers;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.appendChild(el("span", "card-title", c.name));
    a.appendChild(el("span", "card-sub", c.note));
    extraGrid.appendChild(a);
  });
}

// ---------- guide ----------

function renderGuide() {
  const good = $("goodPhrases");
  const bad = $("badPhrases");
  REMOTE_GOOD_PHRASES.forEach((p) => good.appendChild(el("li", "", p)));
  REMOTE_BAD_PHRASES.forEach((p) => bad.appendChild(el("li", "", p)));
}

// ---------- cache ----------

function saveCache(jobs, status) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), jobs, status }));
  } catch (e) { /* quota exceeded — fine, cache is optional */ }
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c.t || Date.now() - c.t > CACHE_TTL_MS) return null;
    return c;
  } catch (e) {
    return null;
  }
}
