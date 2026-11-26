#!/usr/bin/env node
/* Data check for the shared banks. Run from the repo root before pushing any change to
 * shared/data/:   node tools/check-data.js        (add --quiet to hide the warning lists)
 *
 * Loads topics.js, terms.js, questions.js and interactives.js the way a page does (with a stub
 * window), then reports:
 *   errors    (exit code 1): problems a page could trip over
 *   warnings  (exit code 0): things to review, e.g. terms marked for a course but in none of its units
 * Not loaded by any page. Add new checks at the end of the matching section.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var quiet = process.argv.indexOf("--quiet") >= 0;
var ctx = { window: { location: { search: "" } } };
vm.createContext(ctx);
["topics", "terms", "questions", "interactives"].forEach(function (name) {
  var file = path.join(root, "shared", "data", name + ".js");
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
});
var W = ctx.window;
var T = W.APPSYCH_TOPICS, TERMS = W.APPSYCH_TERMS, QS = W.APPSYCH_QUESTIONS, ITEMS = W.APPSYCH_INTERACTIVES;

var errors = [], warnings = [];
function err(msg) { errors.push(msg); }
function warn(group, msg) { (warnings[group] = warnings[group] || []).push(msg); }
function dupes(list) {
  var seen = {}, out = [];
  list.forEach(function (x) { if (seen[x] && out.indexOf(x) < 0) out.push(x); seen[x] = true; });
  return out;
}

["APPSYCH_TOPICS", "APPSYCH_TERMS", "APPSYCH_QUESTIONS", "APPSYCH_INTERACTIVES"].forEach(function (g) {
  if (!W[g]) err(g + " is not set");
});
if (errors.length) finish();

var COURSE_IDS = T.courses.map(function (c) { return c.id; });
var termById = {};
TERMS.forEach(function (t) { termById[t.id] = t; });

/* ---------- topics.js ---------- */
dupes(T.groups.map(function (g) { return g.id; })).forEach(function (id) { err("topics: duplicate group id " + id); });
dupes(T.units.map(function (u) { return u.id; })).forEach(function (id) { err("topics: duplicate unit id " + id); });
dupes(COURSE_IDS).forEach(function (id) { err("topics: duplicate course id " + id); });
if (!T.getCourse(T.defaultCourse)) err("topics: defaultCourse " + T.defaultCourse + " is not a course");
T.units.forEach(function (u) {
  u.groups.forEach(function (g) { if (!T.getGroup(g)) err("topics: unit " + u.id + " names unknown group " + g); });
  dupes(u.groups).forEach(function (g) { err("topics: unit " + u.id + " lists group " + g + " twice"); });
});
T.courses.forEach(function (c) {
  c.units.forEach(function (u) { if (!T.getUnit(u)) err("topics: course " + c.id + " names unknown unit " + u); });
  dupes(c.units).forEach(function (u) { err("topics: course " + c.id + " lists unit " + u + " twice"); });
});
if (T.getCourse(T.defaultCourse) && !T.getCourse(T.defaultCourse).offered) err("topics: defaultCourse " + T.defaultCourse + " is not offered");
T.courses.forEach(function (c) {
  if (typeof c.offered !== "boolean") err("topics: course " + c.id + ": offered must be true or false");
  else if (c.offered && !T.courseHasTerms(c.id)) err("topics: course " + c.id + " is offered (in the course menu) but has no terms");
  else if (!c.offered && T.courseHasTerms(c.id)) warn("Courses with terms that aren't offered in the course menu", c.id + " (set offered: true in topics.js)");
});
T.groups.forEach(function (g) {
  var used = T.courses.filter(function (c) { return T.courseHasGroup(c.id, g.id); });
  if (!used.length) warn("Groups in no course", g.id);
});

/* ---------- terms.js ---------- */
dupes(TERMS.map(function (t) { return t.id; })).forEach(function (id) { err("terms: duplicate id " + id); });
TERMS.forEach(function (t) {
  var where = "terms: " + t.id + ": ";
  var retired = t.status === "omitted";
  if (t.status !== undefined && !retired) err(where + "status must be \"omitted\" or left out");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id)) err(where + "id is not lowercase-hyphenated");
  if (!t.term || !t.definition) err(where + "missing term or definition");
  if (!Array.isArray(t.ced) || !t.ced.length) err(where + "missing ced codes");
  ["aliases", "examples", "confusedWith"].forEach(function (f) {
    if (!Array.isArray(t[f])) err(where + f + " must be a list");
  });
  if (typeof t.mnemonic !== "string") err(where + "mnemonic must be a string");
  ["example", "hint"].forEach(function (f) { if (f in t) err(where + "old field " + f + " (use examples / mnemonic)"); });

  var courses = t.courses;
  if (!Array.isArray(courses) || !courses.length) {
    if (!retired) err(where + "courses is missing or empty");
    courses = [];
  }
  courses.forEach(function (c) { if (COURSE_IDS.indexOf(c) < 0) err(where + "unknown course " + c); });
  dupes(courses).forEach(function (c) { err(where + "course " + c + " listed twice"); });

  var groupsOfTerm = T.groupsOf(t);
  if (!groupsOfTerm.length) err(where + "ced codes match no topic group");
  (t.unitTest || []).forEach(function (e) {
    var parts = String(e).split(":");
    if (COURSE_IDS.indexOf(parts[0]) < 0) err(where + "unitTest " + e + ": unknown course");
    else if (courses.indexOf(parts[0]) < 0) err(where + "unitTest " + e + ": course " + parts[0] + " is not in courses");
    if (parts.length > 2) err(where + "unitTest " + e + ": use course:group");
    if (parts.length === 2) {
      if (!T.getGroup(parts[1])) err(where + "unitTest " + e + ": unknown group " + parts[1]);
      else if (groupsOfTerm.indexOf(parts[1]) < 0) err(where + "unitTest " + e + ": the term is not in group " + parts[1]);
    }
  });
  if (t.unitTest !== undefined && !Array.isArray(t.unitTest)) err(where + "unitTest must be a list");

  (t.confusedWith || []).forEach(function (o) {
    if (o === t.id) err(where + "confusedWith lists the term itself");
    else if (!termById[o]) err(where + "confusedWith names unknown term " + o);
    else if ((termById[o].confusedWith || []).indexOf(t.id) >= 0 && t.id < o)
      err(where + "the pair " + t.id + " / " + o + " is listed on both terms (list it on one)");
  });

  if (!retired) courses.forEach(function (c) {
    if (COURSE_IDS.indexOf(c) < 0) return;
    var ids = T.groupIdsFor(c);
    if (!groupsOfTerm.some(function (g) { return ids.indexOf(g) >= 0; }))
      warn("Terms in a course but in none of its units", t.id + " (" + c + ")");
  });
});

