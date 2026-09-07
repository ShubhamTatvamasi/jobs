// ============================================================
// Hidden Job Engine — pure logic (no DOM).
// Normalizes every source into one job shape:
// { id, title, company, url, location, remoteClass, salaryText,
//   salaryMax, postedAt, source, dept, tags, snippet }
// Loaded in the browser after data.js; also loadable in Node for tests.
// ============================================================

const REMOTE_CLASS_META = {
  global: { label: "🌍 Global", rank: 6 },
  india: { label: "🇮🇳 India", rank: 6 },
  apac: { label: "APAC", rank: 5 },
  emea: { label: "EMEA", rank: 4 },
  latam: { label: "LATAM", rank: 3 },
  us: { label: "🇺🇸 US/CA", rank: 4 },
  remote: { label: "Remote", rank: 5 },
  onsite: { label: "On-site", rank: 1 },
};

// --- salary ------------------------------------------------

// Extracts the largest plausible annual figure from free text like
// "$213K – $251K • Offers Equity" or "$120,000 - $160,000" or "$80/hr".
// Returns 0 when nothing parseable. Ignores things like "401(k)" because
// the "(" breaks the k-suffix match, and years like 2026 (no $/k marker).
function parseSalaryText(text) {
  if (!text) return 0;
  // Strip only thousands-separator commas ("$120,000"), not European
  // decimal commas ("$31,2k" must not become $312k).
  const s = String(text).replace(/,(?=\d{3}(?!\d))/g, "");
  let mult = 1;
  if (/(\/\s*(?:hr|hour)\b|per hour|hourly|an hour)/i.test(s)) mult = 2080;
  else if (/(\/\s*mo\b|per month|monthly)/i.test(s)) mult = 12;
  let best = 0;
  const re = /[$€£]\s*(\d+(?:\.\d+)?)\s*(k)?|\b(\d+(?:\.\d+)?)\s*k\b/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    let n, hasK;
    if (m[1] !== undefined) { n = parseFloat(m[1]); hasK = !!m[2]; }
    else { n = parseFloat(m[3]); hasK = true; }
    if (isNaN(n)) continue;
    let v = n * (hasK ? 1000 : 1) * mult;
    // A bare "$95" is meaningless annually unless it was hourly.
    if (!hasK && mult === 1 && n < 10000) continue;
    if (v >= 20000 && v <= 2500000) best = Math.max(best, v);
  }
  return Math.round(best);
}

function fmtSalaryNum(min, max) {
  const f = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max && min !== max) return `${f(min)}–${f(max)}`;
  return f(max || min);
}

// --- remote classification ----------------------------------

const RC = {
  india: /\bindia\b/i,
  global: /(worldwide|anywhere|globally|\bglobal\b|international|fully remote)/i,
  latam: /(latam|latin america|south america|brazil|mexico|argentina|colombia|costa rica|chile|peru|uruguay|ecuador)/i,
  apac: /(apac|asia|singapore|japan|tokyo|australia|sydney|melbourne|new zealand)/i,
  emea: /(emea|europe|\buk\b|united kingdom|germany|berlin|london|netherlands|amsterdam|ireland|dublin|poland|(?<!port of )spain|france|portugal|romania|serbia|italy|belgium|austria|switzerland|sweden|denmark|norway|finland|greece|czech|bulgaria|hungary|croatia)/i,
  us: /(united states|\busa\b|\bu\.s\.|\bus\b|canada|north america|americas)/i,
  usState: /,\s*[A-Z]{2}(?:\s|$|\))/,
  remote: /(remote|distributed|flexible|work from home|wfh)/i,
  // Greenhouse's convention for a remote-eligible-within-region req: either
  // a region prefix ("Central - United States", "West Coast - United
  // States") or several distinct cities/states joined together ("Austin;
  // Boston; New York City; ... United States") — a single-office listing
  // never lists more than one place. Neither form contains the word
  // "remote", so RC.remote alone misses them.
  multiLoc: /( - united states| - usa)\b/i,
};

