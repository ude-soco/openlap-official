import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  bodyToDocument,
  canonicalRichText,
  richTextDepth,
  richTextLength,
  richTextLinks,
  richTextNodeCount,
  richTextPlainText,
} from "./rich-text.js";
import RichTextContent from "../components/rich-text/rich-text-content.js";

test("legacy content keeps text, spaces, newlines and hyperlinks in the rich editor", () => {
  const body = [
    "First paragraph\nRead ",
    { text: "this paper", href: "https://example.org/paper" },
    ".\n\nLast line ",
  ];
  const doc = bodyToDocument(body);
  assert.equal(richTextPlainText(doc), richTextPlainText(body));
  assert.deepEqual(richTextLinks(doc), richTextLinks(body));
  assert.equal(richTextLength(doc), richTextLength(body));
  assert.deepEqual(bodyToDocument(doc), doc);
});

test("editor defaults normalize without changing persisted formatting or links", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: {},
        content: [
          {
            type: "text",
            text: "Paper",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://example.org",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  class: null,
                },
              },
              { type: "underline" },
              { type: "bold" },
            ],
          },
        ],
      },
    ],
  };
  const canonical = canonicalRichText(doc);
  assert.deepEqual(canonical.content[0].content[0].marks, [
    { type: "bold" },
    { type: "underline" },
    { type: "link", attrs: { href: "https://example.org" } },
  ]);
  assert.deepEqual(canonicalRichText(canonical), canonical);
  assert.equal(
    renderToStaticMarkup(createElement(RichTextContent, { body: canonical })),
    '<p><a href="https://example.org/" target="_blank" rel="noopener noreferrer"><u><strong>Paper</strong></u></a></p>',
  );
});

test("paragraphs and lists retain their structure in plain text and public rendering", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "An update" }] },
      {
        type: "orderedList",
        attrs: { start: 3, type: null },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "First item",
                    marks: [{ type: "italic" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  assert.equal(richTextPlainText(doc), "An update\nFirst item");
  assert.equal(richTextLength(doc), 19);
  assert.equal(richTextNodeCount(doc), 7);
  assert.match(
    renderToStaticMarkup(createElement(RichTextContent, { body: doc })),
    /<ol start="3"><li><p><em>First item<\/em><\/p><\/li><\/ol>/,
  );
});

test("empty rich documents stay empty for required-content validation", () => {
  for (const body of [
    undefined,
    [],
    [""],
    { type: "doc", content: [] },
    { type: "doc", content: [{ type: "paragraph" }] },
  ]) {
    assert.equal(richTextPlainText(body).trim(), "");
    assert.deepEqual(bodyToDocument(body), {
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  }
});

test("overly nested list text is preserved so validation can reject it without data loss", () => {
  let block = {
    type: "paragraph",
    content: [{ type: "text", text: "Keep my text" }],
  };
  for (let i = 0; i < 7; i++)
    block = {
      type: "bulletList",
      content: [{ type: "listItem", content: [{ type: "paragraph" }, block] }],
    };
  const doc = canonicalRichText({ type: "doc", content: [block] });
  assert.ok(richTextDepth(doc) > 12);
  assert.match(richTextPlainText(doc), /Keep my text/);
  assert.match(
    renderToStaticMarkup(createElement(RichTextContent, { body: doc })),
    /Keep my text/,
  );
});

test("public rendering escapes text and never renders executable nodes or arbitrary attributes", () => {
  const body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { onclick: "alert(1)" },
        content: [
          {
            type: "text",
            text: '<script>alert("x")</script>',
            marks: [
              {
                type: "link",
                attrs: { href: "javascript:alert(1)", onclick: "bad" },
              },
            ],
          },
          { type: "image", attrs: { src: "x", onerror: "bad" } },
        ],
      },
    ],
  };
  const markup = renderToStaticMarkup(createElement(RichTextContent, { body }));
  assert.equal(
    markup,
    "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>",
  );
});
