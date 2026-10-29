const $ = (id) => document.getElementById(id);
const state = { q: "", tag: "", view: "all", sort: "newest", links: [], tags: [], stats: null };

async function api(path, opts) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(body.errors?.join(", ") || body.error || "request failed");
    err.status = r.status;
    err.link = body.link;
    throw err;
  }
  return body;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function host(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function refresh() {
  const qs = new URLSearchParams({ q: state.q, tag: state.tag, sort: state.sort, limit: 200 });
  if (state.view === "favorites") qs.set("favorites", "1");
  if (state.view === "archived") qs.set("archived", "only");
  [state.links, state.tags, state.stats] = await Promise.all([
    api(`/api/links?${qs}`),
    api("/api/tags"),
    api("/api/stats"),
  ]);
  render();
}

function render() {
  const s = state.stats;
  $("stats").textContent = s
    ? `${s.total} saved · ${s.favorites} ★ · ${s.archived} archived`
    : "";
  $("count").textContent = state.links.length
    ? `${state.links.length} shown${state.tag ? ` · #${state.tag}` : ""}`
    : "Nothing here — save a link or clear the search.";
  $("cards").innerHTML = state.links.map((l) => `
    <article class="link">
      <div class="linkTop"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>
      <button class="fav" data-fav="${l.id}" aria-pressed="${l.favorite}" title="Toggle favorite">${l.favorite ? "★" : "☆"}</button></div>
      <div class="muted">${esc(host(l.url))} · ${esc((l.createdAt ?? "").slice(0, 10))}${l.archived ? " · archived" : ""}</div>
      ${l.notes ? `<div>${esc(l.notes)}</div>` : ""}
      <div class="tags">${l.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>
      <div class="row">
        <button class="ghost" data-archive="${l.id}" type="button">${l.archived ? "Unarchive" : "Archive"}</button>
        <button class="del" data-del="${l.id}" type="button">Delete</button>
      </div>
    </article>`).join("");
  $("tagList").innerHTML = state.tags.length
    ? `<button class="tag" data-tag="" aria-pressed="${state.tag === ""}">all</button>` +
      state.tags.map((t) => `<button class="tag" data-tag="${esc(t.tag)}" aria-pressed="${state.tag === t.tag}">#${esc(t.tag)} (${t.count})</button>`).join("")
    : `<span class="muted">No tags yet.</span>`;
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === state.view));
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("formError").hidden = true;
  try {
    await api("/api/links", { method: "POST", body: JSON.stringify({
      title: $("title").value, url: $("url").value, tags: $("tags").value, notes: $("notes").value,
    }) });
    e.target.reset();
    await refresh();
  } catch (err) {
    $("formError").textContent = err.status === 409 ? `Already saved: “${err.link?.title}”.` : err.message;
    $("formError").hidden = false;
  }
});

async function patch(id, body) {
  await api(`/api/links/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await refresh();
}

let t; $("q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; refresh(); }, 200); });
$("sort").addEventListener("change", (e) => { state.sort = e.target.value; refresh(); });
document.addEventListener("click", async (e) => {
  const view = e.target.closest("[data-view]");
  if (view) { state.view = view.dataset.view; refresh(); return; }
  const tag = e.target.closest("[data-tag]");
  if (tag) { state.tag = tag.dataset.tag; refresh(); return; }
  const fav = e.target.closest("[data-fav]");
  if (fav) { const l = state.links.find((x) => x.id === fav.dataset.fav); await patch(fav.dataset.fav, { favorite: !l.favorite }); return; }
  const arc = e.target.closest("[data-archive]");
  if (arc) { const l = state.links.find((x) => x.id === arc.dataset.archive); await patch(arc.dataset.archive, { archived: !l.archived }); return; }
  const del = e.target.closest("[data-del]");
  if (del && confirm("Delete this link?")) { await api(`/api/links/${del.dataset.del}`, { method: "DELETE" }); refresh(); }
});

$("exportBtn").addEventListener("click", async () => {
  const links = await api("/api/export");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(links, null, 2)], { type: "application/json" }));
  a.download = "linksaver-export.json";
  a.click();
});

$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const links = JSON.parse(await file.text());
  const r = await api("/api/import", { method: "POST", body: JSON.stringify(links) });
  e.target.value = "";
  await refresh();
  if (r.duplicates) alert(`Imported ${r.added}, skipped ${r.duplicates} duplicate(s).`);
});

refresh();
