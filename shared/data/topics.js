/* AP Psychology topic structure and shared filtering helpers: window.APPSYCH_TOPICS
 *
 * teachingUnits  My 9 teaching units and their topic groups. Group ids are stable
 *                (used in ?groups= links); don't rename them once used.
 * cedUnits       The CED's units and topics. Unit 0 (Science Practices) uses our own
 *                codes 0.1–0.7 because the CED has no Unit 0.
 *
 * Matching rule: an item belongs to a group or topic if any of its ced codes equals
 * one of the listed codes or starts with that code followed by ".".
 */
window.APPSYCH_TOPICS = (function () {
  var teachingUnits = [
    { number: 1, name: "Science Practices", groups: [
      { id: "perspectives", name: "Perspectives in Psychology", codes: ["0.1"] },
      { id: "research-methods", name: "Research Methods", codes: ["0.2"] },
      { id: "experimental-design", name: "Experimental Design", codes: ["0.3"] },
      { id: "research-bias", name: "Biases in Research", codes: ["0.4"] },
      { id: "statistics", name: "Data Analysis & Statistics", codes: ["0.5"] },
      { id: "sampling", name: "Sampling Methods", codes: ["0.6"] },
      { id: "ethics", name: "Ethical Considerations", codes: ["0.7"] }
    ] },
    { number: 2, name: "Biological Bases of Behavior", groups: [
      { id: "heredity", name: "Heredity & Evolution", codes: ["1.1"] },
      { id: "neurons", name: "Nervous System & Neurons", codes: ["1.2", "1.3.A", "1.3.B.1"] },
      { id: "neurotransmitters", name: "Neurotransmitters & Hormones", codes: ["1.3.B.2", "1.3.B.3"] },
      { id: "drugs", name: "Psychoactive Drugs", codes: ["1.3.C"] },
      { id: "brain-structures", name: "Brain Structures", codes: ["1.4.A.1", "1.4.A.2", "1.4.A.3", "1.4.A.4"] },
      { id: "brain-research", name: "Hemispheres & Brain Research", codes: ["1.4.A.5", "1.4.A.6", "1.4.A.7"] },
      { id: "sleep", name: "Sleep & Dreams", codes: ["1.5"] }
    ] },
    { number: 3, name: "Sensation & Perception", groups: [
      { id: "sensation", name: "Sensation Basics", codes: ["1.6.A"] },
      { id: "vision", name: "Vision", codes: ["1.6.B"] },
      { id: "hearing", name: "Hearing", codes: ["1.6.C"] },
      { id: "other-senses", name: "Chemical & Body Senses", codes: ["1.6.D", "1.6.E", "1.6.F", "1.6.G"] },
      { id: "perception", name: "Perceptual Organization & Attention", codes: ["2.1.A"] },
      { id: "depth-perception", name: "Depth & Visual Perception", codes: ["2.1.B"] }
    ] },
    { number: 4, name: "Cognition", groups: [
      { id: "thinking", name: "Thinking & Problem Solving", codes: ["2.2"] },
      { id: "memory", name: "Memory", codes: ["2.3", "2.4", "2.5", "2.6", "2.7"] },
      { id: "intelligence", name: "Intelligence & Testing", codes: ["2.8"] }
    ] },
    { number: 5, name: "Learning", groups: [
      { id: "classical-conditioning", name: "Classical Conditioning", codes: ["3.7"] },
      { id: "operant-conditioning", name: "Operant Conditioning", codes: ["3.8"] },
      { id: "social-cognitive-learning", name: "Social & Cognitive Learning", codes: ["3.9"] }
    ] },
    { number: 6, name: "Development", groups: [
      { id: "physical-development", name: "Physical Development", codes: ["3.1", "3.2"] },
      { id: "cognitive-development", name: "Piaget & Cognitive Development", codes: ["3.4"] },
      { id: "language", name: "Language", codes: ["3.5"] },
      { id: "attachment", name: "Attachment & Parenting", codes: ["3.6.A.2", "3.6.A.3"] },
      { id: "identity", name: "Erikson & Identity", codes: ["3.3", "3.6.A.6", "3.6.A.8"] },
      { id: "social-contexts", name: "Social Contexts & Relationships", codes: ["3.6.A.1", "3.6.A.4", "3.6.A.5", "3.6.A.7"] }
    ] },
    { number: 7, name: "Social Psychology & Personality", groups: [
      { id: "attribution", name: "Attribution & Person Perception", codes: ["4.1"] },
      { id: "attitudes", name: "Attitudes & Prejudice", codes: ["4.2"] },
      { id: "social-influence", name: "Social Influence & Persuasion", codes: ["4.3.A"] },
      { id: "groups", name: "Groups & Helping", codes: ["4.3.B", "4.3.C"] },
      { id: "personality-psychodynamic", name: "Psychodynamic & Humanistic Personality", codes: ["4.4"] },
      { id: "personality-trait", name: "Social-Cognitive & Trait Personality", codes: ["4.5"] }
    ] },
    { number: 8, name: "Motivation, Emotion, Stress & Positive Psychology", groups: [
      { id: "motivation", name: "Motivation", codes: ["4.6"] },
      { id: "emotion", name: "Emotion", codes: ["4.7"] },
      { id: "stress", name: "Stress & Coping", codes: ["5.1"] },
      { id: "positive-psychology", name: "Positive Psychology", codes: ["5.2"] }
    ] },
    { number: 9, name: "Psychological Disorders", groups: [
      { id: "defining-disorders", name: "Defining Disorders", codes: ["5.3"] },
      { id: "schizophrenia", name: "Neurodevelopmental & Schizophrenia", codes: ["5.4.A", "5.4.B"] },
      { id: "mood-disorders", name: "Mood Disorders", codes: ["5.4.C", "5.4.D"] },
      { id: "anxiety", name: "Anxiety & OCD", codes: ["5.4.E", "5.4.F"] },
      { id: "dissociative-trauma-eating", name: "Dissociative, Trauma & Eating", codes: ["5.4.G", "5.4.H", "5.4.I"] },
      { id: "personality-disorders", name: "Personality Disorders", codes: ["5.4.J"] },
      { id: "therapies", name: "Psychotherapies", codes: ["5.5.A", "5.5.B", "5.5.C", "5.5.D", "5.5.E"] },
      { id: "biological-treatments", name: "Hypnosis & Biological Treatments", codes: ["5.5.F", "5.5.G"] }
    ] }
  ];

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

  function allGroups() {
    var out = [];
    teachingUnits.forEach(function (u) { out = out.concat(u.groups); });
    return out;
  }

  function getGroup(id) {
    var groups = allGroups();
    for (var i = 0; i < groups.length; i++) if (groups[i].id === id) return groups[i];
    return null;
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

  return {
    teachingUnits: teachingUnits,
    cedUnits: cedUnits,
    matchesCodes: matchesCodes,
    allGroups: allGroups,
    getGroup: getGroup,
    filterByGroups: filterByGroups,
    groupsFromUrl: groupsFromUrl
  };
})();
