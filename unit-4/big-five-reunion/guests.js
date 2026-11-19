/* Big Five Reunion: guest data. window.APPSYCH_REUNION_GUESTS
 *
 * answers: 1 = very low, 2 = low, 3 = medium, 4 = high, 5 = very high.
 *   Trait keys: o = Openness to Experience, c = Conscientiousness, e = Extraversion,
 *   a = Agreeableness, s = Emotional Stability.
 * then / now: the yearbook superlative and the "Now" paragraph (written in step 4).
 *   now is an array of sentences: { text, clue: [trait keys] or null }.
 * spot / activity: where the guest is in the room and what they're doing (step 2).
 * look: drawn by the character builder in script.js. Color names refer to the
 *   art palette in style.css (--a-<name>). "skin" uses the guest's skin color.
 *   build: h scales leg length, w scales body width.
 *   top.style: vest, hawaiian, scrubs, overalls, sweatervest, track, workshirt,
 *     blazer, coat, leather, buttonshirt, qzip (quarter-zip sweater over a shirt
 *     and tie; under = shirt color, tie = tie color).
 *   face.glasses: true (thin) or "thick"; face.beard: stubble, trim, full or circle
 *     (a trimmed beard joined to the mustache); face.mustache: true adds a mustache.
 *   top.sleeve: upper-arm color; top.fore: forearm color (skin = short or rolled
 *     sleeves, which also adds a cuff); top.stripe: a stripe down the sleeves.
 *   hold: a prop in the guest's left (L) or right (R) hand, as the viewer sees them.
 */
