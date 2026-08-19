// Hidden Job Engine — client-side logic. No backend, no build step.

window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.message, e.filename, e.lineno);
});

if (typeof TITLES === "undefined" || typeof BOARDS === "undefined") {
  console.error(
    "data.js did not load before app.js — check the <script> order in index.html and that data.js returns HTTP 200."
  );
}

const state = {
  selectedClusters: new Set(["core"]),
  // Off by default — adding a mandatory "remote worldwide"/etc. exact-phrase
  // clause to the query returned no results in practice, since most real job
  // posts never contain that literal wording. Use the chips to opt back in
  // and try it, or just read the cheat-sheet below and judge posts yourself.
  remoteScope: "none",
};

const REMOTE_SCOPE_OPTIONS = [
  { id: "none", label: "None (recommended)", terms: [] },
  { id: "worldwide", label: "Remote Worldwide", terms: ["remote worldwide", "work from anywhere", "global remote"] },
  { id: "india", label: "Remote - India", terms: ["remote india", "remote - india"] },
  { id: "apac", label: "Remote - APAC", terms: ["remote apac", "remote - apac"] },
];

function init() {
  const steps = [
    populateTitles,
    populateSkillClusters,
    populateRemoteScope,
    populateCompanies,
    populateCheatSheet,
    updatePreview,
  ];
  steps.forEach((step) => {
    try {
      step();
    } catch (err) {
      console.error(`Init step "${step.name}" failed:`, err);
    }
  });

  document.getElementById("titleSelect").addEventListener("change", updatePreview);
  document.getElementById("extraKeywords").addEventListener("input", updatePreview);
  document.getElementById("buildBtn").addEventListener("click", renderLinks);
  document.getElementById("liveBtn").addEventListener("click", fetchLive);

  renderLinks();
}

function populateTitles() {
  const sel = document.getElementById("titleSelect");
  TITLES.sort((a, b) => b.weight - a.weight).forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.label;
    opt.textContent = t.label;
    sel.appendChild(opt);
  });
}

function populateSkillClusters() {
  const wrap = document.getElementById("skillClusters");
  SKILL_CLUSTERS.forEach((c) => {
    const chip = document.createElement("div");
    chip.className = "chip" + (state.selectedClusters.has(c.key) ? " active" : "");
    chip.textContent = c.label;
    chip.dataset.key = c.key;
    chip.addEventListener("click", () => {
      if (state.selectedClusters.has(c.key)) {
        state.selectedClusters.delete(c.key);
      } else {
        state.selectedClusters.add(c.key);
      }
      chip.classList.toggle("active");
      updatePreview();
    });
    wrap.appendChild(chip);
  });
}

function populateRemoteScope() {
  const wrap = document.getElementById("remoteScope");
  REMOTE_SCOPE_OPTIONS.forEach((r) => {
    const chip = document.createElement("div");
    chip.className = "chip" + (state.remoteScope === r.id ? " active" : "");
    chip.textContent = r.label;
    chip.dataset.id = r.id;
    chip.addEventListener("click", () => {
      state.remoteScope = r.id;
      document
        .querySelectorAll("#remoteScope .chip")
        .forEach((c) => c.classList.toggle("active", c.dataset.id === r.id));
      updatePreview();
    });
    wrap.appendChild(chip);
  });
}

function currentSkillTerms() {
  const terms = new Set();
  SKILL_CLUSTERS.filter((c) => state.selectedClusters.has(c.key)).forEach((c) =>
    c.terms.forEach((t) => terms.add(t))
  );
  const extra = document.getElementById("extraKeywords").value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  extra.forEach((t) => terms.add(t));
  return Array.from(terms);
}

// Boolean query for Google/Bing — these engines understand quotes, OR, and
// parentheses. Capped at 2 skill terms: real search engines degrade fast
// past a couple of mandatory terms, and un-capped OR-groups from every
// selected cluster produced 7+ term queries that returned zero results.
function buildBooleanQuery() {
  const title = document.getElementById("titleSelect").value;
  const skills = currentSkillTerms().slice(0, 2);
  const scope = REMOTE_SCOPE_OPTIONS.find((r) => r.id === state.remoteScope);

  const parts = [`"${title}"`];
  if (skills.length === 1) {
    parts.push(skills[0]);
  } else if (skills.length > 1) {
    parts.push(`(${skills.join(" OR ")})`);
  }
  // Remote-scope phrases are opt-in (off by default) — most job posts never
  // contain the literal phrase "remote worldwide", so forcing this clause in
  // returned zero results in practice. Group with parens so, when enabled,
  // it stays an optional OR rather than an AND of unlikely exact phrases.
  if (scope && scope.terms.length) {
    const quoted = scope.terms.map((t) => `"${t}"`);
    parts.push(`(${quoted.join(" OR ")})`);
  }
  return parts.join(" ");
}

