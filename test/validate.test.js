import test from "node:test";
import assert from "node:assert/strict";
import { validateLink, normalizeTags } from "../src/validate.js";

test("accepts good input, normalizes tags", () => {
  const v = validateLink({ title: "  T ", url: "https://example.com/a", tags: "Dev, dev, AI ", notes: "hi" });
  assert.equal(v.ok, true);
  assert.deepEqual(v.value.tags, ["dev", "ai"]);
});

test("rejects bad title/url", () => {
  assert.equal(validateLink({ title: "", url: "https://example.com" }).ok, false);
  assert.equal(validateLink({ title: "t", url: "ftp://x.com" }).ok, false);
  assert.equal(validateLink({ title: "t", url: "not a url" }).ok, false);
});

test("partial update allows subset", () => {
  const v = validateLink({ title: "New" }, { partial: true });
  assert.equal(v.ok, true);
  assert.equal(v.value.title, "New");
});

test("normalizeTags handles arrays and dedupes", () => {
  assert.deepEqual(normalizeTags(["A ", "a", "b"]), ["a", "b"]);
});
