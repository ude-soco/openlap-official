import { createElement, Fragment } from "react";
import PropTypes from "prop-types";
import { bodyToDocument, richTextHref } from "../../utils/rich-text.js";

// Render only known elements and attributes. Content is always escaped by React;
// no stored HTML, DOM injection, editor packages, or arbitrary attributes here.
export default function RichTextContent({ body }) {
  const render = (node, key) => {
    if (node.type === "text") {
      let text = node.text;
      for (const mark of node.marks || []) {
        if (mark.type === "link") {
          const href = richTextHref(mark.attrs?.href);
          if (href)
            text = createElement(
              "a",
              { href, target: "_blank", rel: "noopener noreferrer" },
              text,
            );
        } else {
          const tag = { bold: "strong", italic: "em", underline: "u" }[
            mark.type
          ];
          if (tag) text = createElement(tag, null, text);
        }
      }
      return createElement(Fragment, { key }, text);
    }
    if (node.type === "hardBreak") return createElement("br", { key });
    const tag = {
      paragraph: "p",
      bulletList: "ul",
      orderedList: "ol",
      listItem: "li",
    }[node.type];
    if (!tag) return null;
    return createElement(
      tag,
      { key, ...(tag === "ol" && { start: node.attrs?.start || 1 }) },
      (node.content || []).map(render),
    );
  };
  return createElement(
    Fragment,
    null,
    bodyToDocument(body).content.map(render),
  );
}

RichTextContent.propTypes = {
  body: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};
