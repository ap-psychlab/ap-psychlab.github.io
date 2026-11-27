#!/usr/bin/env node
/* Course test copy: a throwaway copy of the site with every course offered and made-up term lists,
 * for seeing Regular and Dual Credit (course menu, home-page units, topic picker, Unit Exam Terms)
 * before their real term lists exist. Run from anywhere:
 *
 *   node tools/make-test-copy.js <folder outside the repo>
 *
 * The folder must be outside the repo and empty or missing (or an earlier test copy, which is
 * replaced). The script copies the repo there (without .git), then, in the copy only:
 *   topics.js  every course gets offered: true
 *   terms.js   a snippet is appended that gives made-up courses and unitTest entries:
 *                courses   Sensation & Perception and MES terms (CED 1.6, 2.1, 4.6, 4.7, 5.1, 5.2)
 *                          get "reg"; every other term gets "reg" and "dc"
 *                unitTest  memory (2.3–2.7) and operant (3.8) terms: AP and Regular;
 *                          statistics (0.5) and research methods (0.2): Regular;
 *                          case-study: "ap:research-methods" (tests a group-limited entry)
 *              A course that already has terms (or unitTest entries) in the real terms.js is left
 *              as it is, so the copy stays useful once real term lists are imported.
 * Then it runs tools/check-data.js in the copy (it must report no errors; warnings such as terms
 * outside a course's units are fine) and prints how to serve it. The copy is never pushed, and
 * the repo itself is never changed.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var childProcess = require("child_process");

var root = path.resolve(__dirname, "..");
var MARKER = "TEST-COPY.txt";

function fail(msg) {
  console.error("make-test-copy: " + msg);
  process.exit(1);
}
function realish(p) {
  // The real path of p, or of its nearest existing parent with the rest appended.
  var rest = [];
  while (!fs.existsSync(p)) {
    rest.unshift(path.basename(p));
    var up = path.dirname(p);
    if (up === p) break;
    p = up;
  }
  return path.join.apply(path, [fs.realpathSync(p)].concat(rest));
}
function inside(child, parent) {
  var rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

var arg = process.argv[2];
if (!arg || arg === "-h" || arg === "--help") {
  console.log("Usage: node tools/make-test-copy.js <folder outside the repo>");
  process.exit(arg ? 0 : 1);
}
var dest = realish(path.resolve(arg));
var repo = fs.realpathSync(root);
if (inside(dest, repo)) fail(dest + " is inside the repo (" + repo + "); choose a folder outside it.");
if (inside(repo, dest)) fail(dest + " contains the repo; choose an empty folder outside it.");

if (fs.existsSync(dest)) {
  if (!fs.statSync(dest).isDirectory()) fail(dest + " is a file, not a folder.");
  var entries = fs.readdirSync(dest);
  if (entries.length) {
    if (entries.indexOf(MARKER) < 0) fail(dest + " isn't empty and isn't an earlier test copy; choose an empty folder.");
    fs.rmSync(dest, { recursive: true, force: true });
  }
}

/* ---------- copy ---------- */
fs.cpSync(repo, dest, {
  recursive: true,
  filter: function (src) {
    var name = path.basename(src);
    return name !== ".git" && name !== "node_modules";
  }
});
fs.writeFileSync(path.join(dest, MARKER),
  "Course test copy made by tools/make-test-copy.js on " + new Date().toISOString() + " from " + repo + ".\n" +
  "Every course is offered and terms.js has made-up course lists. Never push this folder.\n" +
  "Run the script again with this folder to replace it.\n");

/* ---------- topics.js: offer every course ---------- */
var topicsFile = path.join(dest, "shared", "data", "topics.js");
var topics = fs.readFileSync(topicsFile, "utf8");
var offeredFalse = (topics.match(/offered:\s*false/g) || []).length;
topics = topics.replace(/offered:\s*false/g, "offered: true");
fs.writeFileSync(topicsFile, topics);

/* ---------- terms.js: made-up courses and unitTest ---------- */
// Runs in the page after the bank is set. It matches CED codes itself rather than calling
// APPSYCH_TOPICS, so it doesn't depend on the order the page loads the banks in.
var snippet = [
  "",
  "/* ===== COURSE TEST COPY (tools/make-test-copy.js): made-up course lists. Not the real data. ===== */",
  "(function () {",
  "  var terms = window.APPSYCH_TERMS || [];",
  "  function has(t, codes) {",
  "    return (t.ced || []).some(function (c) {",
  "      return codes.some(function (k) { return c === k || c.indexOf(k + \".\") === 0; });",
  "    });",
  "  }",
  "  function used(field, id) {",
  "    return terms.some(function (t) {",
  "      return (t[field] || []).some(function (e) { return String(e).split(\":\")[0] === id; });",
  "    });",
  "  }",
  "  var NOT_DC = [\"1.6\", \"2.1\", \"4.6\", \"4.7\", \"5.1\", \"5.2\"];  // Sensation & Perception, MES",
  "  var addReg = !used(\"courses\", \"reg\"), addDc = !used(\"courses\", \"dc\");",
  "  var testAp = !used(\"unitTest\", \"ap\"), testReg = !used(\"unitTest\", \"reg\");",
  "  terms.forEach(function (t) {",
  "    var c = t.courses = (t.courses || []).slice();",
  "    if (addReg && c.indexOf(\"reg\") < 0) c.push(\"reg\");",
  "    if (addDc && !has(t, NOT_DC) && c.indexOf(\"dc\") < 0) c.push(\"dc\");",
  "    var u = (t.unitTest || []).slice();",
  "    function add(e) { if (u.indexOf(e) < 0 && c.indexOf(e.split(\":\")[0]) >= 0) u.push(e); }",
  "    if (has(t, [\"2.3\", \"2.4\", \"2.5\", \"2.6\", \"2.7\", \"3.8\"])) { if (testAp) add(\"ap\"); if (testReg) add(\"reg\"); }",
  "    if (has(t, [\"0.2\", \"0.5\"]) && testReg) add(\"reg\");",
  "    if (t.id === \"case-study\" && testAp) add(\"ap:research-methods\");",
  "    if (u.length) t.unitTest = u;",
  "  });",
  "})();",
  ""
].join("\n");
var termsFile = path.join(dest, "shared", "data", "terms.js");
fs.appendFileSync(termsFile, snippet);

/* ---------- check ---------- */
console.log("Test copy made at " + dest);
console.log("  topics.js: " + offeredFalse + " course(s) changed to offered: true");
console.log("  terms.js: made-up courses and unitTest appended\n");
console.log("Data check in the copy:");
var check = childProcess.spawnSync(process.execPath, [path.join(dest, "tools", "check-data.js"), "--quiet"],
  { cwd: dest, encoding: "utf8" });
process.stdout.write((check.stdout || "").replace(/^/gm, "  "));
process.stderr.write(check.stderr || "");
console.log("\nServe it:  cd \"" + dest + "\" && python3 -m http.server 8000");
console.log("Then open http://localhost:8000/ (the course menu lists Regular, Dual Credit and AP).");
console.log("Delete the folder when you're done; it's never pushed.");
process.exit(check.status === 0 ? 0 : 1);
