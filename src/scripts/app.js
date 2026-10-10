// ============================================================
// Hidden Job Engine — client glue: tabs, filters, live fetches,
// rendering. Static markup (controls, companies, guide, deep-link
// cards) is server-rendered by Astro; this wires it up.
// ============================================================

import {
  DEFAULT_FILTERS, ROLE_FAMILIES, SENIORITY_LEVELS, EXCLUDE_TITLE_RE, SKILL_CLUSTERS,
  ATS_COMPANIES, AGG_ENDPOINTS, FAMILY_SEARCH_TERMS, HN_API, BOARDS,
} from "../lib/data.js";
import {
  ATS_ADAPTERS, AGG_ADAPTERS, REMOTE_CLASS_META, applyFilters, sortJobs, dedupeJobs,
  pickHiringThread, normalizeHNComments, fmtSalaryNum, safeUrl, buildBooleanQuery, buildPlainQuery,
} from "../lib/engine.js";

const PAGE_SIZE = 60;
const CACHE_KEY = "hje-ats-cache-v2";
const CACHE_TTL_MS = 15 * 60 * 1000;
const TAB_IDS = ["scan", "agg", "hn", "links", "companies", "guide"];
const JOB_TABS = ["scan", "agg", "hn"];

const state = {
  tab: "scan",
  families: new Set(ROLE_FAMILIES.map((f) => f.key)),
  ...DEFAULT_FILTERS,
  keywords: "",
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
  clusters: new Set([SKILL_CLUSTERS[0].key]),
  visible: { scan: PAGE_SIZE, agg: PAGE_SIZE, hn: PAGE_SIZE },
};

// ---------- tiny DOM helpers ----------

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function setLoading(statusEl, text) {
  statusEl.replaceChildren(el("span", "spinner"), document.createTextNode(` ${text}`));
}

function timeAgo(ms) {
  if (!ms) return "";
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function toggleChip(chip, set, key) {
  if (set.has(key)) set.delete(key);
  else set.add(key);
  const on = set.has(key);
  chip.classList.toggle("is-on", on);
  chip.setAttribute("aria-pressed", String(on));
}

// ---------- theme ----------

// "system" clears the override so the CSS follows prefers-color-scheme.
function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === "light" || choice === "dark") root.dataset.theme = choice;
  else delete root.dataset.theme;
  document.querySelectorAll("[data-theme-choice]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.themeChoice === (root.dataset.theme || "system")));
  });
}

function initTheme() {
  applyTheme(document.documentElement.dataset.theme || "system");
  document.querySelectorAll("[data-theme-choice]").forEach((b) => {
    b.addEventListener("click", () => {
      const choice = b.dataset.themeChoice;
      applyTheme(choice);
      try {
        if (choice === "system") localStorage.removeItem("hje-theme");
        else localStorage.setItem("hje-theme", choice);
      } catch (e) { /* optional */ }
    });
  });
}

// ---------- tabs (hash-routed) ----------

function showTab(id) {
  state.tab = TAB_IDS.includes(id) ? id : "scan";
  document.querySelectorAll("[data-tab]").forEach((a) => {
    if (a.dataset.tab === state.tab) {
      a.setAttribute("aria-current", "page");
      // Keep the active tab visible in the horizontally scrolling mobile nav.
      a.parentElement.scrollLeft = a.offsetLeft - a.parentElement.offsetLeft - 16;
    } else {
      a.removeAttribute("aria-current");
    }
  });
  document.querySelectorAll("[data-tab-panel]").forEach((p) => {
    p.hidden = p.dataset.tabPanel !== state.tab;
  });
  $("filters").hidden = !JOB_TABS.includes(state.tab);
}

function setTabCount(id, n) {
  const badge = document.querySelector(`[data-count="${id}"]`);
  if (badge) badge.textContent = n != null ? n.toLocaleString() : "";
}

// ---------- filters ----------

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

function initFilters() {
  $("familyChips").querySelectorAll("[data-family]").forEach((chip) => {
    chip.addEventListener("click", () => {
      toggleChip(chip, state.families, chip.dataset.family);
      onFiltersChanged();
    });
  });
  const bind = (id, key, cast = (v) => v, evt = "change") =>
    $(id).addEventListener(evt, (e) => { state[key] = cast(e.target.value); onFiltersChanged(); });
  bind("senioritySelect", "seniority");
  bind("scopeSelect", "scope");
  bind("salarySelect", "minSalary", Number);
  bind("sortSelect", "sort");
  bind("keywordsInput", "keywords", String, "input");

  // Collapse filters by default on narrow screens.
  if (matchMedia("(max-width: 860px)").matches) $("filters").open = false;
}