// Plain keyword string for board-native search boxes (RemoteOK, Wellfound,
// We Work Remotely, LinkedIn) — these do simple text matching, not boolean
// search, so OR/parentheses/quotes would be searched as literal characters
// instead of being interpreted, silently returning nothing.
function buildPlainQuery() {
  const title = document.getElementById("titleSelect").value;
  const skills = currentSkillTerms().slice(0, 2);
  return [title, ...skills].join(" ");
}

function buildQuery() {
  return buildBooleanQuery();
}

function updatePreview() {
  document.getElementById("queryPreview").textContent = buildQuery();
}

function renderLinks() {
  const booleanQuery = buildBooleanQuery();
  const plainQuery = buildPlainQuery();
  updatePreview();
  const grid = document.getElementById("linksGrid");
  grid.innerHTML = "";
  BOARDS.forEach((board) => {
    const query = board.queryType === "plain" ? plainQuery : booleanQuery;
    const a = document.createElement("a");
    a.className = "card";
    a.href = board.build(query);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const noPrefill = new Set(["himalayas", "levelsfyi"]);
    const subText = noPrefill.has(board.id)
      ? "No working search deep link on this site — search manually →"
      : "Open pre-filtered search →";
    a.innerHTML = `
      <span class="card-badge">${board.kind}</span>
      <span class="card-title">${board.name}</span>
      <span class="card-sub">${subText}</span>
    `;
    grid.appendChild(a);
  });
}

async function fetchLive() {
  const statusEl = document.getElementById("liveStatus");
  const grid = document.getElementById("liveGrid");
  grid.innerHTML = "";
  statusEl.innerHTML = `<span class="spinner"></span> Fetching live listings…`;

  const terms = [document.getElementById("titleSelect").value, ...currentSkillTerms()];
  let allJobs = [];
  let errors = [];

  for (const api of LIVE_APIS) {
    try {
      const res = await fetch(api.url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const jobs = api.parse(data, terms);
      allJobs = allJobs.concat(jobs);
    } catch (err) {
      errors.push(`${api.name}: ${err.message}`);
    }
  }

  if (allJobs.length === 0) {
    statusEl.innerHTML = errors.length
      ? `No matches found. Some sources were unreachable from your browser (${errors.join(
          "; "
        )}). Use the deep links above instead — those always work.`
      : `No live matches for this query right now. Try broader skill terms, or use the deep links above.`;
    return;
  }

  statusEl.textContent = `${allJobs.length} live listing(s) found matching your query.` +
    (errors.length ? ` (${errors.join("; ")})` : "");

  allJobs.forEach((job) => {
    const a = document.createElement("a");
    a.className = "card job-card";
    a.href = job.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <span class="card-badge">${job.source}</span>
      <span class="card-title">${escapeHtml(job.title)}</span>
      <span class="card-sub">${escapeHtml(job.company || "")}</span>
      <div class="job-meta">
        <span>${escapeHtml(job.location || "")}</span>
        ${job.salary ? `<span class="job-salary">${escapeHtml(job.salary)}</span>` : ""}
      </div>
    `;
    grid.appendChild(a);
  });
}

function populateCompanies() {
  const grid = document.getElementById("companyGrid");
  TARGET_COMPANIES.forEach((c) => {
    const a = document.createElement("a");
    a.className = "card";
    a.href = c.careers;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <span class="card-title">${escapeHtml(c.name)}</span>
      <span class="card-sub">${escapeHtml(c.note)}</span>
    `;
    grid.appendChild(a);
  });
}

function populateCheatSheet() {
  const good = document.getElementById("goodPhrases");
  const bad = document.getElementById("badPhrases");
  REMOTE_GOOD_PHRASES.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    good.appendChild(li);
  });
  REMOTE_BAD_PHRASES.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    bad.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", init);
