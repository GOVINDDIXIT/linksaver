import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLink, listLinks, updateLink, deleteLink, tagCounts } from "../src/store.js";

const tmp = () => join(mkdtempSync(join(tmpdir(), "ls-")), "links.json");

test("create + list + search + tag filter", async () => {
  const db = tmp();
  await createLink(db, { title: "Node docs", url: "https://nodejs.org", tags: ["dev"], notes: "" });
  await createLink(db, { title: "Design inspo", url: "https://example.com", tags: ["design"], notes: "nice layouts" });
  assert.equal((await listLinks(db)).length, 2);
  assert.equal((await listLinks(db, { q: "node" })).length, 1);
  assert.equal((await listLinks(db, { tag: "design" }))[0].title, "Design inspo");
});

test("update + delete + tag counts", async () => {
  const db = tmp();
  const l = await createLink(db, { title: "A", url: "https://a.com", tags: ["x"], notes: "" });
  await updateLink(db, l.id, { title: "B" });
  assert.equal((await listLinks(db))[0].title, "B");
  assert.deepEqual(await tagCounts(db), [{ tag: "x", count: 1 }]);
  assert.equal(await deleteLink(db, l.id), true);
  assert.equal((await listLinks(db)).length, 0);
});