// Greenhouse joins multiple offices with ";" ("Boston, MA; New York, NY").
// Commas are part of one address's own city/state/country structure, so
// they must NOT be treated as a list separator (that would misread a
// single-office "San Jose, California, USA" as three locations).
function looksMultiCity(loc) {
  const parts = String(loc || "").split(";").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2;
}

// loc: free-text location; flags: {isRemote, country} from structured APIs.
function classifyRemote(loc, flags) {
  const l = String(loc || "");
  const f = flags || {};
  const country = String(f.country || "").toLowerCase();
  if (RC.india.test(l) || country === "in" || country === "india") return "india";
  if (RC.latam.test(l)) return "latam";
  if (RC.apac.test(l)) return "apac";
  if (RC.emea.test(l)) return "emea";
  if (RC.global.test(l)) return "global";
  const usCountry = country === "us" || country === "usa" || country === "united states" || country === "ca" || country === "canada";
  if (RC.us.test(l) || RC.usState.test(l) || usCountry) {
    const impliedRemote = RC.multiLoc.test(l) || looksMultiCity(l);
    return RC.remote.test(l) || f.isRemote || impliedRemote ? "us" : "onsite";
  }
  if (RC.remote.test(l) || f.isRemote) return "remote";
  return l.trim() ? "onsite" : "remote";
}

// Multi-region postings ("APAC, EMEA, Canada, USA") list every region they
// hit — the display badge (remoteClass) shows only the first, but scope
// filtering must consider all of them.
function remoteRegions(loc, flags) {
  const l = String(loc || "");
  const f = flags || {};
  const country = String(f.country || "").toLowerCase();
  const s = new Set();
  for (const k of ["india", "latam", "apac", "emea", "us", "global"]) {
    if (RC[k].test(l)) s.add(k);
  }
  if (country === "in" || country === "india") s.add("india");
  if (["us", "usa", "united states", "ca", "canada"].includes(country)) s.add("us");
  return [...s];
}

function scopeAllows(scope, remoteClass, regions) {
  const set = new Set(regions && regions.length ? regions : [remoteClass]);
  const unspecified = remoteClass === "remote" || remoteClass === "global";
  switch (scope) {
    case "all": return true;
    case "any-remote": return remoteClass !== "onsite";
    case "global":
      return remoteClass !== "onsite" && (set.has("global") || set.has("india") || set.has("apac") || unspecified);
    case "india":
      return remoteClass !== "onsite" && (set.has("global") || set.has("india") || unspecified);
    case "us":
      return remoteClass !== "onsite" && (set.has("global") || set.has("us") || unspecified);
    default: return true;
  }
}

// Job URLs come from third-party APIs — only ever link http(s).
function safeUrl(url, fallback) {
  return /^https?:\/\//i.test(String(url || "")) ? url : (fallback || "#");
}

// --- HTML stripping (works in browser and Node) --------------

function codePointStr(n) {
  return n >= 0x20 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
}

