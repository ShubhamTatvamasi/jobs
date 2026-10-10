import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSalaryText, classifyRemote, scopeAllows, safeUrl, stripHtml,
  buildBooleanQuery, dedupeJobs,
} from "../src/lib/engine.js";

test("parseSalaryText reads ranges, hourly and ignores noise", () => {
  assert.equal(parseSalaryText("$213K – $251K • Offers Equity"), 251000);
  assert.equal(parseSalaryText("$120,000 - $160,000"), 160000);
  assert.equal(parseSalaryText("$100/hr"), 208000);
  assert.equal(parseSalaryText("401(k) match, founded 2026"), 0);
});

test("classifyRemote handles Greenhouse multi-location conventions", () => {
  assert.equal(classifyRemote("Central - United States"), "us");
  assert.equal(classifyRemote("Austin; Boston; New York City, United States"), "us");
  assert.equal(classifyRemote("San Jose, California, USA"), "onsite");
  assert.equal(classifyRemote("Remote - India"), "india");
  assert.equal(classifyRemote("Worldwide"), "global");
});

test("scopeAllows respects scope", () => {
  assert.equal(scopeAllows("us", "onsite", []), false);
  assert.equal(scopeAllows("us", "us", ["us"]), true);
  assert.equal(scopeAllows("india", "us", ["us"]), false);
  assert.equal(scopeAllows("all", "onsite", []), true);
});

test("safeUrl and stripHtml are safe", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "#");
  assert.equal(safeUrl("https://x.dev"), "https://x.dev");
  assert.equal(stripHtml("<p>A &amp; B</p>"), "A & B");
});

test("query builder and dedupe", () => {
  assert.equal(buildBooleanQuery("Staff SRE", ["Kubernetes", "Go", "AWS"], []), '"Staff SRE" (Kubernetes OR Go)');
  assert.equal(dedupeJobs([{ company: "A", title: "X" }, { company: "a ", title: "x" }]).length, 1);
});
