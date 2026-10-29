import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/server.js";

async function start() {
  const dataPath = join(mkdtempSync(join(tmpdir(), "ls-api-")), "links.json");
  const server = createApp({ dataPath });
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://localhost:${server.address().port}` };
}

const j = (r) => r.json();

test("POST / GET / DELETE /api/links round-trip", async () => {
  const { server, base } = await start();
  try {
    let r = await fetch(`${base}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Node", url: "https://nodejs.org", tags: ["dev"] }),
    });
    assert.equal(r.status, 201);
    const created = await j(r);

    r = await fetch(`${base}/api/links?q=node`);
    assert.equal((await j(r)).length, 1);

    r = await fetch(`${base}/api/links/${created.id}`, { method: "DELETE" });
    assert.equal(r.status, 200);
    r = await fetch(`${base}/api/links`);
    assert.equal((await j(r)).length, 0);
  } finally {
    server.close();
  }
});

test("POST invalid returns 400", async () => {
  const { server, base } = await start();
  try {
    const r = await fetch(`${base}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", url: "bad" }),
    });
    assert.equal(r.status, 400);
  } finally {
    server.close();
  }
});

test("POST duplicate URL returns 409, PATCH favorite, GET /api/stats", async () => {
  const { server, base } = await start();
  try {
    const payload = { title: "Node", url: "https://nodejs.org", tags: ["dev"] };
    await fetch(`${base}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const dup = await fetch(`${base}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(dup.status, 409);

    const list = await (await fetch(`${base}/api/links`)).json();
    const patched = await (await fetch(`${base}/api/links/${list[0].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: true }),
    })).json();
    assert.equal(patched.favorite, true);

    const favs = await (await fetch(`${base}/api/links?favorites=1`)).json();
    assert.equal(favs.length, 1);

    const s = await (await fetch(`${base}/api/stats`)).json();
    assert.equal(s.total, 1);
    assert.equal(s.favorites, 1);
  } finally {
    server.close();
  }
});
