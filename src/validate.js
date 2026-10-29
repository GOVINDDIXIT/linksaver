// Shared validation/normalization for link input.
export function normalizeTags(tags) {
  if (tags == null) return [];
  const arr = Array.isArray(tags) ? tags : String(tags).split(",");
  return [...new Set(arr.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

export function validateLink(input, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (input.title !== undefined || !partial) {
    const title = String(input.title ?? "").trim();
    if (!title) errors.push("title is required");
    else if (title.length > 200) errors.push("title must be ≤ 200 chars");
    else out.title = title;
  }

  if (input.url !== undefined || !partial) {
    const url = String(input.url ?? "").trim();
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
      out.url = u.toString();
    } catch {
      errors.push("url must be a valid http(s) URL");
    }
  }

  if (input.tags !== undefined) out.tags = normalizeTags(input.tags);
  else if (!partial) out.tags = [];

  if (input.notes !== undefined) {
    const notes = String(input.notes ?? "").slice(0, 2000);
    out.notes = notes;
  } else if (!partial) out.notes = "";

  return { ok: errors.length === 0, errors, value: out };
}
