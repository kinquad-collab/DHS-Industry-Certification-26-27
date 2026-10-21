# DHS Industry Certification 2026–27

Evidence website for Denmark High School's Business & Computer Science (BCS) Industry Certification, reviewed monthly by the SHRM Georgia IC consultants and at the on-site visit. Hosted on GitHub Pages. Plain HTML/CSS/JS, no build step.

Every page is generated from the JSON files in `data/`. **To update the site, edit the data files and add evidence files. You should not need to touch the HTML.**

## Layout

```
index.html, program.html, standard-1..6.html, checklists.html, timeline.html
data/
  site.json        School info, mission, pathways, teachers, FBLA membership numbers
  standards.json   All 49 items: status, points, requirements, evidence, consultant feedback
  tables.json      Every data table (rosters, budgets, demographics...) and its chart
  checklists.json  Monthly checklist submissions and feedback
  timeline.json    Deadlines and FBLA planning chart
evidence/standard-N/   PDFs and photos, one folder per standard
assets/                CSS, JS, logo, vendored Chart.js
scripts/check.mjs      Data validator
```

## Common updates

**Post evidence.** Upload the file to `evidence/standard-N/` (scan PDFs **upright**), then add an entry to the item's `evidence` list in `data/standards.json`:

```json
"evidence": [
  {
    "title": "Intro to Software Technology Syllabus",
    "href": "evidence/standard-1/syllabus-intro-software-tech.pdf",
    "course": "Intro to Software Technology",
    "teacher": "Ms. Smith",
    "period": "3",
    "date": "2026-10-28",
    "caption": "Optional extra description"
  }
]
```

PDFs get an Open button and an inline preview. Images (`.png`, `.jpg`) are displayed with a caption; **label photos** with class period, class name, teacher, and event/date. Anything else is shown as a link. Items with `groupBy` (`course`, `teacher`, `meeting`) group evidence under that field.

**Change an item's status.** Set `status` to `not-started`, `in-progress`, `submitted`, `met`, or `needs-correction`. Set `points` once you know the score.

**Record consultant feedback.** Add to the item's `feedback`, e.g. `{ "date": "2026-11-15", "comment": "No grading scale", "resolved": false }`. Corrections are due by the 1st of the next month.

**Fill a table.** Add rows to the table in `data/tables.json`. Each row is a list in the same order as `columns`. Tables with a `chart` draw it automatically once they have rows with numbers.

**FBLA membership (#46/#47).** Set `membership.fblaMembers` and `membership.bcsStudents` in `data/site.json`. The page calculates the percentage, the points, and how many BAAs are needed.

Then update the `updated` date on the standard (or in `site.json`) so the "Page last updated" line stays accurate.

## Before you push

```
node scripts/check.mjs
```

This catches JSON typos, missing evidence files, wrong row lengths, and missing item numbers. A JSON typo will break every page that reads that file.

## Preview locally

```
python3 -m http.server 8000
```

Open http://localhost:8000. (Opening the HTML file directly won't work, because the pages fetch the data files.)

## Privacy

- **Permission must be on file** before posting student work or photos. Keep permission records **out of this repo**.
- Items #11 (certificates) and #13–14 (membership cards) are marked `"private": true`. The page shows a note instead of the documents. Remove the flag only if school/county policy allows posting them.
- Every page has `noindex` so search engines don't list it. Anyone with the URL can still see everything here: **this is not a login**.
- Do not use the Georgia FBLA logo alone on any page.

## Deploying

Repo **Settings → Pages**: Source = "Deploy from a branch", branch `main`, folder `/ (root)`.
