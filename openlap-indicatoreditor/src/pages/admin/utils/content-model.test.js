import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contentFieldErrors,
  contentPayload,
  emptyContent,
  validHttpUrl,
  validateContent,
} from "./content-model.js";
import { transitionContent, updateContent } from "./content-api.js";

test("rich news supports formatting and links while requiring visible content", () => {
  const body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "A linked update",
            marks: [
              { type: "bold" },
              { type: "link", attrs: { href: "https://example.org" } },
            ],
          },
        ],
      },
    ],
  };
  const news = { ...emptyContent("news"), title: "News", body };
  assert.deepEqual(validateContent("news", news, true), {});
  assert.deepEqual(contentPayload("news", news).body, body);
  assert.ok(
    validateContent(
      "news",
      { ...news, body: { type: "doc", content: [{ type: "paragraph" }] } },
      true,
    ).body,
  );
  const badLink = JSON.parse(JSON.stringify(body));
  badLink.content[0].content[0].marks[1].attrs.href = "javascript:alert(1)";
  assert.ok(validateContent("news", { ...news, body: badLink }).body);
});

test("oversized or deeply nested rich text is rejected without dropping the form content", () => {
  const news = { ...emptyContent("news"), title: "News" };
  const body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "x".repeat(30001) }],
      },
    ],
  };
  assert.ok(validateContent("news", { ...news, body }).body);
  let block = {
    type: "paragraph",
    content: [{ type: "text", text: "Keep this" }],
  };
  for (let i = 0; i < 6; i++)
    block = {
      type: "bulletList",
      content: [{ type: "listItem", content: [{ type: "paragraph" }, block] }],
    };
  const nested = { type: "doc", content: [block] };
  assert.ok(validateContent("news", { ...news, body: nested }).body);
  assert.equal(nested.content[0].type, "bulletList");
});

test("unsafe, malformed, overlong and credential-bearing URLs are rejected", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "/relative",
    "https://user:pass@example.org",
    "https://",
    "https://example.org/" + "x".repeat(2048),
  ])
    assert.equal(validHttpUrl(value), false, value);
  for (const value of [
    "https://example.org/paper",
    "http://example.org/proceedings",
  ])
    assert.equal(validHttpUrl(value), true);
});

test("drafts permit unfinished publication fields but publication does not", () => {
  const draft = {
    ...emptyContent("publications"),
    title: "A paper",
    authors: "",
    year: "",
    type: "",
    venue: "",
  };
  assert.deepEqual(validateContent("publications", draft), {});
  assert.deepEqual(
    Object.keys(validateContent("publications", draft, true)).sort(),
    ["authors", "type", "venue", "year"],
  );
});

test("nonempty invalid publication fields fail even when only saving a draft", () => {
  const draft = {
    ...emptyContent("publications"),
    title: "A paper",
    year: "999",
    type: "Unknown",
    pdfLink: "javascript:bad",
  };
  assert.deepEqual(Object.keys(validateContent("publications", draft)).sort(), [
    "pdfLink",
    "type",
    "year",
  ]);
  assert.ok(validateContent("publications", { ...draft, year: "3000" }).year);
  assert.ok(validateContent("publications", { ...draft, year: "0000" }).year);
});

test("news validates real calendar dates and nonempty content before publication", () => {
  const draft = {
    ...emptyContent("news"),
    title: "Update",
    date: "",
    body: ["   "],
  };
  assert.deepEqual(validateContent("news", draft), {});
  assert.deepEqual(Object.keys(validateContent("news", draft, true)), [
    "date",
    "body",
  ]);
  assert.ok(validateContent("news", { ...draft, date: "2026-02-30" }).date);
  assert.equal(
    validateContent("news", { ...draft, date: "2024-02-29" }).date,
    undefined,
  );
});

test("payload preparation trims metadata while preserving news text and links", () => {
  const body = [
    " Intro\n",
    { text: "paper", href: "https://example.org" },
    "\nEnd ",
  ];
  assert.deepEqual(
    contentPayload("news", {
      title: " Update ",
      date: "2026-11-08",
      venue: " Event ",
      body,
    }),
    { title: "Update", date: "2026-11-08", venue: "Event", body },
  );
  assert.equal(
    contentPayload("publications", {
      ...emptyContent("publications"),
      year: 2026,
    }).year,
    "2026",
  );
});

test("backend field errors are recognized in object and legacy array formats", () => {
  assert.deepEqual(
    contentFieldErrors({
      response: {
        data: {
          details: {
            fieldErrors: {
              title: "Enter a title",
              "draft.body[2].href": "Invalid URL",
            },
          },
        },
      },
    }),
    { title: "Enter a title", body: "Invalid URL" },
  );
  assert.deepEqual(
    contentFieldErrors({
      response: {
        data: {
          details: {
            fieldErrors: [{ field: "draft.authors", message: "Enter authors" }],
          },
        },
      },
    }),
    { authors: "Enter authors" },
  );
});

test("every draft mutation includes the entry version and unwraps ApiSuccess data", async () => {
  const saved = { id: "entry-1", version: 4 };
  const api = {
    put: async (url, payload) => {
      assert.equal(url, "v1/admin/content/news/entry-1");
      assert.deepEqual(payload, { draft: { title: "New title" }, version: 3 });
      return { data: { data: saved } };
    },
    post: async (url, payload) => {
      assert.equal(url, "v1/admin/content/news/entry-1/publish");
      assert.deepEqual(payload, { version: 4 });
      return { data: { data: { ...saved, version: 5 } } };
    },
  };
  assert.deepEqual(
    await updateContent(
      api,
      "news",
      { id: "entry-1", version: 3 },
      { title: "New title" },
    ),
    saved,
  );
  assert.equal(
    (await transitionContent(api, "news", saved, "publish")).version,
    5,
  );
});

test("trash uses a versioned delete, and restore is an explicit versioned action", async () => {
  const entry = { id: "paper-1", version: 8 };
  const api = {
    delete: async (url, config) => {
      assert.equal(url, "v1/admin/content/publications/paper-1");
      assert.deepEqual(config, { params: { version: 8 } });
      return { data: { data: { ...entry, status: "TRASH" } } };
    },
    post: async (url, payload) => {
      assert.equal(url, "v1/admin/content/publications/paper-1/restore");
      assert.deepEqual(payload, { version: 8 });
      return { data: { data: { ...entry, status: "DRAFT" } } };
    },
  };
  assert.equal(
    (await transitionContent(api, "publications", entry, "trash")).status,
    "TRASH",
  );
  assert.equal(
    (await transitionContent(api, "publications", entry, "restore")).status,
    "DRAFT",
  );
});
