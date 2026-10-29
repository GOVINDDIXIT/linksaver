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
