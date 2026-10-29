const $ = (id) => document.getElementById(id);
const state = { q: "", tag: "", links: [], tags: [] };

async function api(path, opts) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.errors?.join(", ") || body.error || "request failed");
  return body;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function refresh() {
  const qs = new URLSearchParams({ q: state.q, tag: state.tag });
  [state.links, state.tags] = await Promise.all([
    api(`/api/links?${qs}`),
    api("/api/tags"),
  ]);
  render();
}

function render() {
  $("count").textContent = state.links.length
    ? `${state.links.length} saved link${state.links.length > 1 ? "s" : ""}${state.tag ? ` · #${state.tag}` : ""}`
    : "Nothing found — save your first link.";
  $("cards").innerHTML = state.links.map((l) => `
    <article class="link">
      <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>
      <div class="muted">${esc(new URL(l.url).hostname)} · ${esc(l.createdAt.slice(0, 10))}</div>
      ${l.notes ? `<div>${esc(l.notes)}</div>` : ""}
      <div class="tags">${l.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>
      <div class="row"><button class="del" data-del="${l.id}" type="button">Delete</button></div>
    </article>`).join("");
  $("tagList").innerHTML = state.tags.length
    ? `<button class="tag" data-tag="" aria-pressed="${state.tag === ""}">all</button>` +
      state.tags.map((t) => `<button class="tag" data-tag="${esc(t.tag)}" aria-pressed="${state.tag === t.tag}">#${esc(t.tag)} (${t.count})</button>`).join("")
    : `<span class="muted">No tags yet.</span>`;
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
  } catch (err) { $("formError").textContent = err.message; $("formError").hidden = false; }
});

let t; $("q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; refresh(); }, 200); });
document.addEventListener("click", async (e) => {
  const tag = e.target.closest("[data-tag]");
  if (tag) { state.tag = tag.dataset.tag; refresh(); }
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
  await api("/api/import", { method: "POST", body: JSON.stringify(links) });
  e.target.value = "";
  refresh();
});

refresh();
