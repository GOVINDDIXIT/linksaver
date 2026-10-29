import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink,
  tagCounts,
  loadLinks,
  stats,
} from "./store.js";
import { validateLink } from "./validate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
export const defaultDataPath = join(root, "data", "links.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function servePublic(req, res) {
  const file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const path = normalize(join(pub, file));
  if (!path.startsWith(pub)) return send(res, 403, { error: "forbidden" });
  try {
    const body = await readFile(path);
    const ext = path.slice(path.lastIndexOf("."));
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    send(res, 404, { error: "not found" });
  }
}

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
      if (buf.length > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!buf) return resolve({});
      try {
        resolve(JSON.parse(buf));
      } catch {
        reject(new Error("invalid JSON"));
      }
    });
  });
}

const flag = (v) => v === "1" || v === "true";

export function createApp({ dataPath = defaultDataPath } = {}) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      const { pathname } = url;
      const qp = url.searchParams;

      if (!pathname.startsWith("/api/")) return servePublic(req, res);

      if (req.method === "GET" && pathname === "/api/links") {
        const archived = qp.get("archived") ?? "hide";
        return send(res, 200, await listLinks(dataPath, {
          q: qp.get("q") ?? "",
          tag: qp.get("tag") ?? "",
          sort: qp.get("sort") ?? "newest",
          limit: qp.get("limit") ?? 100,
          offset: qp.get("offset") ?? 0,
          favoritesOnly: flag(qp.get("favorites")),
          archived: ["hide", "only", "all"].includes(archived) ? archived : "hide",
        }));
      }
      if (req.method === "GET" && pathname === "/api/tags") {
        return send(res, 200, await tagCounts(dataPath));
      }
      if (req.method === "GET" && pathname === "/api/stats") {
        return send(res, 200, await stats(dataPath));
      }
      if (req.method === "GET" && pathname === "/api/export") {
        return send(res, 200, await loadLinks(dataPath));
      }
      if (req.method === "POST" && pathname === "/api/import") {
        const body = await readBody(req);
        const arr = Array.isArray(body) ? body : body.links;
        if (!Array.isArray(arr)) return send(res, 400, { error: "expected an array" });
        let added = 0, duplicates = 0;
        const errors = [];
        for (let i = 0; i < arr.slice(0, 500).length; i++) {
          const v = validateLink(arr[i]);
          if (!v.ok) {
            errors.push({ index: i, errors: v.errors });
            continue;
          }
          const r = await createLink(dataPath, v.value);
          if (r.duplicate) duplicates++;
          else added++;
        }
        return send(res, 200, { added, duplicates, skipped: errors.length, errors: errors.slice(0, 10) });
      }
      if (req.method === "POST" && pathname === "/api/links") {
        const v = validateLink(await readBody(req));
        if (!v.ok) return send(res, 400, { errors: v.errors });
        const r = await createLink(dataPath, v.value);
        if (r.duplicate) return send(res, 409, { error: "link already saved", link: r.link });
        return send(res, 201, r.link);
      }

      const m = pathname.match(/^\/api\/links\/([^/]+)$/);
      if (m) {
        const id = decodeURIComponent(m[1]);
        if (req.method === "GET") {
          const link = await getLink(dataPath, id);
          return link ? send(res, 200, link) : send(res, 404, { error: "not found" });
        }
        if (req.method === "PATCH" || req.method === "PUT") {
          const v = validateLink(await readBody(req), { partial: true });
          if (!v.ok) return send(res, 400, { errors: v.errors });
          const link = await updateLink(dataPath, id, v.value);
          return link ? send(res, 200, link) : send(res, 404, { error: "not found" });
        }
        if (req.method === "DELETE") {
          const ok = await deleteLink(dataPath, id);
          return ok ? send(res, 200, { ok: true }) : send(res, 404, { error: "not found" });
        }
      }

      // shortcut: no auth — single-user local app, add auth when multi-user/hosted.
      return send(res, 404, { error: "not found" });
    } catch (err) {
      return send(res, err.message === "invalid JSON" ? 400 : 500, { error: err.message });
    }
  });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`LinkSaver → http://localhost:${port}`));
}
