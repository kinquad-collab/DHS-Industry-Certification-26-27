// Renders every page from the JSON files in /data.
// Each HTML page sets <body data-page="..."> (and data-standard="N" on standard pages).

const STATUS = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "submitted": "Submitted",
  "met": "Met",
  "needs-correction": "Needs correction"
};

const NAV = [
  { href: "index.html", label: "Home", page: "home" },
  { href: "program.html", label: "Program", page: "program" },
  { href: "standard-1.html", label: "1 · Curriculum", std: 1 },
  { href: "standard-2.html", label: "2 · School & Teachers", std: 2 },
  { href: "standard-3.html", label: "3 · Advisory", std: 3 },
  { href: "standard-4.html", label: "4 · Employability", std: 4 },
  { href: "standard-5.html", label: "5 · Facilities", std: 5 },
  { href: "standard-6.html", label: "6 · FBLA", std: 6 },
  { href: "checklists.html", label: "Checklists", page: "checklists" },
  { href: "timeline.html", label: "Timeline", page: "timeline" }
];

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const PDF_EXT = /\.pdf$/i;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadJSON(name) {
  const res = await fetch(`data/${name}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load data/${name}.json`);
  return res.json();
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function itemLabel(nums) {
  return nums.length > 2 ? `#${nums[0]}–${nums[nums.length - 1]}` : nums.map(n => `#${n}`).join(" & ");
}

function itemAnchor(nums) {
  return `item-${nums[0]}`;
}

function badge(status) {
  return `<span class="badge badge-${esc(status)}">${esc(STATUS[status] || status)}</span>`;
}

// ---------- Layout ----------

function renderHeader(site) {
  const body = document.body;
  const current = body.dataset.page;
  const std = Number(body.dataset.standard) || null;
  const links = NAV.map(n => {
    const active = (n.page && n.page === current) || (n.std && n.std === std);
    return `<li><a href="${n.href}"${active ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`;
  }).join("");

  document.getElementById("site-header").innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="index.html">
        <img src="assets/img/denmark-logo.png" alt="Denmark High School logo" width="56" height="53">
        <span>
          <span class="brand-title">Industry Certification</span>
          <span class="brand-sub">${esc(site.school)} · ${esc(site.program)} · ${esc(site.year)}</span>
        </span>
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
    </div>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul class="container">${links}</ul>
    </nav>`;

  const toggle = document.querySelector(".nav-toggle");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    document.getElementById("site-nav").classList.toggle("open", !open);
  });
}

function renderFooter(site, updated) {
  document.getElementById("site-footer").innerHTML = `
    <div class="container footer-inner">
      <p>${esc(site.school)} · ${esc(site.district)} · ${esc(site.program)} Industry Certification ${esc(site.year)}</p>
      <p>Page last updated: <strong>${esc(formatDate(updated || site.updated))}</strong></p>
    </div>`;
}

// ---------- Tables & charts ----------

function renderTable(id, table) {
  if (!table) return `<p class="warn">Missing table "${esc(id)}" in data/tables.json</p>`;
  const head = table.columns.map(c => `<th scope="col">${esc(c)}</th>`).join("");
  const rows = table.rows.length
    ? table.rows.map(r => `<tr>${table.columns.map((_, i) => `<td>${esc(r[i])}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${table.columns.length}" class="empty">No entries yet.</td></tr>`;
  const chart = table.chart && table.rows.length ? `<div class="chart-wrap"><canvas data-chart="${esc(id)}" aria-label="${esc(table.title)} chart" role="img"></canvas></div>` : "";
  return `
    <figure class="data-table" id="table-${esc(id)}">
      <figcaption>${esc(table.title)}</figcaption>
      ${chart}
      <div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      ${table.note ? `<p class="table-note">${esc(table.note)}</p>` : ""}
    </figure>`;
}

const CHART_COLORS = ["#16274D", "#7AAED5", "#3E6A9E", "#B9D4EC", "#5A5F6B", "#C9A227", "#2F8F83", "#9C4A5B"];

function drawCharts(tables) {
  if (typeof Chart === "undefined") return;
  document.querySelectorAll("canvas[data-chart]").forEach(canvas => {
    const t = tables[canvas.dataset.chart];
    const { type, label, values } = t.chart;
    const labels = t.rows.map(r => r[label]);
    const datasets = values.map((col, i) => ({
      label: t.columns[col],
      data: t.rows.map(r => Number(String(r[col]).replace(/[^0-9.\-]/g, "")) || 0),
      backgroundColor: type === "bar" ? CHART_COLORS[i % CHART_COLORS.length] : CHART_COLORS,
      borderColor: "#ffffff",
      borderWidth: type === "bar" ? 0 : 2
    }));
    new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: type !== "bar" || values.length > 1, position: "bottom" } },
        scales: type === "bar" ? { y: { beginAtZero: true } } : undefined
      }
    });
  });
}

