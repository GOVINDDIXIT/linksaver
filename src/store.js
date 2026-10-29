import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

// File-backed link store. Links shape:
// { id, title, url, tags: string[], notes, favorite, archived, createdAt, updatedAt }

function normalize(link) {
  return { notes: "", tags: [], favorite: false, archived: false, ...link };
}

function sameUrl(a, b) {
  return String(a).trim().replace(/\/$/, "") === String(b).trim().replace(/\/$/, "");
}

export async function loadLinks(dataPath) {
  try {
    const raw = await readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function saveLinks(dataPath, links) {
  await mkdir(dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(links, null, 2) + "\n");
}

export async function findByUrl(dataPath, url) {
  const links = await loadLinks(dataPath);
  return links.find((l) => sameUrl(l.url, url)) ?? null;
}

const SORTS = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  title: (a, b) => a.title.localeCompare(b.title),
};

export async function listLinks(
  dataPath,
  { q = "", tag = "", sort = "newest", limit = 100, offset = 0, favoritesOnly = false, archived = "hide" } = {},
) {
  let links = await loadLinks(dataPath);
  const needle = q.trim().toLowerCase();
  links = links.filter((l) => {
    if (archived === "hide" && l.archived) return false;
    if (archived === "only" && !l.archived) return false;
    if (favoritesOnly && !l.favorite) return false;
    if (tag && !l.tags.includes(tag)) return false;
    if (!needle) return true;
    return [l.title, l.url, l.notes ?? "", l.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  links.sort(SORTS[sort] ?? SORTS.newest);
  const start = Math.max(0, Number(offset) || 0);
  const n = Math.min(500, Math.max(1, Number(limit) || 100));
  return links.slice(start, start + n);
}

export async function getLink(dataPath, id) {
  const links = await loadLinks(dataPath);
  return links.find((l) => l.id === id) ?? null;
}

export async function createLink(dataPath, input) {
  const existing = await findByUrl(dataPath, input.url);
  if (existing) return { duplicate: true, link: existing };
  const links = await loadLinks(dataPath);
  const now = new Date().toISOString();
  const link = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  links.push(link);
  await saveLinks(dataPath, links);
  return { duplicate: false, link };
}

export async function updateLink(dataPath, id, patch) {
  const links = await loadLinks(dataPath);
  const idx = links.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  links[idx] = { ...links[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await saveLinks(dataPath, links);
  return links[idx];
}

export async function deleteLink(dataPath, id) {
  const links = await loadLinks(dataPath);
  const next = links.filter((l) => l.id !== id);
  if (next.length === links.length) return false;
  await saveLinks(dataPath, next);
  return true;
}

export async function tagCounts(dataPath) {
  const links = await loadLinks(dataPath);
  const counts = {};
  for (const l of links.filter((l) => !l.archived)) {
    for (const t of l.tags) counts[t] = (counts[t] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function stats(dataPath) {
  const links = await loadLinks(dataPath);
  const domains = {};
  for (const l of links) {
    try {
      const h = new URL(l.url).hostname;
      domains[h] = (domains[h] ?? 0) + 1;
    } catch {
      // ignore unparseable urls
    }
  }
  return {
    total: links.length,
    favorites: links.filter((l) => l.favorite).length,
    archived: links.filter((l) => l.archived).length,
    topDomains: Object.entries(domains)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}
