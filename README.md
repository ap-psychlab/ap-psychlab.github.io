# ap-psychlab.github.io

Interactive games and demos for AP Psychology concepts, built for students.

Live site: https://ap-psychlab.github.io

## Folder structure

```
index.html            Home page: demos grouped by unit
shared/
  theme.css           Colors, fonts, and components used by every page
  data/
    terms.js          Term bank (window.APPSYCH_TERMS)
    topics.js         CED units/topics, class units/topic groups, and filter helpers (window.APPSYCH_TOPICS)
style-guide/          Visual reference for theme.css
unit-0/               Science Practices (research methods, statistics)
unit-1/               Biological Bases of Behavior
unit-2/               Cognition
  memory-span/
unit-3/               Development and Learning
unit-4/               Social Psychology and Personality
unit-5/               Mental and Physical Health
review/               Games that work with any unit
  term-browser/
```

Unit folders follow the College Board's AP Psychology Course and Exam Description (CED). A unit folder appears once its first demo is added.

## Conventions

- Each demo has its own folder with `index.html`, `style.css`, and `script.js`.
- Folder names are lowercase with hyphens and named for the concept (e.g., `unit-2/memory-span/`).
- Demos inside a unit folder link the theme with `../../shared/theme.css`.
- A demo's address is its folder path, e.g., https://ap-psychlab.github.io/unit-2/memory-span/
- Shared data banks load with `<script src="../../shared/data/terms.js">` (no `fetch()`, so pages also work from a local folder).
- An item belongs to a topic group if any of its `ced` codes equals a group code or starts with that code followed by `.`; use `APPSYCH_TOPICS.filterByGroups()` rather than reimplementing this.