// ---------- Evidence ----------

function renderEvidenceEntry(e) {
  const meta = [e.course, e.period && `Period ${e.period}`, e.teacher, e.date && formatDate(e.date)].filter(Boolean).join(" · ");
  const caption = `<strong>${esc(e.title)}</strong>${meta ? `<span class="meta">${esc(meta)}</span>` : ""}${e.caption ? `<span class="caption">${esc(e.caption)}</span>` : ""}`;

  if (IMAGE_EXT.test(e.href)) {
    return `<li class="evidence evidence-image">
      <figure><a href="${esc(e.href)}" target="_blank" rel="noopener"><img src="${esc(e.href)}" alt="${esc(e.alt || e.title)}" loading="lazy"></a>
      <figcaption>${caption}</figcaption></figure></li>`;
  }
  if (PDF_EXT.test(e.href)) {
    return `<li class="evidence evidence-pdf">
      <div class="evidence-row"><span class="file-type">PDF</span><span class="evidence-text">${caption}</span>
      <a class="btn" href="${esc(e.href)}" target="_blank" rel="noopener">Open</a></div>
      <details><summary>Preview</summary><iframe src="${esc(e.href)}" title="${esc(e.title)}" loading="lazy"></iframe></details></li>`;
  }
  return `<li class="evidence evidence-link">
    <div class="evidence-row"><span class="file-type">Link</span><span class="evidence-text">${caption}</span>
    <a class="btn" href="${esc(e.href)}" target="_blank" rel="noopener">Open</a></div></li>`;
}

function renderEvidence(item) {
  if (item.private) {
    const note = `<p class="private-note">Documents for this item contain personal information and are shown to consultants on request or at the on-site visit, per school and county policy.</p>`;
    if (!item.evidence.length) return note;
  }
  if (!item.evidence.length) return `<p class="empty">No evidence posted yet.</p>`;

  const key = item.groupBy;
  if (!key) return `<ul class="evidence-list">${item.evidence.map(renderEvidenceEntry).join("")}</ul>`;

  const groups = new Map();
  item.evidence.forEach(e => {
    const g = e[key] || "General";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  });
  return [...groups].map(([name, list]) => `
    <div class="evidence-group">
      <h4>${esc(name)}</h4>
      <ul class="evidence-list">${list.map(renderEvidenceEntry).join("")}</ul>
    </div>`).join("");
}

// ---------- Items & standards ----------

function membershipBlock(site) {
  const { fblaMembers, bcsStudents, membersSource } = site.membership || {};
  if (!fblaMembers) {
    return `<p class="empty">Enter FBLA members and BCS enrollment in data/site.json to calculate.</p>`;
  }
  const baa = Math.ceil(fblaMembers * 0.1);
  let pctStat = `<div class="stat"><span class="stat-value">–</span><span class="stat-label">Membership % (BCS enrollment pending)</span></div>`;
  if (bcsStudents) {
    const pct = (fblaMembers / bcsStudents) * 100;
    const pts = pct > 25 ? 3 : pct > 10 ? 2 : 1;
    pctStat = `<div class="stat"><span class="stat-value">${pct.toFixed(1)}%</span><span class="stat-label">Membership (${pts} pt${pts > 1 ? "s" : ""})</span></div>`;
  }
  return `<div class="stat-row">
    <div class="stat"><span class="stat-value">${fblaMembers}${bcsStudents ? ` / ${bcsStudents}` : ""}</span><span class="stat-label">FBLA members${bcsStudents ? " / BCS students" : ""}</span></div>
    ${pctStat}
    <div class="stat"><span class="stat-value">${baa}</span><span class="stat-label">BAAs needed for #47</span></div>
  </div>
  ${membersSource ? `<p class="table-note">${esc(membersSource)}</p>` : ""}`;
}

