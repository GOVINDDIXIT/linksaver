import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

// File-backed link store. Links shape:
// { id, title, url, tags: string[], notes, createdAt, updatedAt }

export async function loadLinks(dataPath) {
  try {
    const raw = await readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function saveLinks(dataPath, links) {
  await mkdir(dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(links, null, 2) + "\n");
}

export async function listLinks(dataPath, { q = "", tag = "" } = {}) {
  const links = await loadLinks(dataPath);
  const needle = q.trim().toLowerCase();
  return links
    .filter((l) => {
      if (tag && !l.tags.includes(tag)) return false;
      if (!needle) return true;
      return [l.title, l.url, l.notes ?? "", l.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLink(dataPath, id) {
  const links = await loadLinks(dataPath);
  return links.find((l) => l.id === id) ?? null;
}

export async function createLink(dataPath, input) {
  const links = await loadLinks(dataPath);
  const now = new Date().toISOString();
  const link = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  links.push(link);
  await saveLinks(dataPath, links);
  return link;
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
  for (const l of links) for (const t of l.tags) counts[t] = (counts[t] ?? 0) + 1;
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
