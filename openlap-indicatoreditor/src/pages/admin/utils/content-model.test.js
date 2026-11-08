import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bodyLinks,
  bodyToText,
  contentFieldErrors,
  contentPayload,
  editBodyText,
  emptyContent,
  setBodyLink,
  validHttpUrl,
  validateContent,
} from "./content-model.js";
import { transitionContent, updateContent } from "./content-api.js";

const linkedBody = () => [
  "Read ",
  { text: "the paper", href: "https://example.org/paper" },
  " today.",
];

test("existing linked news survives a round trip through the text editor", () => {
  const body = linkedBody();
  assert.deepEqual(editBodyText(body, bodyToText(body)), body);
  assert.deepEqual(bodyLinks(body), [
    { start: 5, end: 14, text: "the paper", href: "https://example.org/paper" },
  ]);
});

test("typing before, inside and after linked text preserves its correct range", () => {
  const body = linkedBody();
  assert.deepEqual(editBodyText(body, "Please read the paper today."), [
    "Please read ",
    { text: "the paper", href: "https://example.org/paper" },
    " today.",
  ]);
  assert.deepEqual(editBodyText(body, "Read the new paper today."), [
    "Read ",
    { text: "the new paper", href: "https://example.org/paper" },
    " today.",
  ]);
  assert.deepEqual(editBodyText(body, "Read the paper today!"), [
    "Read ",
    { text: "the paper", href: "https://example.org/paper" },
    " today!",
  ]);
});

test("inserting at a link boundary does not accidentally link new text", () => {
  assert.deepEqual(editBodyText(linkedBody(), "Read only the paper today."), [
    "Read only ",
    { text: "the paper", href: "https://example.org/paper" },
    " today.",
  ]);
  assert.deepEqual(
    editBodyText(linkedBody(), "Read the paper carefully today."),
    [
      "Read ",
      { text: "the paper", href: "https://example.org/paper" },
      " carefully today.",
    ],
  );
});

test("deleting a link or a selection spanning link boundaries preserves remaining text", () => {
  assert.equal(
    bodyToText(editBodyText(linkedBody(), "Read  today.")),
    "Read  today.",
  );
  assert.deepEqual(bodyLinks(editBodyText(linkedBody(), "Read  today.")), []);
  const result = editBodyText(linkedBody(), "Read paper today.");
  assert.equal(bodyToText(result), "Read paper today.");
  assert.equal(bodyLinks(result)[0].text, "paper");
});

test("a link can be added, retargeted and removed without changing the words", () => {
  const original = ["A paper and a demo."];
  const added = setBodyLink(original, 2, 7, "https://example.org/paper");
  const changed = setBodyLink(added, 2, 7, " https://example.org/new ");
  assert.equal(bodyLinks(changed)[0].href, "https://example.org/new");
  assert.equal(bodyToText(changed), bodyToText(original));
  assert.deepEqual(setBodyLink(changed, 2, 7, ""), original);
});

test("linking part of an existing link keeps both surviving fragments", () => {
  const body = [{ text: "one two three", href: "https://example.org/old" }];
  const next = setBodyLink(body, 4, 7, "https://example.org/new");
  assert.deepEqual(next, [
    { text: "one ", href: "https://example.org/old" },
    { text: "two", href: "https://example.org/new" },
    { text: " three", href: "https://example.org/old" },
  ]);
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