function renderItem(item, tables, site) {
  const anchors = item.nums.slice(1).map(n => `<span id="item-${n}" class="anchor"></span>`).join("");
  const points = item.maxPoints != null
    ? `<span class="points">${item.points ?? "–"} / ${item.maxPoints} pts${item.bonus ? " bonus" : ""}</span>` : "";
  const feedback = (item.feedback || []).length
    ? `<div class="feedback"><h4>Consultant feedback</h4><ul>${item.feedback.map(f => `<li><strong>${esc(f.date ? formatDate(f.date) : "")}</strong> ${esc(f.comment)}${f.resolved ? ' <span class="resolved">Corrected</span>' : ""}</li>`).join("")}</ul></div>` : "";

  return `
    <article class="item" id="${itemAnchor(item.nums)}">${anchors}
      <header class="item-head">
        <h3><span class="item-num">${itemLabel(item.nums)}</span> ${esc(item.title)}</h3>
        <div class="item-tags">${item.due ? `<span class="due">Due: ${esc(item.due)}</span>` : ""}${points}${badge(item.status)}</div>
      </header>
      ${item.scope ? `<p class="scope">${esc(item.scope)}</p>` : ""}
      <details class="reqs"${item.status === "met" ? "" : " open"}>
        <summary>Requirements</summary>
        <ul>${item.requirements.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
      </details>
      ${feedback}
      ${item.membership ? membershipBlock(site) : ""}
      ${(item.tables || []).map(id => renderTable(id, tables[id])).join("")}
      <section class="evidence-section">
        <h4 class="visually-hidden">Evidence</h4>
        ${renderEvidence(item)}
      </section>
    </article>`;
}

function standardScore(std) {
  const scored = std.items.filter(i => i.points != null);
  const earned = scored.reduce((s, i) => s + Number(i.points), 0);
  const counts = {};
  std.items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
  return { earned, anyScored: scored.length > 0, counts, met: std.items.filter(i => i.status === "met").length };
}

