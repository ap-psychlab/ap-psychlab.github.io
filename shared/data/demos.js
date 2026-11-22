/* AP Psych Lab — the list of demos: window.APPSYCH_DEMOS
 *
 * One entry per demo. The home page builds its cards from this list, and each demo's ⓘ popover
 * (shared/ui.js, matched by <header class="topbar" data-demo="<id>">) shows its entry.
 *
 *   id           stable, lowercase-hyphenated; never change once used
 *   title        as on the page's h1
 *   description  one line: the home-page card and the ⓘ popover. Written only here.
 *   path         folder from the site root, ending in "/" (never changes once live)
 *   ced          CED codes; the home page places the demo under every class unit whose topic
 *                groups match (APPSYCH_TOPICS). Empty for review games.
 *   review       true for games that work with any unit (shown in the Review section)
 *   template     "column" (900px), "split" (1400px, 2/3 + side panel) or "stage" (1400px, one area)
 *   status       "listed" (on the home page) or "unlisted" (reachable by link only). Set
 *                "listed" only after I confirm a demo is finished.
 *   image, alt   card image (assets/card.webp, 1200×750) and its alt text; "" until made
 *   howTo        2–3 short lines for the ⓘ popover
 *
 * howTo is checked against each demo when it moves to the shared title bar.
 */
window.APPSYCH_DEMOS = [
  {
    id: "memory-span",
    title: "Memory Span Test",
    description: "Repeat a growing sequence of colors and tones to find the limit of your short-term memory.",
    path: "unit-2/memory-span/",
    ced: ["2.5.A.1", "2.3.A.3"],
    review: false,
    template: "split",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Watch and listen as the colors flash, then repeat the sequence in the same order.",
      "Each round adds one more color. The game ends at your first mistake.",
      "Your score is the longest sequence you repeated correctly."
    ]
  },
  {
    id: "outguess-the-robot",
    title: "Outguess the Robot",
    description: "Guess which color a robot will pick when it favors red 70% of the time, and see how the gambler's fallacy sneaks into your strategy.",
    path: "unit-2/gamblers-fallacy/",
    ced: ["2.2.A.6"],
    review: false,
    template: "split",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Each round, guess whether Chip the robot will pick red or blue.",
      "Chip picks red 70% of the time, and every pick is independent of the last.",
      "After 40 rounds, compare your score with simply guessing red every time."
    ]
  },
  {
    id: "lights-off",
    title: "Lights Off",
    description: "Turn every light off, first with hunches, then with an algorithm that always works, and see when each approach is the better tool.",
    path: "unit-2/lights-off/",
    ced: ["2.2.A.3", "2.2.A.4", "2.2.A.5"],
    review: false,
    template: "split",
    status: "unlisted",
    image: "", alt: "",
    howTo: [
      "Pressing a light flips it and its up, down, left and right neighbors. Turn every light off.",
      "Try a few puzzles on your own in Practice, then learn the algorithm in the Tutorial.",
      "Timed: solve as many puzzles as you can in 90 seconds."
    ]
  },
  {
    id: "condition-the-cat",
    title: "Condition the Cat",
    description: "Train a cat to run a machine using only rewards and punishments, and see operant conditioning and shaping at work.",
    path: "unit-3/condition-the-cat/",
    ced: ["3.8.A.1", "3.8.A.2", "3.8.A.3"],
    review: false,
    template: "stage",
    status: "unlisted",
    image: "", alt: "",
    howTo: [
      "Lead the cat with the laser pointer. You can't move it directly.",
      "Reward (Treat, Pet) or punish (Spray, Buzzer) what the cat just did.",
      "Win by getting the cat through the whole machine in one run."
    ]
  },
  {
    id: "big-five-reunion",
    title: "Big Five Reunion",
    description: "Meet the guests at a 20-year class reunion and rate each one's Big Five personality traits from what you learn about them.",
    path: "unit-4/big-five-reunion/",
    ced: ["4.5.B.1", "4.5.B.2"],
    review: false,
    template: "stage",
    status: "unlisted",
    image: "", alt: "",
    howTo: [
      "Click or tap a guest to read their profile.",
      "Rate their Openness, Conscientiousness, Extraversion, Agreeableness and Emotional Stability.",
      "Check your ratings against the answers, and rate all 11 guests to end the night."
    ]
  },
  {
    id: "term-browser",
    title: "Term Browser",
    description: "Browse every course term by unit and topic, with definitions and CED codes.",
    path: "review/term-browser/",
    ced: [],
    review: true,
    template: "stage",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Pick a unit, then a topic, to list its terms.",
      "Or search: the search covers the chosen topic, else the chosen unit, else every term."
    ]
  },
  {
    id: "word-search",
    title: "Psych Vocab Word Search",
    description: "Find hidden course terms using only their definitions, from the topics you choose.",
    path: "review/word-search/",
    ced: [],
    review: true,
    template: "split",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Choose your topics, then read each definition and find its term in the grid.",
      "Terms can run in any direction."
    ]
  },
  {
    id: "practice-questions",
    title: "Practice Questions",
    description: "Multiple-choice practice from the topics you choose, as a quiz scored at the end or an endless set with instant feedback.",
    path: "review/practice-questions/",
    ced: [],
    review: true,
    template: "column",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Choose your topics, then a quiz (scored at the end) or endless practice (instant feedback).",
      "After answering, open each choice's feedback and the terms used in the question.",
      "Retry missed replays only the questions you got wrong."
    ]
  },
  {
    id: "sky-climb",
    title: "Sky Climb",
    description: "Climb floating islands to a treasure at 500 ft, answering a practice question at each lantern on the way up.",
    path: "review/sky-climb/",
    ced: [],
    review: true,
    template: "column",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Choose your topics, then climb from island to island.",
      "Answer the practice question at each lantern on the way up to the treasure at 500 ft."
    ]
  },
  {
    id: "quiz-board",
    title: "Classroom Quiz Board",
    description: "A projector-friendly team game: pick a topic and a point value, answer the question, and keep score for up to 12 teams.",
    path: "review/quiz-board/",
    ced: [],
    review: true,
    template: "stage",
    status: "listed",
    image: "", alt: "",
    howTo: [
      "Choose topics and teams, then teams take turns picking a topic and a point value.",
      "Harder questions are worth more. Keep score for up to 12 teams."
    ]
  },
  {
    id: "event-horizon",
    title: "Event Horizon",
    description: "Answer psychology questions to earn credits from a rogue AI, then repair the ship before it falls into a black hole.",
    path: "review/event-horizon/",
    ced: [],
    review: true,
    template: "stage",
    status: "unlisted",
    image: "", alt: "",
    howTo: [
      "Walk the ship with the arrow keys or WASD. Press Space to repair a failed system.",
      "Earn credits at the main terminal by answering questions, and pay B.F. 9000 to open doors.",
      "Keep the ship out of the event horizon until the hyperdrive is ready."
    ]
  }
];
