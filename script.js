/* =========================================================
   Findit – Lost & Found Portal (front-end demo)
   Data is stored in localStorage so forms really work.
   Replace the load()/save() helpers with fetch() calls to a
   PHP / Python backend + MySQL for a production version.
   ========================================================= */

/* ---------- CONSTANTS ---------- */
const CATEGORIES = [
  { name: "Electronics", e: "🎧" },
  { name: "Documents & ID Cards", e: "🪪" },
  { name: "Bags & Backpacks", e: "🎒" },
  { name: "Books & Notebooks", e: "📚" },
  { name: "Water Bottles", e: "💧" },
  { name: "Watches & Accessories", e: "⌚" },
  { name: "Keys", e: "🔑" },
  { name: "Other Items", e: "📦" }
];
const LOCATIONS = ["Library", "Hostel", "C Block", "Cafeteria", "Academic Block", "Block 34",
  "Auditorium", "Sports Ground", "Parking Area", "Admin Block", "Other"];
const STEPS = [
  { e: "📝", t: "Report", d: "Student reports a lost or found item." },
  { e: "🔎", t: "Search", d: "Other students browse the reported items." },
  { e: "🙋", t: "Claim", d: "The owner submits a claim request." },
  { e: "🎉", t: "Recover", d: "Ownership is verified and the item is returned." }
];
const ADMIN_EMAIL = "admin@findit.edu";
const K = { items: "findit_items", claims: "findit_claims", user: "findit_user",
            users: "findit_users", notifs: "findit_notifs", theme: "findit_theme", feedback: "findit_feedback" };

/* ---------- STORAGE HELPERS ---------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const catEmoji = n => (CATEGORIES.find(c => c.name === n) || { e: "📦" }).e;

/* ---------- SEED DATA ---------- */
function seed() {
  if (load(K.items)) return;
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const mk = (i, name, category, location, type, ago, status = type) => ({
    id: "FI-" + String(i).padStart(4, "0"), name, category, location, type, status,
    date: d(ago), reported: new Date(Date.now() - ago * 864e5).toISOString(),
    description: `${name} reported near ${location}.`, email: "student" + i + "@college.edu",
    image: "", kept: type === "Found" ? "College security office" : "", urgency: "Medium", identifying: ""
  });
  save(K.items, [
    mk(1, "Wireless Earbuds", "Electronics", "Library", "Lost", 1),
    mk(2, "Black Wallet", "Other Items", "C Block", "Found", 2),
    mk(3, "Student ID Card", "Documents & ID Cards", "Cafeteria", "Found", 3),
    mk(4, "Blue Backpack", "Bags & Backpacks", "Hostel", "Lost", 4),
    mk(5, "Water Bottle", "Water Bottles", "Academic Block", "Lost", 5),
    mk(6, "Calculator", "Electronics", "Block 34", "Found", 6),
    mk(7, "Hostel Room Key", "Keys", "Hostel", "Found", 8, "Returned"),
    mk(8, "Silver Wrist Watch", "Watches & Accessories", "Sports Ground", "Lost", 9, "Returned")
  ]);
  save(K.claims, []);
}

/* ---------- STATE ---------- */
let items = [], claims = [], user = null, activeTab = "lost";
const refresh = () => { items = load(K.items, []); claims = load(K.claims, []); user = load(K.user, null); };