function progressBar(std) {
  const { met } = standardScore(std);
  const pct = Math.round((met / std.items.length) * 100);
  return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Items met">
    <span style="width:${pct}%"></span></div>
    <p class="progress-label">${met} of ${std.items.length} items met</p>`;
}

async function pageStandard(site) {
  const [{ standards }, tables] = await Promise.all([loadJSON("standards"), loadJSON("tables")]);
  const std = standards.find(s => s.id === Number(document.body.dataset.standard));
  document.title = `Standard ${std.id}: ${std.title} | DHS Industry Certification`;

  const toc = std.items.map(i => `<li><a href="#${itemAnchor(i.nums)}">${itemLabel(i.nums)} ${esc(i.title)}</a> ${badge(i.status)}</li>`).join("");
  document.getElementById("content").innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Standard ${std.id}</p>
      <h1>${esc(std.title)}</h1>
      <p class="minimum">Minimum required: <strong>${std.required} of ${std.possible} points</strong>${std.required === std.possible ? " (perfect score required)" : ""}</p>
      ${progressBar(std)}
    </section>
    <nav class="toc" aria-label="Items in this standard"><h2>Items</h2><ul>${toc}</ul></nav>
    ${std.items.map(i => renderItem(i, tables, site)).join("")}`;
  renderFooter(site, std.updated);
  drawCharts(tables);
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

// ---------- Other pages ----------

async function pageHome(site) {
  const [{ standards }, { deadlines }] = await Promise.all([loadJSON("standards"), loadJSON("timeline")]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = deadlines.filter(d => d.date >= today).slice(0, 4);

  const cards = standards.map(s => `
    <a class="std-card" href="standard-${s.id}.html">
      <span class="std-num">${s.id}</span>
      <h3>${esc(s.title)}</h3>
      <p>Minimum ${s.required} of ${s.possible} points · ${s.items.length} items</p>
      ${progressBar(s)}
    </a>`).join("");

  document.getElementById("content").innerHTML = `
    <section class="hero">
      <img src="assets/img/denmark-logo.png" alt="" width="128" height="122">
      <div>
        <p class="eyebrow">${esc(site.school)} · ${esc(site.year)}</p>
        <h1>${esc(site.program)} Industry Certification</h1>
        <p class="lead">${esc(site.mission)}</p>
      </div>
    </section>
    <section>
      <h2>Standards</h2>
      <p>Certification requires the minimum score in <strong>every</strong> standard. Each item below is numbered to match the IC booklet.</p>
      <div class="std-grid">${cards}</div>
    </section>
    <section>
      <h2>Upcoming deadlines</h2>
      <ul class="deadline-list">${upcoming.map(d => `<li><time datetime="${d.date}">${formatDate(d.date)}</time> ${esc(d.title)}${d.verify ? ' <span class="verify">To confirm</span>' : ""}</li>`).join("")}</ul>
      <p><a href="timeline.html">Full timeline</a></p>
    </section>
    <section class="contacts">
      <h2>Contacts</h2>
      <p><strong>IC School Chair:</strong> ${esc(site.icChair)}<br><strong>IC Consultant:</strong> ${esc(site.consultant)}</p>
    </section>`;
  renderFooter(site);
}

async function pageProgram(site) {
  const tables = await loadJSON("tables");
  const pathways = site.pathways.map(p => `
    <article class="pathway" id="pathway-${esc(p.code)}">
      <h3>${esc(p.name)}</h3>
      <p class="meta">${esc(p.cluster)} · State pathway ${esc(p.code)}</p>
      <p>${esc(p.description)}</p>
      <h4>Courses</h4>
      <ol class="course-list">${p.courses.map(c => `<li>${esc(c.name)}${c.number ? ` <span class="course-num">${esc(c.number)}</span>` : ""}</li>`).join("")}</ol>
      ${p.verify ? `<p class="verify-note"><span class="verify">To confirm</span> ${esc(p.verify)}</p>` : ""}
      <h4>Career opportunities</h4>
      <p class="careers">${p.careers.map(esc).join(" · ")}</p>
      <p><strong>End of Pathway Assessment:</strong> ${p.eopa ? esc(p.eopa) : '<span class="empty">Pending confirmation of the 2026-27 assessment</span>'}</p>
    </article>`).join("");
  const teachers = site.teachers.map(t => `<tr><td>${esc(t.name)}</td><td>${esc(t.courses.join(", "))}</td><td>${esc(t.room)}</td></tr>`).join("");
  const profile = site.profile.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}${f.source ? `<span class="source">${esc(f.source)}</span>` : ""}</dd></div>`).join("");
  const programs = site.districtPrograms.map(d => `<li><strong>${esc(d.name)}:</strong> ${esc(d.detail)}</li>`).join("");

  document.getElementById("content").innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Program Overview</p>
      <h1>${esc(site.program)} at ${esc(site.school)}</h1>
    </section>
    <section id="mission"><h2>Mission Statement <a class="item-link" href="standard-2.html#item-10">#10</a></h2><p class="lead">${esc(site.mission)}</p></section>
    <section id="school"><h2>School at a Glance</h2><dl class="profile">${profile}</dl>
      <h3>${esc(site.district)}</h3>
      <ul>${site.districtFacts.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <p class="table-note">Source: ${esc(site.districtFacts.source)}</p>
    </section>
    <section id="pathways"><h2>Pathways & Courses</h2>
      <p>${esc(site.pathwayNote)}</p>
      <div class="pathway-grid">${pathways}</div>
    </section>
    <section id="opportunities"><h2>Career Opportunities Through ${esc(site.district)}</h2><ul>${programs}</ul></section>
    <section id="teachers"><h2>Teachers</h2>
      <div class="table-scroll"><table><thead><tr><th scope="col">Teacher</th><th scope="col">Courses</th><th scope="col">Room</th></tr></thead><tbody>${teachers}</tbody></table></div>
    </section>
    <section id="offerings"><h2>Enrollment, Completers & Credentials <a class="item-link" href="standard-2.html#item-8">#8 & #9</a></h2>
      ${renderTable("offerings-2025-26", tables["offerings-2025-26"])}
      ${renderTable("offerings-2026-27", tables["offerings-2026-27"])}
    </section>
    <section id="fbla"><h2>Join FBLA <a class="item-link" href="standard-2.html#item-10">#10</a></h2>
      <p class="lead">${esc(site.fblaRecruitment)}</p>
      ${site.fblaPlan ? fblaPlanBlock(site.fblaPlan) : ""}
    </section>`;
  renderFooter(site);
}

function fblaPlanBlock(plan) {
  return `<article class="plan">
    <h3>${esc(plan.title)}</h3>
    <p><strong>Goal:</strong> ${esc(plan.goal)}</p>
    <ol class="plan-steps">${plan.steps.map(s => `<li><strong>${esc(s.title)}.</strong> ${esc(s.text)}</li>`).join("")}</ol>
    <h4>Recruitment tools</h4>
    <ul class="tag-list">${plan.tools.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    <h4>Tracking progress</h4>
    <p>${esc(plan.tracking)}</p>
  </article>`;
}

async function pageChecklists(site) {
  const [{ standards }, { checklists }] = await Promise.all([loadJSON("standards"), loadJSON("checklists")]);
  const byNum = new Map();
  standards.forEach(s => s.items.forEach(i => {
    const entry = { item: i, std: s };
    i.nums.forEach(n => byNum.set(n, entry));
  }));

  const summary = standards.map(s => {
    const { earned, anyScored, counts } = standardScore(s);
    return `<tr>
      <th scope="row"><a href="standard-${s.id}.html">${s.id}. ${esc(s.title)}</a></th>
      <td>${s.required} / ${s.possible}</td>
      <td>${anyScored ? earned : "–"}</td>
      <td>${counts["met"] || 0}</td><td>${counts["in-progress"] || 0}</td><td>${counts["submitted"] || 0}</td>
      <td>${counts["needs-correction"] || 0}</td><td>${counts["not-started"] || 0}</td>
    </tr>`;
  }).join("");

  const months = checklists.map(c => {
    const items = [...new Set(c.items.map(n => byNum.get(n)).filter(Boolean))];
    const rows = items.map(({ item, std }) => `<li><a href="standard-${std.id}.html#${itemAnchor(item.nums)}">${itemLabel(item.nums)} ${esc(item.title)}</a> ${badge(item.status)}</li>`).join("");
    const fb = c.feedback.length ? `<h4>Consultant feedback</h4><ul>${c.feedback.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : "";
    return `<article class="checklist">
      <header class="item-head"><h3>${esc(c.month)}</h3>
        <div class="item-tags"><span class="due">Due ${formatDate(c.due)}</span>${c.submitted ? `<span class="badge badge-met">Submitted ${formatDate(c.submitted)}</span>` : `<span class="badge badge-not-started">Not submitted</span>`}</div>
      </header>
      <p class="scope">${esc(c.notes)}</p>
      ${rows ? `<ul class="check-items">${rows}</ul>` : ""}
      ${fb}
    </article>`;
  }).join("");

  const all = standards.flatMap(s => s.items.map(i => `<tr>
      <td><a href="standard-${s.id}.html#${itemAnchor(i.nums)}">${itemLabel(i.nums)}</a></td>
      <td>${esc(i.title)}</td><td>${s.id}</td><td>${esc(i.due || "")}</td><td>${badge(i.status)}</td>
      <td>${i.evidence.length}</td></tr>`)).join("");

  document.getElementById("content").innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Review Tracker</p>
      <h1>Monthly Checklists & Status</h1>
      <p>Checklists are due by the 1st; consultant feedback arrives by the 15th; corrections are due by the 1st of the next month. All standards complete by <strong>March 31, 2027</strong>.</p>
    </section>
    <section><h2>Score summary</h2>
      <div class="table-scroll"><table class="summary">
        <thead><tr><th scope="col">Standard</th><th scope="col">Min / Possible</th><th scope="col">Points entered</th><th scope="col">Met</th><th scope="col">In progress</th><th scope="col">Submitted</th><th scope="col">Needs correction</th><th scope="col">Not started</th></tr></thead>
        <tbody>${summary}</tbody></table></div>
      <p class="table-note">Points per item come from the scoring rubric (booklet pp. 39-42); enter them in data/standards.json as they are confirmed.</p>
    </section>
    <section><h2>Monthly checklists</h2>${months}</section>
    <section><h2>All items</h2>
      <div class="table-scroll"><table>
        <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col">Std</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col">Evidence</th></tr></thead>
        <tbody>${all}</tbody></table></div>
    </section>`;
  renderFooter(site);
}

async function pageTimeline(site) {
  const { deadlines, fblaChart } = await loadJSON("timeline");
  const today = new Date().toISOString().slice(0, 10);
  const nextIdx = deadlines.findIndex(d => d.date >= today);
  const list = deadlines.map((d, i) => `
    <li class="${d.date < today ? "past" : i === nextIdx ? "next" : ""}">
      <time datetime="${d.date}">${formatDate(d.date)}</time>
      <div><strong>${esc(d.title)}</strong>${d.verify ? ' <span class="verify">To confirm</span>' : ""}${i === nextIdx ? ' <span class="badge badge-in-progress">Next</span>' : ""}
      ${d.detail ? `<p>${esc(d.detail)}</p>` : ""}</div>
    </li>`).join("");

  document.getElementById("content").innerHTML = `
    <section class="page-intro"><p class="eyebrow">2026-2027</p><h1>Timeline & Deadlines</h1></section>
    <ol class="timeline">${list}</ol>
    <section><h2>FBLA Planning Chart</h2>
      <p class="warn">${esc(fblaChart.note)}</p>
      <div class="table-scroll"><table><thead><tr><th scope="col">Month</th><th scope="col">Events</th></tr></thead>
      <tbody>${fblaChart.rows.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  renderFooter(site);
}

// ---------- Boot ----------

const PAGES = { home: pageHome, program: pageProgram, standard: pageStandard, checklists: pageChecklists, timeline: pageTimeline };

(async () => {
  try {
    const site = await loadJSON("site");
    renderHeader(site);
    await PAGES[document.body.dataset.page](site);
  } catch (err) {
    document.getElementById("content").innerHTML = `<p class="warn">This page could not load its data: ${esc(err.message)}</p>`;
    console.error(err);
  }
})();
