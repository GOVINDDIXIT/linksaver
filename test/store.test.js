import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLink, listLinks, updateLink, deleteLink, tagCounts, stats } from "../src/store.js";

const tmp = () => join(mkdtempSync(join(tmpdir(), "ls-")), "links.json");

test("create + list + search + tag filter", async () => {
  const db = tmp();
  await createLink(db, { title: "Node docs", url: "https://nodejs.org", tags: ["dev"], notes: "" });
  await createLink(db, { title: "Design inspo", url: "https://example.com", tags: ["design"], notes: "nice layouts" });
  assert.equal((await listLinks(db)).length, 2);
  assert.equal((await listLinks(db, { q: "node" })).length, 1);
  assert.equal((await listLinks(db, { tag: "design" }))[0].title, "Design inspo");
});

test("duplicate URL returns existing link", async () => {
  const db = tmp();
  const first = await createLink(db, { title: "A", url: "https://a.com", tags: [] });
  const second = await createLink(db, { title: "A again", url: "https://a.com/", tags: [] });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.link.id, first.link.id);
  assert.equal((await listLinks(db)).length, 1);
});

test("favorites, archive, sort, pagination", async () => {
  const db = tmp();
  await createLink(db, { title: "B", url: "https://b.com", tags: [] });
  await createLink(db, { title: "A", url: "https://a.com", tags: [], favorite: true });
  await createLink(db, { title: "Old", url: "https://old.com", tags: [], archived: true });
  assert.equal((await listLinks(db)).length, 2); // archived hidden by default
  assert.equal((await listLinks(db, { archived: "only" }))[0].title, "Old");
  assert.equal((await listLinks(db, { favoritesOnly: true }))[0].title, "A");
  assert.deepEqual((await listLinks(db, { sort: "title" })).map((l) => l.title), ["A", "B"]);
  assert.equal((await listLinks(db, { sort: "title", limit: 1, offset: 1 }))[0].title, "B");
});

test("update + delete + tag counts + stats", async () => {
  const db = tmp();
  const { link: l } = await createLink(db, { title: "A", url: "https://a.com/x", tags: ["x"], notes: "" });
  await updateLink(db, l.id, { title: "B", favorite: true });
  assert.equal((await listLinks(db))[0].title, "B");
  assert.deepEqual(await tagCounts(db), [{ tag: "x", count: 1 }]);
  assert.deepEqual((await stats(db)).topDomains, [{ domain: "a.com", count: 1 }]);
  assert.equal((await stats(db)).favorites, 1);
  assert.equal(await deleteLink(db, l.id), true);
  assert.equal((await listLinks(db)).length, 0);
});
