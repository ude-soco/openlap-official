import assert from "node:assert/strict";
import test from "node:test";
import { contentHref, formatNewsDate } from "./content-links.js";

test("content links allow web URLs and reject executable or relative URLs", () => {
  assert.equal(
    contentHref("https://example.org/paper?q=1"),
    "https://example.org/paper?q=1",
  );
  assert.equal(contentHref("http://example.org"), "http://example.org/");
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "/api/private",
    "",
    null,
  ]) {
    assert.equal(contentHref(value), undefined);
  }
});

test("news dates remain in their intended month and handle incomplete previews", () => {
  assert.equal(formatNewsDate("2026-03-01"), "March 2026");
  assert.equal(formatNewsDate("2024-02-29"), "February 2024");
  for (const value of ["2026-02-30", "2026-13-01", "", undefined]) {
    assert.equal(formatNewsDate(value), "Date not set");
  }
});