function stripHtml(html) {
  const text = String(html || "")
    .replace(/<(p|br|li|div|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePointStr(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePointStr(Number(d)))
    .replace(/&amp;/g, "&");
  return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

// --- ATS adapters -------------------------------------------

const ATS_ADAPTERS = {
  greenhouse: {
    apiUrl: (c) => `https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`,
    boardUrl: (c) => `https://job-boards.greenhouse.io/${c.slug}`,
    normalize(c, data) {
      // Greenhouse exposes no structured remote flag, so a company known to
      // hire "worldwide" gets its bare "United States[...]" listings (no
      // "remote" keyword, single city) treated as remote-eligible — a
      // dedicated office would show a specific city, not just the country.
      const impliedRemoteCo = c.hiring === "worldwide";
      return ((data && data.jobs) || []).map((j) => {
        const locName = (j.location && j.location.name) || "";
        const bareCountry = /^\s*(united states( of america)?|usa)\s*$/i.test(locName);
        const isRemote = impliedRemoteCo && bareCountry;
        return {
          id: `gh-${c.slug}-${j.id}`,
          title: j.title || "",
          company: c.name,
          url: j.absolute_url || this.boardUrl(c),
          location: locName,
          remoteClass: classifyRemote(locName, { isRemote }),
          regions: remoteRegions(locName),
          salaryText: "",
          salaryMax: 0,
          postedAt: j.updated_at ? Date.parse(j.updated_at) || 0 : 0,
          source: "Greenhouse",
          dept: "",
          tags: [],
        };
      });
    },
  },
  ashby: {
    apiUrl: (c) => `https://api.ashbyhq.com/posting-api/job-board/${c.slug}?includeCompensation=true`,
    boardUrl: (c) => `https://jobs.ashbyhq.com/${c.slug}`,
    normalize(c, data) {
      return ((data && data.jobs) || [])
        .filter((j) => j.isListed !== false)
        .map((j) => {
          const secondary = (j.secondaryLocations || []).map((l) =>
            typeof l === "string" ? l : (l && l.location) || ""
          );
          const loc = [j.location, ...secondary].filter(Boolean).join(" · ");
          const comp = j.compensation || {};
          const salaryText = comp.scrapeableCompensationSalarySummary || "";
          const country = j.address && j.address.postalAddress && j.address.postalAddress.addressCountry;
          return {
            id: `ab-${c.slug}-${j.id}`,
            title: j.title || "",
            company: c.name,
            url: j.jobUrl || this.boardUrl(c),
            location: loc,
            remoteClass: classifyRemote(loc, { isRemote: !!j.isRemote, country }),
            regions: remoteRegions(loc, { country }),
            salaryText,
            salaryMax: parseSalaryText(salaryText),
            postedAt: j.publishedAt ? Date.parse(j.publishedAt) || 0 : 0,
            source: "Ashby",
            dept: [j.department, j.team].filter(Boolean).join(" / "),
            tags: [],
          };
        });
    },
  },
  lever: {
    apiUrl: (c) => `https://api.lever.co/v0/postings/${c.slug}?mode=json`,
    boardUrl: (c) => `https://jobs.lever.co/${c.slug}`,
    normalize(c, data) {
      return (Array.isArray(data) ? data : []).map((j) => {
        const cats = j.categories || {};
        const loc = (cats.allLocations && cats.allLocations.join(" · ")) || cats.location || "";
        let salaryText = "";
        let salaryMax = 0;
        if (j.salaryRange && j.salaryRange.max) {
          const perYear = !j.salaryRange.interval || /year/i.test(j.salaryRange.interval);
          if (perYear) {
            salaryMax = j.salaryRange.max;
            salaryText = fmtSalaryNum(j.salaryRange.min, j.salaryRange.max);
          }
        }
        return {
          id: `lv-${c.slug}-${j.id}`,
          title: j.text || "",
          company: c.name,
          url: j.hostedUrl || this.boardUrl(c),
          location: loc,
          remoteClass: classifyRemote(loc, { isRemote: j.workplaceType === "remote", country: j.country }),
          regions: remoteRegions(loc, { country: j.country }),
          salaryText,
          salaryMax,
          postedAt: j.createdAt || 0,
          source: "Lever",
          dept: [cats.department, cats.team].filter(Boolean).join(" / "),
          tags: [],
        };
      });
    },
  },
  smartrecruiters: {
    apiUrl: (c) => `https://api.smartrecruiters.com/v1/companies/${c.slug}/postings?limit=100`,
    boardUrl: (c) => `https://jobs.smartrecruiters.com/${c.webSlug || c.slug}`,
    normalize(c, data) {
      return ((data && data.content) || []).map((j) => {
        const loc = j.location || {};
        return {
          id: `sr-${c.slug}-${j.id}`,
          title: j.name || "",
          company: c.name,
          url: `https://jobs.smartrecruiters.com/${(j.company && j.company.identifier) || c.webSlug || c.slug}/${j.id}`,
          location: loc.fullLocation || [loc.city, loc.country].filter(Boolean).join(", "),
          remoteClass: classifyRemote(loc.fullLocation || loc.city, { isRemote: !!loc.remote, country: loc.country }),
          regions: remoteRegions(loc.fullLocation || loc.city, { country: loc.country }),
          salaryText: "",
          salaryMax: 0,
          postedAt: j.releasedDate ? Date.parse(j.releasedDate) || 0 : 0,
          source: "SmartRecruiters",
          dept: (j.department && j.department.label) || "",
          tags: [],
        };
      });
    },
  },
};

// --- aggregator adapters ------------------------------------

const AGG_ADAPTERS = {
  remoteok(data) {
    return (Array.isArray(data) ? data : [])
      .filter((d) => d.position || d.title)
      .map((d) => {
        const salaryMax = d.salary_max || 0;
        return {
          id: `rok-${d.id}`,
          title: d.position || d.title || "",
          company: d.company || "",
          url: d.url || d.apply_url || "https://remoteok.com",
          location: d.location || "Worldwide",
          remoteClass: classifyRemote(d.location || "worldwide", { isRemote: true }),
          regions: remoteRegions(d.location || "worldwide"),
          salaryText: salaryMax ? fmtSalaryNum(d.salary_min, d.salary_max) : "",
          salaryMax,
          postedAt: d.epoch ? d.epoch * 1000 : 0,
          source: "RemoteOK",
          dept: "",
          tags: d.tags || [],
        };
      });
  },
  remotive(data) {
    return (((data && data.jobs) || [])).map((j) => ({
      id: `rmv-${j.id}`,
      title: j.title || "",
      company: j.company_name || "",
      url: j.url || "https://remotive.com",
      location: j.candidate_required_location || "Remote",
      remoteClass: classifyRemote(j.candidate_required_location || "remote", { isRemote: true }),
      regions: remoteRegions(j.candidate_required_location || "remote"),
      salaryText: j.salary || "",
      salaryMax: parseSalaryText(j.salary),
      postedAt: j.publication_date ? Date.parse(j.publication_date) || 0 : 0,
      source: "Remotive",
      dept: j.category || "",
      tags: j.tags || [],
    }));
  },
  jobicy(data) {
    return (((data && data.jobs) || [])).map((j) => {
      const salaryMax = j.salaryMax || j.salaryMin || 0;
      return {
        id: `jbc-${j.id}`,
        title: j.jobTitle || "",
        company: j.companyName || "",
        url: j.url || "https://jobicy.com",
        location: j.jobGeo || "Remote",
        remoteClass: classifyRemote(j.jobGeo || "remote", { isRemote: true }),
        regions: remoteRegions(j.jobGeo || "remote"),
        salaryText: salaryMax ? fmtSalaryNum(j.salaryMin, j.salaryMax) : "",
        salaryMax,
        postedAt: j.pubDate ? Date.parse(j.pubDate) || 0 : 0,
        source: "Jobicy",
        dept: Array.isArray(j.jobIndustry) ? stripHtml(j.jobIndustry.join(", ")) : "",
        tags: [j.jobLevel].filter(Boolean),
      };
    });
  },
};

// --- HN Who's Hiring ----------------------------------------

function pickHiringThread(hits) {
  return (hits || []).find((h) => /who is hiring/i.test(h.title || "")) || null;
}

function normalizeHNComments(storyId, hits) {
  const sid = Number(storyId);
  return (hits || [])
    .filter((h) => Number(h.parent_id) === sid && h.comment_text)
    .map((h) => {
      const text = stripHtml(h.comment_text);
      const firstLine = (text.split("\n")[0] || "").slice(0, 140);
      const segs = firstLine.split("|").map((s) => s.trim()).filter(Boolean);
      return {
        id: `hn-${h.objectID}`,
        title: firstLine || "(untitled post)",
        company: segs.length > 1 ? segs[0].slice(0, 60) : "",
        url: HN_API_ITEM_URL(h.objectID),
        location: "",
        remoteClass: RC.india.test(text) ? "india"
          : RC.global.test(text) ? "global"
          : /remote/i.test(text) ? "remote" : "onsite",
        regions: remoteRegions(text),
        salaryText: "",
        salaryMax: parseSalaryText(text),
        postedAt: h.created_at_i ? h.created_at_i * 1000 : 0,
        source: "HN",
        dept: "",
        tags: [],
        snippet: text.slice(0, 400),
        fullText: text,
      };
    });
}

// data.js owns HN_API in the browser; keep a fallback so Node tests
// can load this file standalone.
function HN_API_ITEM_URL(id) {
  if (typeof HN_API !== "undefined" && HN_API.itemUrl) return HN_API.itemUrl(id);
  return `https://news.ycombinator.com/item?id=${id}`;
}

// --- matching / filtering / sorting -------------------------

// ctx: { families: [{key,re}], seniorityRe, scope, minSalary, keywords: [..] }
function jobHaystack(job) {
  return `${job.title} ${job.dept} ${(job.tags || []).join(" ")} ${job.snippet || ""}`.toLowerCase();
}

function jobMatchesFamilies(job, families) {
  if (!families || !families.length) return true;
  const hay = `${job.title} ${job.dept} ${(job.tags || []).join(" ")}${job.fullText ? " " + job.fullText : ""}`;
  return families.some((f) => f.re.test(hay));
}

function scoreJob(job, ctx) {
  let score = 0;
  const families = ctx.families || [];
  for (const f of families) {
    if (f.re.test(job.title)) score += 3;
    else if (f.re.test(jobHaystack(job))) score += 1;
  }
  if (ctx.seniorityRe && ctx.seniorityRe.test(job.title)) score += 2;
  if (/staff|principal|distinguished/i.test(job.title)) score += 1;
  const hay = jobHaystack(job);
  for (const k of ctx.keywords || []) {
    if (hay.includes(k.toLowerCase())) score += 1;
  }
  if (job.salaryMax) score += 1;
  if (job.remoteClass === "global" || job.remoteClass === "india") score += 1;
  return score;
}

function applyFilters(jobs, ctx) {
  return (jobs || [])
    .filter((j) => !ctx.excludeRe || !ctx.excludeRe.test(j.title))
    .filter((j) => jobMatchesFamilies(j, ctx.families))
    .filter((j) => !ctx.seniorityRe || ctx.seniorityRe.test(j.title))
    .filter((j) => scopeAllows(ctx.scope, j.remoteClass, j.regions))
    .filter((j) => {
      if (!ctx.minSalary) return true;
      if (ctx.minSalary === -1) return j.salaryMax > 0;
      return j.salaryMax >= ctx.minSalary;
    })
    .map((j) => ({ ...j, score: scoreJob(j, ctx) }));
}

function sortJobs(jobs, mode) {
  const arr = [...jobs];
  if (mode === "salary") {
    arr.sort((a, b) => (b.salaryMax - a.salaryMax) || (b.score - a.score) || (b.postedAt - a.postedAt));
  } else if (mode === "newest") {
    arr.sort((a, b) => (b.postedAt - a.postedAt) || (b.score - a.score));
  } else {
    arr.sort((a, b) => (b.score - a.score) || (b.salaryMax - a.salaryMax) || (b.postedAt - a.postedAt));
  }
  return arr;
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    const key = `${(j.company || "").toLowerCase().trim()}|${(j.title || "").toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- deep-link query builders --------------------------------

function buildBooleanQuery(title, skills, extras) {
  const parts = [`"${title}"`];
  const terms = [...(skills || []), ...(extras || [])].slice(0, 2);
  if (terms.length === 1) parts.push(terms[0]);
  else if (terms.length > 1) parts.push(`(${terms.join(" OR ")})`);
  return parts.join(" ");
}

function buildPlainQuery(title, skills, extras) {
  return [title, ...(skills || []), ...(extras || [])].slice(0, 3).join(" ");
}

// --- Node export for tests -----------------------------------
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseSalaryText, fmtSalaryNum, classifyRemote, remoteRegions, scopeAllows, stripHtml, safeUrl,
    ATS_ADAPTERS, AGG_ADAPTERS, pickHiringThread, normalizeHNComments,
    jobMatchesFamilies, scoreJob, applyFilters, sortJobs, dedupeJobs,
    buildBooleanQuery, buildPlainQuery, REMOTE_CLASS_META,
  };
}
