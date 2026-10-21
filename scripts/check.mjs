// Validates the data files: run `node scripts/check.mjs` before pushing.
import { readFileSync, existsSync } from "node:fs";

const errors = [];
const load = name => {
  try {
    return JSON.parse(readFileSync(`data/${name}.json`, "utf8"));
  } catch (err) {
    errors.push(`data/${name}.json: ${err.message}`);
    return null;
  }
};

const STATUSES = ["not-started", "in-progress", "submitted", "met", "needs-correction"];
const standards = load("standards");
const tables = load("tables");
load("site");
load("timeline");
const checklists = load("checklists");

if (standards && tables) {
  const seen = new Set();
  for (const std of standards.standards) {
    for (const item of std.items) {
      const label = `Item #${item.nums.join("/")}`;
      item.nums.forEach(n => {
        if (seen.has(n)) errors.push(`${label}: number ${n} appears twice`);
        seen.add(n);
      });
      if (!STATUSES.includes(item.status)) errors.push(`${label}: unknown status "${item.status}"`);
      for (const id of item.tables || []) {
        if (!tables[id]) errors.push(`${label}: table "${id}" is not in tables.json`);
      }
      for (const e of item.evidence) {
        if (!e.title || !e.href) errors.push(`${label}: evidence entry needs "title" and "href"`);
        else if (!/^https?:/.test(e.href) && !existsSync(e.href)) errors.push(`${label}: file not found: ${e.href}`);
      }
    }
  }
  for (let n = 1; n <= 49; n++) if (!seen.has(n)) errors.push(`Item #${n} is missing from standards.json`);

  for (const [id, t] of Object.entries(tables)) {
    if (id.startsWith("_")) continue;
    t.rows.forEach((r, i) => {
      if (r.length !== t.columns.length) errors.push(`Table "${id}" row ${i + 1}: ${r.length} cells, expected ${t.columns.length}`);
    });
  }
  if (checklists) {
    for (const c of checklists.checklists) {
      for (const n of c.items) if (!seen.has(n)) errors.push(`Checklist ${c.month}: unknown item #${n}`);
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("All data files OK.");
