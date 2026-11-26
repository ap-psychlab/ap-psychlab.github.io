/* AP Psych Lab topic structure, courses and shared filtering helpers: window.APPSYCH_TOPICS
 *
 * groups         Topic groups, the building blocks: { id, name, codes }. Group ids are stable
 *                (used in ?groups= links and saved topics); never rename one once used.
 *                Defined once and shared by every course.
 * units          The unit catalog: { id, name, groups: [group ids, in display order] }. A unit with
 *                the same topics has the same id and name in every course; a different set of
 *                groups is a different unit (a new id). Unit ids are stable (home-page #unit links).
 * courses        { id, name, units: [unit ids, in the course's order] }, in menu order. A unit's
 *                letter (A, B, …) is its position in its course. Ids: "reg" Regular,
 *                "dc" Dual Credit, "ap" AP. defaultCourse is "ap".
 * teachingUnits  Compatibility view of AP, for pages not yet on the course helpers:
 *                [{ number: "A" (the letter), id, name, groups: [{ id, name, codes }] }].
 * cedUnits       The CED's units and topics. Unit 0 (Science Practices) uses our own codes
 *                0.1–0.7 because the CED has no Unit 0. Only AP uses the CED view.
 *
 * Matching rule: an item belongs to a group or topic if any of its ced codes equals one of the
 * listed codes or starts with that code followed by ".".
 *
 * Course rules (helpers below; every course argument falls back to AP when missing or unknown):
 *   term         in a course if its courses list has the course id.
 *   question     its own courses list if it has one; otherwise in a course if its term and its
 *                correct answer's term (choiceRefs[answer], when not null) are both in the course.
 *   interactive  its own courses list if it has one; review games are in every course; otherwise
 *                in a course if any group it matches is in one of the course's units.
 *   Unit Exam Terms: a term's unitTest lists "ap" (every group the term is in) or "ap:group-id"
 *   (only where it falls in that group). A question is a unit exam question if its term and its
 *   answer's term are both Unit Exam Terms for the course (for group-limited entries, the
 *   question's own ced must fall in that group).
 * Term and question lookups go through terms() / questions() / getTerm(), which skip retired
 * items (status "omitted"), so games never read the banks directly. The term helpers read
 * window.APPSYCH_TERMS (and questions() reads window.APPSYCH_QUESTIONS) when first called,
 * so load those banks before calling them.
 */