function onFiltersChanged() {
  state.visible = { scan: PAGE_SIZE, agg: PAGE_SIZE, hn: PAGE_SIZE };
  renderScan();
  renderAgg();
  renderHN();
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

async function scanATS() {
  if (state.scanning) return;
  state.scanning = true;
  $("scanBtn").disabled = true;
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
    setLoading(statusEl, `Scanning company boards… ${done}/${total} · ${found.toLocaleString()} open roles indexed`);
    $("scanBar").style.width = `${Math.round((done / total) * 100)}%`;
  };
  progress();
  $("scanBarWrap").hidden = false;

  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      const adapter = ATS_ADAPTERS[c.ats];
      try {
        const jobs = adapter.normalize(c, await fetchJson(adapter.apiUrl(c)));
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
  $("scanBtn").disabled = false;
  $("scanBarWrap").hidden = true;
  saveCache(results, status);
  renderScan();
  renderCompanyCounts();
}

function renderScan() {
  const list = $("scanList");
  const statusEl = $("scanStatus");
  if (state.scanning) return; // progress() owns the status line
  list.replaceChildren();

  if (!state.atsJobs) {
    statusEl.textContent =
      `Ready to scan ${ATS_COMPANIES.length} verified company boards directly from your browser. ` +
      `These roles come straight from each company's ATS, including ones that never reach the big job boards.`;
    renderEmptyHint(list, "Press “Scan all boards” to index every open role.");
    return;
  }

  const filtered = sortJobs(applyFilters(state.atsJobs, filterCtx()), state.sort);
  const failures = Object.entries(state.atsStatus).filter(([, s]) => !s.ok);
  const withSalary = filtered.filter((j) => j.salaryMax > 0).length;
  statusEl.replaceChildren(
    statLine([
      [state.atsJobs.length.toLocaleString(), "roles indexed"],
      [Object.keys(state.atsStatus).length, "companies"],
      [filtered.length.toLocaleString(), "match", true],
      [withSalary, "with salary"],
    ]),
  );
  if (failures.length) {
    statusEl.appendChild(el("p", "status-warn", `Unreachable: ${failures.map(([slug]) => slug).join(", ")}`));
  }
  setTabCount("scan", filtered.length);
  renderJobs(list, filtered, "scan");
}

// ---------- aggregators ----------

async function fetchAggregators() {
  if (state.aggLoading) return;
  state.aggLoading = true;
  $("aggBtn").disabled = true;
  setLoading($("aggStatus"), "Fetching RemoteOK, Remotive and Jobicy…");

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
  $("aggBtn").disabled = false;
  renderAgg();
}

function renderAgg() {
  const list = $("aggList");
  const statusEl = $("aggStatus");
  if (state.aggLoading) return;
  list.replaceChildren();
  if (!state.aggJobs) {
    statusEl.textContent = "Pulls current openings from three CORS-open remote boards — no keys required.";
    renderEmptyHint(list, "Press “Fetch listings” to pull live remote roles.");
    return;
  }
  const filtered = sortJobs(applyFilters(state.aggJobs, filterCtx()), state.sort);
  statusEl.replaceChildren(statLine([
    [state.aggJobs.length.toLocaleString(), "listings pulled"],
    [filtered.length.toLocaleString(), "match", true],
  ]));
  if (state.aggErrors.length) {
    statusEl.appendChild(el("p", "status-warn", `Some sources failed: ${state.aggErrors.join("; ")}`));
  }
  setTabCount("agg", filtered.length);
  renderJobs(list, filtered, "agg");
}

// ---------- HN Who's Hiring ----------

async function fetchHN() {
  if (state.hnLoading) return;
  state.hnLoading = true;
  $("hnBtn").disabled = true;
  setLoading($("hnStatus"), "Finding the latest “Ask HN: Who is hiring?” thread…");

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
  $("hnBtn").disabled = false;
  renderHN();
}

function renderHN() {
  const list = $("hnList");
  const statusEl = $("hnStatus");
  if (state.hnLoading) return;
  list.replaceChildren();
  if (!state.hnJobs) {
    setTabCount("hn", null);
    statusEl.textContent = state.hnError
      ? `Could not fetch the HN thread (${state.hnError}). Open it directly: news.ycombinator.com → search “Ask HN: Who is hiring”.`
      : "Every month HN runs an “Ask HN: Who is hiring?” thread with hundreds of direct-from-founder posts.";
    if (!state.hnError) renderEmptyHint(list, "Press “Fetch latest thread” to filter it to your role.");
    return;
  }
  // HN posts rarely carry parseable titles/locations, so seniority is
  // relaxed and family matching runs against the full post text.
  const ctx = filterCtx();
  ctx.seniorityRe = null;
  const filtered = sortJobs(applyFilters(state.hnJobs, ctx), state.sort);
  statusEl.replaceChildren(statLine([
    [state.hnJobs.length, "top-level posts"],
    [filtered.length, "match", true],
  ]));
  statusEl.appendChild(el("p", "status-sub", state.hnThreadTitle));
  setTabCount("hn", filtered.length);
  renderJobs(list, filtered, "hn");
}

// ---------- job rows ----------

function statLine(items) {
  const wrap = el("div", "stat-line");
  items.forEach(([value, label, strong]) => {
    const s = el("span", strong ? "stat strong" : "stat");
    s.append(el("b", "", String(value)), document.createTextNode(` ${label}`));
    wrap.appendChild(s);
  });
  return wrap;
}

function renderEmptyHint(list, text) {
  list.appendChild(el("div", "empty", text));
}

function renderJobs(list, jobs, tabKey) {
  const limit = state.visible[tabKey] || PAGE_SIZE;

  if (!jobs.length) {
    list.appendChild(el("div", "empty",
      "No matches with the current filters. Try widening remote scope, lowering the salary floor, or setting seniority to “Any level”."));
    return;
  }

  const frag = document.createDocumentFragment();
  jobs.slice(0, limit).forEach((job) => {
    const a = el("a", "job");
    a.href = safeUrl(job.url);
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    a.appendChild(el("span", `monogram src-${job.source.toLowerCase()}`, (job.company || job.source)[0]));

    const body = el("span", "job-body");
    body.appendChild(el("span", "job-title", job.title));
    const sub = [job.company, job.dept].filter(Boolean).join(" · ");
    if (sub) body.appendChild(el("span", "job-sub", sub));
    if (job.snippet) {
      body.appendChild(el("span", "job-snippet", job.snippet.slice(0, 260) + (job.snippet.length > 260 ? "…" : "")));
    }
    const pills = el("span", "pills");
    const rc = REMOTE_CLASS_META[job.remoteClass];
    if (rc) pills.appendChild(el("span", `pill rc-${job.remoteClass}`, rc.label));
    if (job.location) {
      pills.appendChild(el("span", "pill dim", job.location.length > 42 ? job.location.slice(0, 42) + "…" : job.location));
    }
    pills.appendChild(el("span", "pill dim", job.source));
    body.appendChild(pills);
    a.appendChild(body);

    const side = el("span", "job-side");
    if (job.salaryText || job.salaryMax) {
      side.appendChild(el("span", "salary", job.salaryText || fmtSalaryNum(0, job.salaryMax)));
    }
    if (job.postedAt) side.appendChild(el("span", "posted", timeAgo(job.postedAt)));
    a.appendChild(side);

    frag.appendChild(a);
  });
  list.appendChild(frag);

  if (jobs.length > limit) {
    const more = el("button", "btn btn-ghost more",
      `Show ${Math.min(PAGE_SIZE, jobs.length - limit)} more · ${(jobs.length - limit).toLocaleString()} left`);
    more.type = "button";
    more.addEventListener("click", () => {
      state.visible[tabKey] = limit + PAGE_SIZE;
      ({ scan: renderScan, agg: renderAgg, hn: renderHN })[tabKey]();
    });
    list.appendChild(more);
  }
}

// ---------- deep-link builder ----------

function initDeepLinks() {
  $("titleSelect").addEventListener("change", renderLinks);
  $("extraKeywords").addEventListener("input", renderLinks);
  $("skillChips").querySelectorAll("[data-cluster]").forEach((chip) => {
    chip.addEventListener("click", () => {
      toggleChip(chip, state.clusters, chip.dataset.cluster);
      renderLinks();
    });
  });
}

function renderLinks() {
  const title = $("titleSelect").value;
  const skills = [];
  SKILL_CLUSTERS.filter((c) => state.clusters.has(c.key)).forEach((c) => {
    c.terms.forEach((t) => { if (!skills.includes(t)) skills.push(t); });
  });
  const extras = $("extraKeywords").value.split(",").map((s) => s.trim()).filter(Boolean);
  const booleanQuery = buildBooleanQuery(title, skills, extras);
  const plainQuery = buildPlainQuery(title, skills, extras);
  $("queryPreview").textContent = booleanQuery;

  BOARDS.forEach((board) => {
    const a = document.querySelector(`[data-board="${board.id}"]`);
    if (a) a.href = board.build(board.queryType === "plain" ? plainQuery : booleanQuery);
  });
}

// ---------- companies ----------

function renderCompanyCounts() {
  document.querySelectorAll("[data-slug]").forEach((card) => {
    const pill = card.querySelector("[data-roles]");
    const st = state.atsStatus[card.dataset.slug];
    if (!pill || !st) return;
    pill.hidden = false;
    pill.textContent = st.ok ? `${st.total} open roles` : "unreachable";
  });
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

// ---------- init ----------

function init() {
  initTheme();
  initFilters();
  initDeepLinks();
  renderLinks();

  $("scanBtn").addEventListener("click", scanATS);
  $("aggBtn").addEventListener("click", fetchAggregators);
  $("hnBtn").addEventListener("click", fetchHN);

  const cached = loadCache();
  if (cached) {
    state.atsJobs = cached.jobs;
    state.atsStatus = cached.status;
    renderCompanyCounts();
  }
  renderScan();
  renderAgg();
  renderHN();

  showTab(location.hash.slice(1));
  window.addEventListener("hashchange", () => {
    showTab(location.hash.slice(1));
    document.querySelector(".app").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

init();