/* ---------- UI HELPERS ---------- */
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3200);
}
function animateCount(el, to) {
  let n = 0; const step = Math.max(1, Math.ceil(to / 40));
  const iv = setInterval(() => { n = Math.min(to, n + step); el.textContent = n; if (n >= to) clearInterval(iv); }, 25);
}
function addNotif(email, msg) {
  const n = load(K.notifs, []); n.unshift({ email, msg, time: new Date().toLocaleString() }); save(K.notifs, n);
}
const nextId = () => "FI-" + String(items.reduce((m, i) => Math.max(m, parseInt(i.id.slice(3))), 0) + 1).padStart(4, "0");
const fmtDate = s => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/* ---------- ROUTER ---------- */
function navigate(page) {
  if (!$("#page-" + page)) page = "home";
  if (page === "admin" && !(user && user.email === ADMIN_EMAIL)) { toast("Admin access only."); page = "home"; }
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
  $$("[data-nav]").forEach(a => a.classList.toggle("active", a.dataset.nav === page && a.closest("nav")));
  $("#navLinks").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  refresh();
  ({ home: renderHome, browse: renderBrowse, myreports: renderMyReports, admin: renderAdmin })[page]?.();
}
window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "home"));
document.addEventListener("click", e => {
  const a = e.target.closest("[data-nav]");
  if (a) { e.preventDefault(); const p = a.dataset.nav; if (location.hash.slice(1) === p) navigate(p); else location.hash = p; }
});