window.APPSYCH_TOPICS = (function () {
  var groups = [
    // Perspectives & Research Methods
    { id: "perspectives", name: "Perspectives in Psychology", codes: ["0.1"] },
    { id: "research-methods", name: "Research Methods", codes: ["0.2"] },
    { id: "experimental-design", name: "Experimental Design", codes: ["0.3"] },
    { id: "research-bias", name: "Biases in Research", codes: ["0.4"] },
    { id: "statistics", name: "Data Analysis & Statistics", codes: ["0.5"] },
    { id: "sampling", name: "Sampling Methods", codes: ["0.6"] },
    { id: "ethics", name: "Ethical Considerations", codes: ["0.7"] },
    // Neuroscience
    { id: "heredity", name: "Heredity & Evolution", codes: ["1.1"] },
    { id: "neurons", name: "Nervous System & Neurons", codes: ["1.2", "1.3.A", "1.3.B.1"] },
    { id: "neurotransmitters", name: "Neurotransmitters & Hormones", codes: ["1.3.B.2", "1.3.B.3"] },
    { id: "drugs", name: "Psychoactive Drugs", codes: ["1.3.C"] },
    { id: "brain-structures", name: "Brain Structures", codes: ["1.4.A.1", "1.4.A.2", "1.4.A.3", "1.4.A.4"] },
    { id: "brain-research", name: "Hemispheres & Brain Research", codes: ["1.4.A.5", "1.4.A.6", "1.4.A.7"] },
    { id: "sleep", name: "Sleep & Dreams", codes: ["1.5"] },
    // Sensation & Perception
    { id: "sensation", name: "Sensation Basics", codes: ["1.6.A"] },
    { id: "vision", name: "Vision", codes: ["1.6.B"] },
    { id: "hearing", name: "Hearing", codes: ["1.6.C"] },
    { id: "other-senses", name: "Chemical & Body Senses", codes: ["1.6.D", "1.6.E", "1.6.F", "1.6.G"] },
    { id: "perception", name: "Perceptual Organization & Attention", codes: ["2.1.A"] },
    { id: "depth-perception", name: "Depth & Visual Perception", codes: ["2.1.B"] },
    // Cognition
    { id: "thinking", name: "Thinking & Problem Solving", codes: ["2.2"] },
    { id: "memory", name: "Memory", codes: ["2.3", "2.4", "2.5", "2.6", "2.7"] },
    { id: "intelligence", name: "Intelligence & Testing", codes: ["2.8"] },
    // Learning
    { id: "classical-conditioning", name: "Classical Conditioning", codes: ["3.7"] },
    { id: "operant-conditioning", name: "Operant Conditioning", codes: ["3.8"] },
    { id: "social-cognitive-learning", name: "Social & Cognitive Learning", codes: ["3.9"] },
    // Development
    { id: "physical-development", name: "Physical Development", codes: ["3.1", "3.2"] },
    { id: "cognitive-development", name: "Piaget & Cognitive Development", codes: ["3.4"] },
    { id: "language", name: "Language", codes: ["3.5"] },
    { id: "attachment", name: "Attachment & Parenting", codes: ["3.6.A.2", "3.6.A.3"] },
    { id: "identity", name: "Erikson & Identity", codes: ["3.3", "3.6.A.6", "3.6.A.8"] },
    { id: "social-contexts", name: "Social Contexts & Relationships", codes: ["3.6.A.1", "3.6.A.4", "3.6.A.5", "3.6.A.7"] },
    // Social Psychology
    { id: "attribution", name: "Attribution & Person Perception", codes: ["4.1"] },
    { id: "attitudes", name: "Attitudes & Prejudice", codes: ["4.2"] },
    { id: "social-influence", name: "Social Influence & Persuasion", codes: ["4.3.A"] },
    { id: "groups", name: "Groups & Helping", codes: ["4.3.B", "4.3.C"] },
    // Personality
    { id: "personality-psychodynamic", name: "Psychodynamic & Humanistic Personality", codes: ["4.4"] },
    { id: "personality-trait", name: "Social-Cognitive & Trait Personality", codes: ["4.5"] },
    // Positive Psychology (MES)
    { id: "motivation", name: "Motivation", codes: ["4.6"] },
    { id: "emotion", name: "Emotion", codes: ["4.7"] },
    { id: "stress", name: "Stress & Coping", codes: ["5.1"] },
    { id: "positive-psychology", name: "Positive Psychology", codes: ["5.2"] },
    // Clinical Psychology
    { id: "defining-disorders", name: "Defining Disorders", codes: ["5.3"] },
    { id: "schizophrenia", name: "Neurodevelopmental & Schizophrenia", codes: ["5.4.A", "5.4.B"] },
    { id: "mood-disorders", name: "Mood Disorders", codes: ["5.4.C", "5.4.D"] },
    { id: "anxiety", name: "Anxiety & OCD", codes: ["5.4.E", "5.4.F"] },
    { id: "dissociative-trauma-eating", name: "Dissociative, Trauma & Eating", codes: ["5.4.G", "5.4.H", "5.4.I"] },
    { id: "personality-disorders", name: "Personality Disorders", codes: ["5.4.J"] },
    { id: "therapies", name: "Psychotherapies", codes: ["5.5.A", "5.5.B", "5.5.C", "5.5.D", "5.5.E"] },
    { id: "biological-treatments", name: "Hypnosis & Biological Treatments", codes: ["5.5.F", "5.5.G"] }
  ];

  var DEV = ["physical-development", "cognitive-development", "language", "attachment", "identity", "social-contexts"];
  var SOCIAL = ["attribution", "attitudes", "social-influence", "groups"];
  var PERSONALITY = ["personality-psychodynamic", "personality-trait"];
  var LEARNING = ["classical-conditioning", "operant-conditioning", "social-cognitive-learning"];

  var units = [
    { id: "perspectives-methods", name: "Perspectives & Research Methods",
      groups: ["perspectives", "research-methods", "experimental-design", "research-bias", "statistics", "sampling", "ethics"] },
    { id: "neuroscience", name: "Neuroscience",
      groups: ["heredity", "neurons", "neurotransmitters", "drugs", "brain-structures", "brain-research", "sleep"] },
    { id: "sensation-perception", name: "Sensation & Perception",
      groups: ["sensation", "vision", "hearing", "other-senses", "perception", "depth-perception"] },
    { id: "cognition", name: "Cognition", groups: ["thinking", "memory", "intelligence"] },
    { id: "learning-cognition", name: "Learning & Cognition", groups: LEARNING.concat(["thinking", "memory"]) },
    { id: "learning", name: "Learning", groups: LEARNING },
    { id: "development", name: "Development", groups: DEV },
    { id: "intelligence-development", name: "Intelligence & Development", groups: ["intelligence"].concat(DEV) },
    { id: "social-personality", name: "Social Psychology & Personality", groups: SOCIAL.concat(PERSONALITY) },
    { id: "personality-social", name: "Personality & Social Psychology", groups: PERSONALITY.concat(SOCIAL) },
    { id: "personality", name: "Personality", groups: PERSONALITY },
    { id: "social", name: "Social Psychology", groups: SOCIAL },
    { id: "mes", name: "Positive Psychology (MES)", groups: ["motivation", "emotion", "stress", "positive-psychology"] },
    { id: "clinical", name: "Clinical Psychology",
      groups: ["defining-disorders", "schizophrenia", "mood-disorders", "anxiety", "dissociative-trauma-eating",
               "personality-disorders", "therapies", "biological-treatments"] }
  ];

  var courses = [
    { id: "reg", name: "Regular", units: ["personality", "perspectives-methods", "development", "neuroscience",
      "sensation-perception", "cognition", "learning", "social", "clinical", "mes"] },
    { id: "dc", name: "Dual Credit", units: ["perspectives-methods", "neuroscience", "learning-cognition",
      "intelligence-development", "personality-social", "clinical"] },
    { id: "ap", name: "AP", units: ["perspectives-methods", "neuroscience", "sensation-perception", "cognition",
      "learning", "development", "social-personality", "mes", "clinical"] }
  ];
  var defaultCourse = "ap";

  var cedUnits = [
    { number: 0, name: "Science Practices", topics: [
      { code: "0.1", name: "Perspectives in Psychology" },
      { code: "0.2", name: "Research Methods" },
      { code: "0.3", name: "Experimental Design" },
      { code: "0.4", name: "Biases in Research" },
      { code: "0.5", name: "Data Analysis & Statistics" },
      { code: "0.6", name: "Sampling Methods" },
      { code: "0.7", name: "Ethical Considerations" }
    ] },
    { number: 1, name: "Biological Bases of Behavior", topics: [
      { code: "1.1", name: "Interaction of Heredity and Environment" },
      { code: "1.2", name: "Overview of the Nervous System" },
      { code: "1.3", name: "The Neuron and Neural Firing" },
      { code: "1.4", name: "The Brain" },
      { code: "1.5", name: "Sleep" },
      { code: "1.6", name: "Sensation" }
    ] },
    { number: 2, name: "Cognition", topics: [
      { code: "2.1", name: "Perception" },
      { code: "2.2", name: "Thinking, Problem-Solving, Judgments, and Decision-Making" },
      { code: "2.3", name: "Introduction to Memory" },
      { code: "2.4", name: "Encoding Memories" },
      { code: "2.5", name: "Storing Memories" },
      { code: "2.6", name: "Retrieving Memories" },
      { code: "2.7", name: "Forgetting and Other Memory Challenges" },
      { code: "2.8", name: "Intelligence and Achievement" }
    ] },
    { number: 3, name: "Development and Learning", topics: [
      { code: "3.1", name: "Themes and Methods in Developmental Psychology" },
      { code: "3.2", name: "Physical Development Across the Lifespan" },
      { code: "3.3", name: "Gender and Sexual Orientation" },
      { code: "3.4", name: "Cognitive Development Across the Lifespan" },
      { code: "3.5", name: "Communication and Language Development" },
      { code: "3.6", name: "Social-Emotional Development Across the Lifespan" },
      { code: "3.7", name: "Classical Conditioning" },
      { code: "3.8", name: "Operant Conditioning" },
      { code: "3.9", name: "Social, Cognitive, and Neurological Factors in Learning" }
    ] },
    { number: 4, name: "Social Psychology and Personality", topics: [
      { code: "4.1", name: "Attribution Theory and Person Perception" },
      { code: "4.2", name: "Attitude Formation and Attitude Change" },
      { code: "4.3", name: "Psychology of Social Situations" },
      { code: "4.4", name: "Psychodynamic and Humanistic Theories of Personality" },
      { code: "4.5", name: "Social-Cognitive and Trait Theories of Personality" },
      { code: "4.6", name: "Motivation" },
      { code: "4.7", name: "Emotion" }
    ] },
    { number: 5, name: "Mental and Physical Health", topics: [
      { code: "5.1", name: "Introduction to Health Psychology" },
      { code: "5.2", name: "Positive Psychology" },
      { code: "5.3", name: "Explaining and Classifying Psychological Disorders" },
      { code: "5.4", name: "Selection of Categories of Psychological Disorders" },
      { code: "5.5", name: "Treatment of Psychological Disorders" }
    ] }
  ];

  /* ---------- Lookups ---------- */
  function index(list) {
    var out = {};
    list.forEach(function (x) { out[x.id] = x; });
    return out;
  }
  var groupById = index(groups), unitById = index(units), courseById = index(courses);

  function getGroup(id) { return groupById[id] || null; }
  function getUnit(id) { return unitById[id] || null; }
  function getCourse(id) { return courseById[id] || null; }
  // The course object for an id, or AP when the id is missing or unknown.
  function course(id) { return courseById[id] || courseById[defaultCourse]; }
  function allGroups() { return groups.slice(); }

  function letter(i) { return String.fromCharCode(65 + i); }

  // A course's units in order: [{ id, letter, name, groups: [{ id, name, codes }] }]
  function unitsFor(courseId) {
    return course(courseId).units.map(function (uid, i) {
      var u = unitById[uid];
      return { id: u.id, letter: letter(i), name: u.name, groups: u.groups.map(getGroup) };
    });
  }
  // One unit of a course (with its letter), or null if the course doesn't have it.
  function unitIn(courseId, unitId) {
    var list = unitsFor(courseId);
    for (var i = 0; i < list.length; i++) if (list[i].id === unitId) return list[i];
    return null;
  }
  // Ids of every group in the course's units (no repeats).
  function groupIdsFor(courseId) {
    var seen = {}, out = [];
    course(courseId).units.forEach(function (uid) {
      unitById[uid].groups.forEach(function (g) { if (!seen[g]) { seen[g] = true; out.push(g); } });
    });
    return out;
  }
  function courseHasGroup(courseId, groupId) { return groupIdsFor(courseId).indexOf(groupId) >= 0; }

  /* ---------- Matching ---------- */
  function codeMatches(code, target) {
    return code === target || code.indexOf(target + ".") === 0;
  }

  // True if any of the item's ced codes falls under any of the given codes.
  function matchesCodes(item, codes) {
    var ced = item.ced || [];
    for (var i = 0; i < ced.length; i++) {
      for (var j = 0; j < codes.length; j++) {
        if (codeMatches(ced[i], codes[j])) return true;
      }
    }
    return false;
  }

  // Ids of the groups an item (term, question, interactive) belongs to, in group order.
  function groupsOf(item) {
    return groups.filter(function (g) { return matchesCodes(item, g.codes); })
      .map(function (g) { return g.id; });
  }

  // The course's units an item belongs to (same shape as unitsFor).
  function unitsOf(item, courseId) {
    return unitsFor(courseId).filter(function (u) {
      return u.groups.some(function (g) { return matchesCodes(item, g.codes); });
    });
  }

  // Items that belong to at least one of the given group ids (unknown ids are ignored).
  function filterByGroups(items, groupIds) {
    var codes = [];
    groupIds.forEach(function (id) { var g = getGroup(id); if (g) codes = codes.concat(g.codes); });
    return items.filter(function (item) { return matchesCodes(item, codes); });
  }

  // Group ids from the page URL, e.g. ?groups=memory,thinking -> ["memory", "thinking"].
  function groupsFromUrl() {
    var m = /[?&]groups=([^&#]*)/.exec(window.location.search);
    if (!m) return [];
    return decodeURIComponent(m[1]).split(",").map(function (s) { return s.trim(); })
      .filter(function (id) { return getGroup(id); });
  }

  /* ---------- Terms and questions ---------- */
  // A missing status means active; only a retired term or question carries "omitted".
  function active(x) { return x.status !== "omitted"; }

  var termIndex = null, confusedIndex = null;
  function termMap() {
    if (!termIndex) termIndex = index(window.APPSYCH_TERMS || []);
    return termIndex;
  }
  function getTerm(id) {
    var t = termMap()[id];
    return t && active(t) ? t : null;
  }
  function termInCourse(term, courseId) {
    return !!term && active(term) && (term.courses || []).indexOf(course(courseId).id) >= 0;
  }
  // Active terms, in bank order; with a course id, only that course's terms.
  function terms(courseId) {
    return (window.APPSYCH_TERMS || []).filter(function (t) {
      return courseId ? termInCourse(t, courseId) : active(t);
    });
  }
  function courseHasTerms(courseId) {
    return (window.APPSYCH_TERMS || []).some(function (t) { return termInCourse(t, courseId); });
  }

  // The term id of the question's correct answer (choiceRefs[answer]), or null.
  function answerTerm(q) {
    var r = q.choiceRefs && q.choiceRefs[q.answer];
    return r || null;
  }
  function questionInCourse(q, courseId) {
    if (!active(q)) return false;
    var c = course(courseId).id;
    if (q.courses) return q.courses.indexOf(c) >= 0;
    var a = answerTerm(q);
    return termInCourse(termMap()[q.term], c) && (!a || termInCourse(termMap()[a], c));
  }
  // Questions games may use (not "omitted"); with a course id, only that course's.
  function questions(courseId) {
    return (window.APPSYCH_QUESTIONS || []).filter(function (q) {
      return courseId ? questionInCourse(q, courseId) : active(q);
    });
  }

  // Where a term is a Unit Exam Term in a course: null (not one), "all" (every group it is in),
  // or a list of group ids (from "course:group" entries).
  function unitTestGroups(term, courseId) {
    if (!termInCourse(term, courseId)) return null;
    var c = course(courseId).id, all = false, limited = [];
    (term.unitTest || []).forEach(function (e) {
      var parts = String(e).split(":");
      if (parts[0] !== c) return;
      if (parts.length === 1) all = true;
      else limited.push(parts[1]);
    });
    if (all) return "all";
    return limited.length ? limited : null;
  }
  // With groupIds (the chosen topics), a group-limited entry counts only if its group is chosen.
  function isUnitTestTerm(term, courseId, groupIds) {
    var g = unitTestGroups(term, courseId);
    if (!g) return false;
    if (g === "all" || !groupIds) return true;
    return g.some(function (id) { return groupIds.indexOf(id) >= 0; });
  }
  function isUnitTestQuestion(q, courseId) {
    if (!questionInCourse(q, courseId)) return false;
    var ids = [q.term], a = answerTerm(q);
    if (a && a !== q.term) ids.push(a);
    return ids.every(function (id) {
      var g = unitTestGroups(termMap()[id], courseId);
      if (!g) return false;
      if (g === "all") return true;
      return g.some(function (gid) { var grp = getGroup(gid); return grp && matchesCodes(q, grp.codes); });
    });
  }

  // Term ids students mix up with this one. Two-way: a pair is listed on one term only.
  function confusedWith(termId) {
    if (!confusedIndex) {
      confusedIndex = {};
      var link = function (a, b) {
        (confusedIndex[a] = confusedIndex[a] || []);
        if (confusedIndex[a].indexOf(b) < 0) confusedIndex[a].push(b);
      };
      (window.APPSYCH_TERMS || []).forEach(function (t) {
        (t.confusedWith || []).forEach(function (o) { link(t.id, o); link(o, t.id); });
      });
    }
    return (confusedIndex[termId] || []).filter(function (id) { return getTerm(id); });
  }

  /* ---------- Interactives ---------- */
  function interactiveInCourse(item, courseId) {
    var c = course(courseId).id;
    if (item.courses) return item.courses.indexOf(c) >= 0;
    if (item.review) return true;
    var ids = groupIdsFor(c);
    return groupsOf(item).some(function (g) { return ids.indexOf(g) >= 0; });
  }

  // Compatibility view: AP's units in the old teachingUnits shape (number = the letter).
  var teachingUnits = unitsFor("ap").map(function (u) {
    return { number: u.letter, id: u.id, name: u.name, groups: u.groups };
  });

  return {
    groups: groups,
    units: units,
    courses: courses,
    defaultCourse: defaultCourse,
    teachingUnits: teachingUnits,
    cedUnits: cedUnits,
    // groups, units and courses
    getGroup: getGroup,
    getUnit: getUnit,
    getCourse: getCourse,
    course: course,
    allGroups: allGroups,
    unitsFor: unitsFor,
    unitIn: unitIn,
    groupIdsFor: groupIdsFor,
    courseHasGroup: courseHasGroup,
    // matching
    matchesCodes: matchesCodes,
    groupsOf: groupsOf,
    unitsOf: unitsOf,
    filterByGroups: filterByGroups,
    groupsFromUrl: groupsFromUrl,
    // terms and questions
    getTerm: getTerm,
    terms: terms,
    termInCourse: termInCourse,
    courseHasTerms: courseHasTerms,
    answerTerm: answerTerm,
    questions: questions,
    questionInCourse: questionInCourse,
    unitTestGroups: unitTestGroups,
    isUnitTestTerm: isUnitTestTerm,
    isUnitTestQuestion: isUnitTestQuestion,
    confusedWith: confusedWith,
    // interactives
    interactiveInCourse: interactiveInCourse
  };
})();
