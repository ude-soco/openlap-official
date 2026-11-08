import { test } from "node:test";
import assert from "node:assert/strict";
import { Editor, getSchema } from "@tiptap/core";
import {
  contentEditorExtensions,
  editorLinkUrl,
} from "./content-editor-config.js";
import {
  bodyToDocument,
  canonicalRichText,
} from "../../../common/utils/rich-text.js";

test("the editable schema supports the same formatting as public news", () => {
  const schema = getSchema(contentEditorExtensions());
  assert.deepEqual(Object.keys(schema.nodes).sort(), [
    "bulletList",
    "doc",
    "hardBreak",
    "listItem",
    "orderedList",
    "paragraph",
    "text",
  ]);
  assert.deepEqual(Object.keys(schema.marks).sort(), [
    "bold",
    "italic",
    "link",
    "underline",
  ]);
  const document = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "A linked list item",
                    marks: [
                      { type: "bold" },
                      { type: "link", attrs: { href: "https://example.org" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  document.check();
  assert.equal(document.textContent, "A linked list item");
  assert.throws(
    () => schema.nodeFromJSON({ type: "heading", content: [] }),
    /Unknown node type/,
  );
});

test("typed links and pasted URLs share strict HTTP(S) validation", () => {
  const options = contentEditorExtensions()[0].options.link;
  assert.equal(options.openOnClick, false);
  assert.equal(options.enableClickSelection, true);
  assert.equal(options.autolink, true);
  assert.equal(options.linkOnPaste, true);
  assert.equal(options.defaultProtocol, "https");
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "https://user:password@example.org",
    "ftp://example.org/paper",
  ]) {
    assert.equal(options.isAllowedUri(value), false, value);
    assert.equal(options.shouldAutoLink(value), false, value);
  }
  assert.equal(options.shouldAutoLink("example.org/paper"), true);
  assert.deepEqual(options.HTMLAttributes, {
    target: "_blank",
    rel: "noopener noreferrer",
  });
});

test("link dialog accepts web domains and does not repair unsafe schemes", () => {
  assert.equal(
    editorLinkUrl(" example.org/paper "),
    "https://example.org/paper",
  );
  assert.equal(
    editorLinkUrl("https://example.org/paper"),
    "https://example.org/paper",
  );
  for (const value of [
    "javascript:alert(1)",
    "https://user@example.org",
    "/relative/page",
    "not a web address",
    "mailto:user@example.org",
    "https://example.org/" + "x".repeat(2048),
  ])
    assert.equal(editorLinkUrl(value), null, value);
});

test("opening legacy news and synchronizing a saved snapshot do not emit edits", () => {
  let updates = 0;
  const editor = new Editor({
    element: null,
    extensions: contentEditorExtensions(),
    content: bodyToDocument([
      "Read ",
      { text: "the paper", href: "https://example.org/paper" },
      ".",
    ]),
    onUpdate: () => {
      updates++;
    },
  });
  try {
    assert.equal(updates, 0);
    assert.equal(editor.getText(), "Read the paper.");
    editor.commands.setContent(bodyToDocument(["A different saved draft."]), {
      emitUpdate: false,
    });
    assert.equal(updates, 0);
    assert.equal(editor.getText(), "A different saved draft.");
    editor.commands.setTextSelection({ from: 1, to: 2 });
    editor.commands.toggleBold();
    assert.equal(updates, 1);
  } finally {
    editor.destroy();
  }
});

test("formatted links remain editable and serialize without Tiptap metadata", () => {
  const editor = new Editor({
    element: null,
    extensions: contentEditorExtensions(),
    content: bodyToDocument(["Read the paper."]),
  });
  try {
    editor.commands.setTextSelection({ from: 6, to: 15 });
    editor.commands.toggleBold();
    editor.commands.toggleUnderline();
    editor.commands.setLink({ href: "https://example.org/paper" });
    editor.commands.setLink({ href: "https://example.org/revised" });
    const linked = canonicalRichText(editor.getJSON()).content[0].content.find(
      (node) => node.text === "the paper",
    );
    assert.deepEqual(linked.marks, [
      { type: "bold" },
      { type: "underline" },
      { type: "link", attrs: { href: "https://example.org/revised" } },
    ]);
    editor.commands.unsetLink();
    const unlinked = canonicalRichText(
      editor.getJSON(),
    ).content[0].content.find((node) => node.text === "the paper");
    assert.deepEqual(unlinked.marks, [{ type: "bold" }, { type: "underline" }]);
  } finally {
    editor.destroy();
  }
});