/* ---------- ITEM CARD ---------- */
function itemCard(it) {
  const bg = it.image ? `style="background-image:url('${it.image}')"` : "";
  return `<div class="item-card">
    <div class="item-img" ${bg}>${it.image ? "" : catEmoji(it.category)}</div>
    <div class="item-body">
      <span class="badge ${it.status}">${it.status}</span>
      <h3>${esc(it.name)}</h3>
      <div class="meta">📍 ${esc(it.location)}</div>
      <div class="meta">🗓️ ${fmtDate(it.reported)} • ${esc(it.id)}</div>
      <button class="btn btn-sm" data-details="${it.id}">View Item Details</button>
    </div></div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-details]"); if (b) openDetails(b.dataset.details);
  const c = e.target.closest("[data-cat]"); if (c) { location.hash = "browse"; setTimeout(() => { $("#fCategory").value = c.dataset.cat; renderBrowse(); }, 30); }
});

/* ---------- HOME ---------- */
function stats() {
  return {
    lost: items.filter(i => i.type === "Lost").length,
    found: items.filter(i => i.type === "Found").length,
    returned: items.filter(i => i.status === "Returned").length,
    active: items.filter(i => i.status === "Lost" || i.status === "Found").length
  };
}
function statCards(s, cls = "") {
  return `
   <div class="stat-card red ${cls}"><div class="icon">😟</div><div class="num" data-count="${s.lost}">0</div>Total Lost Items</div>
   <div class="stat-card green ${cls}"><div class="icon">😊</div><div class="num" data-count="${s.found}">0</div>Total Found Items</div>
   <div class="stat-card blue ${cls}"><div class="icon">✅</div><div class="num" data-count="${s.returned}">0</div>Items Returned</div>
   <div class="stat-card orange ${cls}"><div class="icon">📂</div><div class="num" data-count="${s.active}">0</div>Active Reports</div>`;
}
function renderHome() {
  const s = stats();
  $("#homeStats").innerHTML = statCards(s);
  $$("#homeStats [data-count]").forEach(el => animateCount(el, +el.dataset.count));
  animateCount($("#returnCounter"), s.returned);
  const recent = [...items].sort((a, b) => b.reported.localeCompare(a.reported)).slice(0, 4);
  $("#recentItems").innerHTML = recent.map(itemCard).join("") || `<div class="empty">No reports yet.</div>`;
  $("#categoryGrid").innerHTML = CATEGORIES.map(c => `<div class="cat" data-cat="${esc(c.name)}"><span class="e">${c.e}</span>${esc(c.name)}</div>`).join("");
  const stepsHTML = STEPS.map((s, i) => `<div class="step"><span class="n">${i + 1}</span><div class="e">${s.e}</div><h3>${s.t}</h3><p class="muted">${s.d}</p></div>`).join("");
  $("#homeSteps").innerHTML = stepsHTML; $("#howSteps").innerHTML = stepsHTML;
}
$("#heroSearch").addEventListener("submit", e => {
  e.preventDefault(); const q = $("#heroSearchInput").value.trim();
  location.hash = "browse"; setTimeout(() => { $("#fSearch").value = q; renderBrowse(); }, 30);
});

/* ---------- BROWSE (search / filter / sort) ---------- */
function renderBrowse() {
  const q = $("#fSearch").value.toLowerCase().trim(), cat = $("#fCategory").value, type = $("#fType").value, sort = $("#fSort").value;
  let list = items.filter(i =>
    (!q || [i.name, i.location, i.category, i.description].some(v => String(v).toLowerCase().includes(q))) &&
    (!cat || i.category === cat) && (!type || i.type === type));
  list.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "old" ? a.reported.localeCompare(b.reported) : b.reported.localeCompare(a.reported));
  $("#resultCount").textContent = `${list.length} item(s) found`;
  $("#browseItems").innerHTML = list.map(itemCard).join("") || `<div class="empty">😕 No items match your search.</div>`;
}
["fSearch", "fCategory", "fType", "fSort"].forEach(id => $("#" + id).addEventListener("input", renderBrowse));

/* ---------- ITEM DETAILS + MATCHING ---------- */
function findMatches(it) {
  const words = it.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return items.filter(o => o.id !== it.id && o.type !== it.type && !["Returned", "Claimed"].includes(o.status) &&
    (o.category === it.category && (o.location === it.location || words.some(w => o.name.toLowerCase().includes(w))) ||
      words.some(w => o.name.toLowerCase().includes(w))));
}
function openDetails(id) {
  const it = items.find(i => i.id === id); if (!it) return;
  const bg = it.image ? `style="background-image:url('${it.image}')"` : "";
  const m = findMatches(it);
  $("#detailBody").innerHTML = `
    <div class="item-img detail-img" ${bg}>${it.image ? "" : catEmoji(it.category)}</div>
    <span class="badge ${it.status}">${it.status}</span>
    <h2>${esc(it.name)}</h2>
    <div class="detail-grid">
      <b>Item ID</b><span>${esc(it.id)}</span>
      <b>Category</b><span>${esc(it.category)}</span>
      <b>Location</b><span>📍 ${esc(it.location)}</span>
      <b>${it.type} on</b><span>${fmtDate(it.date)}${it.time ? " around " + esc(it.time) : ""}</span>
      <b>Reported</b><span>${fmtDate(it.reported)}</span>
      ${it.kept ? `<b>Kept at</b><span>${esc(it.kept)}</span>` : ""}
      ${it.type === "Lost" ? `<b>Urgency</b><span>${esc(it.urgency)}</span>` : ""}
      <b>Description</b><span>${esc(it.description)}</span>
    </div>
    ${["Lost", "Found"].includes(it.status) ? `<button class="btn" data-claim="${it.id}">${it.type === "Found" ? "🙋 Claim This Item" : "😊 I Found This Item"}</button>` : ""}
    ${m.length ? `<div class="matches"><b>🔗 Possible ${it.type === "Lost" ? "Found" : "Lost"} matches</b>${m.map(x => `<a data-details="${x.id}">${esc(x.name)} – ${esc(x.location)} (${x.id})</a>`).join("")}</div>` : ""}`;
  openModal("#detailModal");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-claim]"); if (!b) return;
  const it = items.find(i => i.id === b.dataset.claim);
  closeModals();
  if (it.type === "Lost") { location.hash = "found"; toast("Please file a Found report and mention " + it.id); return; }
  $("#claimItemId").value = it.id; $("#claimItemName").value = it.name;
  location.hash = "claim";
});
$("#claimItemId").addEventListener("input", e => {
  const it = items.find(i => i.id.toLowerCase() === e.target.value.trim().toLowerCase());
  $("#claimItemName").value = it ? it.name : "";
});

/* ---------- MODALS ---------- */
function openModal(sel) { $(sel).classList.add("open"); }
function closeModals() { $$(".modal").forEach(m => m.classList.remove("open")); }
$$("[data-close]").forEach(b => b.addEventListener("click", closeModals));
$$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModals(); }));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModals(); });

/* ---------- REPORT FORMS ---------- */
function readImage(file) {
  return new Promise(res => {
    if (!file || !file.size) return res("");
    if (file.size > 1.5 * 1024 * 1024) { toast("Image too large (max 1.5 MB) – skipped."); return res(""); }
    const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file);
  });
}
async function submitReport(e, type) {
  e.preventDefault();
  const f = new FormData(e.target);
  const dup = items.find(i => i.type === type && i.name.toLowerCase() === f.get("name").trim().toLowerCase() &&
    i.location === f.get("location") && i.status === type);
  if (dup && !confirm(`A similar report already exists (${dup.id}). Submit anyway?`)) return;
  const item = {
    id: nextId(), type, status: type,
    name: f.get("name").trim(), category: f.get("category"), location: f.get("location"),
    date: f.get("date"), time: f.get("time") || "", description: (f.get("description") || "").trim(),
    identifying: (f.get("identifying") || "").trim(), urgency: f.get("urgency") || "",
    kept: f.get("kept") || "", email: f.get("email").trim().toLowerCase(), phone: f.get("phone") || "",
    image: await readImage(f.get("image")), reported: new Date().toISOString()
  };
  try {
    items.push(item); save(K.items, items);
  } catch { items.pop(); return toast("Storage full – try a smaller image."); }
  addNotif(item.email, `Your ${type.toLowerCase()} report for "${item.name}" was submitted (ID ${item.id}).`);
  e.target.reset(); setDefaults();
  const matches = findMatches(item);
  toast(`✅ Report submitted! Item ID: ${item.id}` + (matches.length ? ` — ${matches.length} possible match(es) found!` : ""));
  if (matches.length) openDetails(item.id); else location.hash = "browse";
}
$("#lostForm").addEventListener("submit", e => submitReport(e, "Lost"));
$("#foundForm").addEventListener("submit", e => submitReport(e, "Found"));

/* ---------- CLAIM FORM ---------- */
$("#claimForm").addEventListener("submit", e => {
  e.preventDefault(); refresh();
  const f = Object.fromEntries(new FormData(e.target));
  const it = items.find(i => i.id.toLowerCase() === f.itemId.trim().toLowerCase());
  if (!it) return toast("❌ Item ID not found.");
  if (it.status !== "Found" && it.status !== "Lost") return toast("This item is no longer available for claims.");
  if (f.ownership.trim().length < 15 || f.identifying.trim().length < 10) return toast("Please give more detail to verify ownership.");
  claims.push({ cid: "CL-" + String(claims.length + 1).padStart(4, "0"), itemId: it.id, itemName: it.name,
    claimant: f.claimant, regno: f.regno, email: f.email.toLowerCase(), ownership: f.ownership,
    identifying: f.identifying, status: "Pending", date: new Date().toISOString() });
  save(K.claims, claims);
  addNotif(f.email.toLowerCase(), `Claim submitted for "${it.name}". We will verify and update you.`);
  addNotif(it.email, `Someone submitted a claim for your reported item "${it.name}" (${it.id}).`);
  e.target.reset(); $("#claimItemName").value = "";
  toast("✅ Claim submitted! Admin will verify your details.");
  location.hash = "myreports";
});

/* ---------- MY REPORTS ---------- */
function renderMyReports() {
  const out = !user;
  $("#myReportsLoggedOut").classList.toggle("hidden", !out);
  $("#myReportsContent").classList.toggle("hidden", out);
  if (out) return;
  const mine = t => items.filter(i => i.type === t && i.email === user.email);
  let html = "";
  if (activeTab === "lost" || activeTab === "found") {
    const l = mine(activeTab === "lost" ? "Lost" : "Found");
    html = `<div class="cards">${l.map(itemCard).join("") || `<div class="empty">You have no ${activeTab} reports yet.</div>`}</div>`;
  } else if (activeTab === "claims") {
    const c = claims.filter(x => x.email === user.email);
    html = c.length ? `<div class="table-wrap"><table><tr><th>Claim</th><th>Item</th><th>Date</th><th>Status</th></tr>
      ${c.map(x => `<tr><td>${x.cid}</td><td>${esc(x.itemName)} (${x.itemId})</td><td>${fmtDate(x.date)}</td><td><span class="badge ${x.status}">${x.status}</span></td></tr>`).join("")}</table></div>`
      : `<div class="empty">No claim requests yet.</div>`;
  } else {
    const n = load(K.notifs, []).filter(x => x.email === user.email);
    html = n.map(x => `<div class="notif">🔔 ${esc(x.msg)}<br><small class="muted">${esc(x.time)}</small></div>`).join("") || `<div class="empty">No notifications.</div>`;
  }
  $("#myReportsBody").innerHTML = html;
}
$$("#page-myreports .tab").forEach(t => t.addEventListener("click", () => {
  $$("#page-myreports .tab").forEach(x => x.classList.remove("active")); t.classList.add("active");
  activeTab = t.dataset.tab; renderMyReports();
}));
$("#openLoginLink").addEventListener("click", e => { e.preventDefault(); openModal("#authModal"); });

/* ---------- ADMIN ---------- */
function renderAdmin() {
  $("#adminStats").className = "stats-grid flat"; $("#adminStats").innerHTML = statCards(stats());
  $$("#adminStats [data-count]").forEach(el => animateCount(el, +el.dataset.count));
  const pend = claims.filter(c => c.status === "Pending");
  $("#claimsTable").innerHTML = `<tr><th>Claim</th><th>Item</th><th>Claimant</th><th>Reg. No</th><th>Ownership</th><th>Identifying</th><th>Action</th></tr>` +
    (pend.map(c => `<tr><td>${c.cid}</td><td>${esc(c.itemName)} (${c.itemId})</td><td>${esc(c.claimant)}<br><small>${esc(c.email)}</small></td><td>${esc(c.regno)}</td>
      <td style="white-space:normal;min-width:200px">${esc(c.ownership)}</td><td style="white-space:normal;min-width:200px">${esc(c.identifying)}</td>
      <td><button class="row-btn ok" data-approve="${c.cid}">Approve</button><button class="row-btn no" data-reject="${c.cid}">Reject</button></td></tr>`).join("")
      || `<tr><td colspan="7" class="muted">No pending claims 🎉</td></tr>`);
  $("#itemsTable").innerHTML = `<tr><th>ID</th><th>Item</th><th>Type</th><th>Location</th><th>Date</th><th>Status</th><th>Change status</th></tr>` +
    items.map(i => `<tr><td>${i.id}</td><td>${esc(i.name)}</td><td>${i.type}</td><td>${esc(i.location)}</td><td>${fmtDate(i.reported)}</td>
      <td><span class="badge ${i.status}">${i.status}</span></td>
      <td><select data-status="${i.id}">${["Lost", "Found", "Claimed", "Returned"].map(s => `<option ${s === i.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("");
}
document.addEventListener("click", e => {
  const a = e.target.closest("[data-approve],[data-reject]"); if (!a) return;
  const cid = a.dataset.approve || a.dataset.reject, ok = !!a.dataset.approve;
  const c = claims.find(x => x.cid === cid); c.status = ok ? "Approved" : "Rejected"; save(K.claims, claims);
  if (ok) { const it = items.find(i => i.id === c.itemId); it.status = "Returned"; save(K.items, items);
    addNotif(c.email, `✅ Your claim for "${c.itemName}" is approved. Collect it from the Lost & Found desk with your ID card.`); }
  else addNotif(c.email, `❌ Your claim for "${c.itemName}" could not be verified. Contact support for help.`);
  renderAdmin(); toast("Claim " + c.status.toLowerCase() + ".");
});
document.addEventListener("change", e => {
  const s = e.target.closest("[data-status]"); if (!s) return;
  items.find(i => i.id === s.dataset.status).status = s.value; save(K.items, items); renderAdmin();
});

/* ---------- AUTH ---------- */
let authMode = "login";
function updateAuthUI() {
  $("#authBtn").textContent = user ? `Logout (${user.name.split(" ")[0]})` : "Login / Sign Up";
  $("#adminLink").classList.toggle("hidden", !(user && user.email === ADMIN_EMAIL));
  const em = $("[name=email]", $("#lostForm")); if (user && em && !em.value) em.value = user.email;
}
$("#authBtn").addEventListener("click", () => {
  if (user) { localStorage.removeItem(K.user); user = null; updateAuthUI(); toast("Logged out."); navigate(location.hash.slice(1) || "home"); }
  else openModal("#authModal");
});
$$("[data-auth]").forEach(t => t.addEventListener("click", () => {
  authMode = t.dataset.auth;
  $$("[data-auth]").forEach(x => x.classList.toggle("active", x === t));
  $("#nameRow").classList.toggle("hidden", authMode === "login");
  $("#authSubmit").textContent = authMode === "login" ? "Login" : "Create Account";
}));
$("#authForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)); const email = f.email.trim().toLowerCase();
  const users = load(K.users, [{ name: "Admin", email: ADMIN_EMAIL, password: "admin123" }]);
  if (authMode === "signup") {
    if (users.some(u => u.email === email)) return toast("Account already exists – please log in.");
    if (!f.name.trim()) return toast("Please enter your name.");
    users.push({ name: f.name.trim(), email, password: f.password }); save(K.users, users);
    save(K.user, { name: f.name.trim(), email });
  } else {
    const u = users.find(x => x.email === email && x.password === f.password);
    if (!u) return toast("❌ Wrong email or password.");
    save(K.user, { name: u.name, email: u.email });
  }
  user = load(K.user); closeModals(); e.target.reset(); updateAuthUI();
  toast("Welcome, " + user.name + "! 👋"); navigate(location.hash.slice(1) || "home");
});

/* ---------- CONTACT & FEEDBACK ---------- */
$("#contactForm").addEventListener("submit", e => { e.preventDefault(); e.target.reset(); toast("📨 Message sent. We'll reply soon!"); });
$("#feedbackForm").addEventListener("submit", e => {
  e.preventDefault(); const fb = load(K.feedback, []); fb.push({ msg: new FormData(e.target).get("msg"), at: Date.now() });
  save(K.feedback, fb); e.target.reset(); toast("🙏 Thanks for your feedback!");
});

/* ---------- THEME + MOBILE MENU ---------- */
function applyTheme(t) { document.body.classList.toggle("dark", t === "dark"); $("#themeBtn").textContent = t === "dark" ? "☀️" : "🌙"; }
$("#themeBtn").addEventListener("click", () => { const t = document.body.classList.contains("dark") ? "light" : "dark"; localStorage.setItem(K.theme, t); applyTheme(t); });
$("#menuToggle").addEventListener("click", () => $("#navLinks").classList.toggle("open"));

/* ---------- FORM DEFAULTS ---------- */
function setDefaults() {
  $$(".catSelect").forEach(s => s.innerHTML = `<option value="">Select category…</option>` + CATEGORIES.map(c => `<option>${esc(c.name)}</option>`).join(""));
  $$(".locSelect").forEach(s => s.innerHTML = `<option value="">Select location…</option>` + LOCATIONS.map(l => `<option>${l}</option>`).join(""));
  $$(".dateInput").forEach(d => { d.max = today(); d.value = today(); });
  if (user) { $$("#lostForm [name=email], #foundForm [name=email], #claimForm [name=email]").forEach(i => i.value = user.email); }
}

/* ---------- INIT ---------- */
seed(); refresh();
$("#fCategory").innerHTML = `<option value="">All categories</option>` + CATEGORIES.map(c => `<option>${esc(c.name)}</option>`).join("");
setDefaults(); applyTheme(localStorage.getItem(K.theme) || "light"); updateAuthUI();
navigate(location.hash.slice(1) || "home");