window.APPSYCH_REUNION_GUESTS = [
  {
    id: "marcus", name: "Marcus Bell", job: "startup founder",
    answers: { o: 4, c: 4, e: 5, a: 2, s: 4 },
    then: "", now: [],
    spot: "snacks", activity: "pitch",
    look: {
      build: { h: 1.08, w: 1 },
      skin: "skin-5",
      hair: { style: "fade", color: "hair-black" },
      face: { brows: "cocky", mouth: "smirk" },
      top: { style: "vest", main: "navy", sleeve: "sky" },
      bottom: { pants: "khaki", shoe: "sneaker", shoeColor: "white", sole: "silver" },
      extras: ["earbud"],
      hold: { R: "phone" }
    }
  },
  {
    id: "benny", name: "Benny Szabo", job: "wedding DJ",
    answers: { o: 3, c: 2, e: 5, a: 4, s: 2 },
    then: "", now: [],
    spot: "dj", activity: "dj",
    look: {
      build: { h: 0.95, w: 1.1 },
      skin: "skin-1",
      hair: { style: "tall", color: "hair-auburn" },
      face: { brows: "soft", mouth: "grin" },
      top: { style: "hawaiian", main: "url(#rb-floral)", sleeve: "url(#rb-floral)", fore: "skin" },
      bottom: { pants: "charcoal", shoe: "sneaker", shoeColor: "red", sole: "white" },
      extras: ["headphones"]
    }
  },
  {
    id: "hannah", name: "Hannah Kowal", job: "ER nurse",
    answers: { o: 3, c: 5, e: 2, a: 3, s: 5 },
    then: "", now: [],
    spot: "table", activity: "sip",
    look: {
      build: { h: 1, w: 0.96 },
      skin: "skin-2",
      hair: { style: "messybun", color: "hair-lightbrown" },
      face: { brows: "soft", mouth: "small" },
      top: { style: "scrubs", main: "scrub", sleeve: "scrub", fore: "skin" },
      bottom: { pants: "scrub", shoe: "clog", shoeColor: "plum" },
      extras: ["lanyard"],
      hold: { R: "cup" }
    }
  },
  {
    id: "june", name: "June Castillo", job: "muralist",
    answers: { o: 5, c: 1, e: 3, a: 4, s: 3 },
    then: "", now: [],
    spot: "dance", activity: "free-dance",
    look: {
      build: { h: 0.97, w: 1 },
      skin: "skin-3",
      hair: { style: "bunpencil", color: "hair-dkbrown" },
      face: { brows: "soft", mouth: "smile" },
      top: { style: "overalls", main: "url(#rb-stripes)", sleeve: "mustard", fore: "skin" },
      bottom: { pants: "denim", shoe: "sneaker", shoeColor: "teal", sole: "white" },
      extras: ["hoops"]
    }
  },
  {
    id: "theo", name: "Theo Lind", job: "accountant",
    answers: { o: 2, c: 4, e: 2, a: 4, s: 1 },
    then: "", now: [],
    spot: "table", activity: "watch",
    look: {
      build: { h: 1.02, w: 0.92 },
      skin: "skin-1",
      hair: { style: "sidepart", color: "hair-blond" },
      face: { brows: "worried", mouth: "small" },
      top: { style: "sweatervest", main: "url(#rb-argyle)", sleeve: "white" },
      bottom: { pants: "gray", shoe: "loafer", shoeColor: "brown" },
      extras: ["watch"]
    }
  },
  {
    id: "teacher", name: "Owen Hartley", job: "psychology teacher",
    answers: { o: 5, c: 4, e: 1, a: 4, s: 2 },
    then: "", now: [],
    spot: "table", activity: "people-watch",
    look: {
      build: { h: 1.03, w: 1.02 },
      skin: "skin-2b",
      hair: { style: "curly", color: "hair-dkbrown" },
      face: { brows: "soft", mouth: "small", glasses: "thick", beard: "circle" },
      top: { style: "qzip", main: "cobalt", sleeve: "cobalt", under: "oxford", tie: "mustard" },
      bottom: { pants: "charcoal", shoe: "loafer", shoeColor: "brown" },
      hold: { R: "book" }
    }
  },
  {
    id: "gil", name: "Gil Marsh", job: "mechanic",
    answers: { o: 1, c: 3, e: 1, a: 1, s: 3 },
    then: "", now: [],
    spot: "wall", activity: "lean-cross",
    look: {
      build: { h: 1, w: 1.15 },
      skin: "skin-2",
      hair: { style: "cap", color: "hair-gray", hat: "forest" },
      face: { brows: "grumpy", mouth: "flat", beard: "stubble", mustache: true },
      top: { style: "workshirt", main: "steel", sleeve: "steel", patch: "GIL" },
      bottom: { pants: "jeans", shoe: "boot", shoeColor: "brown" }
    }
  },
  {
    id: "kim", name: "Kim Tran", job: "reunion organizer",
    answers: { o: 3, c: 5, e: 5, a: 5, s: 4 },
    then: "", now: [],
    spot: "checkin", activity: "greet",
    look: {
      build: { h: 0.9, w: 0.95 },
      skin: "skin-2",
      hair: { style: "bob", color: "hair-black" },
      face: { brows: "soft", mouth: "grin", ears: false },
      top: { style: "blazer", main: "coral", sleeve: "coral" },
      bottom: { pants: "charcoal", shoe: "loafer", shoeColor: "black" },
      extras: ["nametag"],
      hold: { L: "clipboard" }
    }
  },
  {
    id: "amara", name: "Amara Osei", job: "astrophysicist",
    answers: { o: 5, c: 4, e: 1, a: 3, s: 4 },
    then: "", now: [],
    spot: "window", activity: "stargaze",
    look: {
      build: { h: 1.08, w: 0.95 },
      skin: "skin-6",
      hair: { style: "locbun", color: "hair-black" },
      face: { brows: "soft", mouth: "small", glasses: true },
      top: { style: "coat", main: "plum", sleeve: "plum" },
      bottom: { pants: "charcoal", shoe: "boot", shoeColor: "black" },
      extras: ["scarf"]
    }
  },
  {
    id: "jax", name: "Jax Holloway", job: "stunt performer",
    answers: { o: 4, c: 1, e: 4, a: 2, s: 2 },
    then: "", now: [],
    spot: "dance", activity: "dance-wild",
    look: {
      build: { h: 1.04, w: 1.05 },
      skin: "skin-2",
      hair: { style: "spiky", color: "hair-blond" },
      face: { brows: "cocky", mouth: "smirk" },
      top: { style: "leather", main: "leather", sleeve: "leather" },
      bottom: { pants: "jeans-lt", shoe: "boot", shoeColor: "brown" },
      extras: ["sling", "bandage"]
    }
  },
  {
    id: "sam", name: "Sam Adeyemi", job: "beekeeper",
    answers: { o: 2, c: 3, e: 2, a: 5, s: 5 },
    then: "", now: [],
    spot: "table", activity: "nod",
    look: {
      build: { h: 1.05, w: 1.12 },
      skin: "skin-5",
      hair: { style: "straw", color: "hair-black", hat: "straw" },
      face: { brows: "soft", mouth: "smile", beard: "full" },
      top: { style: "buttonshirt", main: "olive", sleeve: "olive", fore: "skin" },
      bottom: { pants: "khaki-dk", shoe: "boot", shoeColor: "brown" },
      hold: { L: "honey" }
    }
  }
];