/* ---------- questions.js ---------- */
var QSTATUS = ["draft", "live", "omitted"];
dupes(QS.map(function (q) { return q.id; })).forEach(function (id) { err("questions: duplicate id " + id); });
QS.forEach(function (q) {
  var where = "questions: " + q.id + ": ";
  if (QSTATUS.indexOf(q.status) < 0) err(where + "status must be draft, live or omitted");
  if (!termById[q.term]) err(where + "unknown term " + q.term);
  var refs = q.choiceRefs || [];
  if (!Array.isArray(q.choices) || q.choices.length !== 4) err(where + "needs exactly 4 choices");
  if (!(q.answer >= 0 && q.answer <= 3)) err(where + "answer must be 0-3");
  if (refs.length !== 4) err(where + "choiceRefs needs 4 entries");
  refs.forEach(function (r) { if (r !== null && !termById[r]) err(where + "choiceRefs names unknown term " + r); });
  if (q.courses !== undefined) {
    if (!Array.isArray(q.courses) || !q.courses.length) err(where + "courses must be a non-empty list");
    else q.courses.forEach(function (c) { if (COURSE_IDS.indexOf(c) < 0) err(where + "unknown course " + c); });
  }
  if (q.status === "omitted") return;
  COURSE_IDS.forEach(function (c) {
    if (!T.questionInCourse(q, c)) return;
    refs.forEach(function (r, i) {
      if (i === q.answer || r === null || !termById[r]) return;
      if (!T.termInCourse(termById[r], c))
        warn("Questions whose wrong answers use terms outside the course", q.id + " (" + c + "): " + r);
    });
  });
});

/* ---------- interactives.js ---------- */
// Card badge types; the labels are in shared/site.js (TYPES). Keep the two lists the same.
var TYPE_IDS = ["experiment", "simulation", "game", "puzzle", "lesson", "quiz", "class-game", "reference"];
dupes(ITEMS.map(function (it) { return it.id; })).forEach(function (id) { err("interactives: duplicate id " + id); });
ITEMS.forEach(function (it) {
  var where = "interactives: " + it.id + ": ";
  if (["listed", "unlisted"].indexOf(it.status) < 0) err(where + "status must be listed or unlisted");
  if (["column", "split", "stage"].indexOf(it.template) < 0) err(where + "unknown template " + it.template);
  if (TYPE_IDS.indexOf(it.type) < 0) err(where + "type must be one of " + TYPE_IDS.join(", "));
  if (!/\/$/.test(it.path || "")) err(where + "path must end in /");
  if (it.image) {
    if (!fs.existsSync(path.join(root, it.path || "", it.image))) err(where + "image file " + it.image + " not found");
    if (!it.alt) err(where + "image needs alt text");
  }
  if (!fs.existsSync(path.join(root, it.path || "", "index.html"))) warn("Interactives whose folder isn't in the repo", it.id + " (" + it.path + ")");
  if (!it.review && !T.groupsOf(it).length) err(where + "ced codes match no topic group");
  if (it.courses !== undefined) {
    if (!Array.isArray(it.courses) || !it.courses.length) err(where + "courses must be a non-empty list");
    else it.courses.forEach(function (c) { if (COURSE_IDS.indexOf(c) < 0) err(where + "unknown course " + c); });
  }
});

finish();

function finish() {
  var count = function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); };
  if (T && TERMS && QS && ITEMS) {
    console.log("Loaded " + count(T.groups.length, "group") + ", " + count(T.units.length, "unit") + ", " +
      count(T.courses.length, "course") + ", " + count(TERMS.length, "term") + ", " +
      count(QS.length, "question") + ", " + count(ITEMS.length, "interactive") + ".");
    T.courses.forEach(function (c) {
      console.log("  " + c.name + " (" + c.id + "): " + count(T.terms(c.id).length, "term") + ", " +
        count(T.questions(c.id).length, "question") + ", " +
        count(ITEMS.filter(function (it) { return T.interactiveInCourse(it, c.id); }).length, "interactive"));
    });
  }
  Object.keys(warnings).forEach(function (k) {
    console.log("\nWarning: " + k + " (" + warnings[k].length + ")");
    if (!quiet) warnings[k].forEach(function (m) { console.log("  " + m); });
  });
  if (errors.length) {
    console.log("\n" + count(errors.length, "error") + ":");
    errors.forEach(function (m) { console.log("  " + m); });
    process.exit(1);
  }
  console.log("\nNo errors.");
}
