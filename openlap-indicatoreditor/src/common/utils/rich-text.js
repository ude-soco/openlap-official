const MARK_ORDER = ["bold", "italic", "underline", "link"];
const BLOCKS = ["paragraph", "bulletList", "orderedList", "listItem"];

export const isRichText = (value) =>
  value?.type === "doc" && Array.isArray(value.content);

export const richTextHref = (value) => {
  if (typeof value !== "string" || !value.trim() || value.length > 2048)
    return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};

// Keep editor-generated defaults out of persisted content. This representation
// is shared with backend validation and keeps snapshot comparisons stable.
export function canonicalRichText(document) {
  const normalize = (node) => {
    if (!node) return null;
    if (node.type === "text") {
      if (typeof node.text !== "string" || !node.text) return null;
      const result = { type: "text", text: node.text };
      const marks = MARK_ORDER.flatMap((type) => {
        const mark = (Array.isArray(node.marks) ? node.marks : []).find(
          (item) => item?.type === type,
        );
        if (!mark) return [];
        return [
          type === "link"
            ? { type, attrs: { href: mark.attrs?.href || "" } }
            : { type },
        ];
      });
      if (marks.length) result.marks = marks;
      return result;
    }
    if (node.type === "hardBreak") return { type: "hardBreak" };
    if (node.type !== "doc" && !BLOCKS.includes(node.type)) return null;
    const result = { type: node.type };
    if (node.type === "orderedList") {
      const start = node.attrs?.start ?? 1;
      result.attrs = {
        start:
          Number.isInteger(start) && start > 0 && start <= 100000 ? start : 1,
      };
    }
    const content = (Array.isArray(node.content) ? node.content : [])
      .map(normalize)
      .filter(Boolean);
    if (content.length) result.content = content;
    else if (node.type === "doc") result.content = [{ type: "paragraph" }];
    return result;
  };
  return (
    normalize(document) || { type: "doc", content: [{ type: "paragraph" }] }
  );
}

// Legacy text/link arrays remain in MongoDB until edited. Opening them in the
// rich editor preserves every character and hyperlink without saving anything.
export function bodyToDocument(body) {
  if (isRichText(body)) return canonicalRichText(body);
  const content = [];
  for (const part of Array.isArray(body) ? body : []) {
    const text =
      typeof part === "string"
        ? part
        : typeof part?.text === "string"
          ? part.text
          : "";
    const marks =
      typeof part === "object" && part?.href
        ? [{ type: "link", attrs: { href: part.href } }]
        : undefined;
    text.split(/\r\n|\r|\n/).forEach((line, index) => {
      if (index) content.push({ type: "hardBreak" });
      if (line)
        content.push({ type: "text", text: line, ...(marks && { marks }) });
    });
  }
  return canonicalRichText({
    type: "doc",
    content: [{ type: "paragraph", content }],
  });
}

export function richTextPlainText(body) {
  if (Array.isArray(body))
    return body
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  const text = (node) => {
    if (node.type === "text") return node.text;
    if (node.type === "hardBreak") return "\n";
    return (node.content || [])
      .map(text)
      .join(node.type === "paragraph" ? "" : "\n");
  };
  return text(bodyToDocument(body));
}

export function richTextLinks(body) {
  if (Array.isArray(body))
    return body
      .filter((part) => part && typeof part === "object")
      .map((part) => ({ text: part.text || "", href: part.href || "" }));
  const result = [];
  const visit = (node) => {
    const link = node.marks?.find((mark) => mark.type === "link");
    if (link)
      result.push({ text: node.text || "", href: link.attrs?.href || "" });
    (node.content || []).forEach(visit);
  };
  visit(bodyToDocument(body));
  return result;
}

export function richTextLength(body) {
  if (Array.isArray(body)) return richTextPlainText(body).length;
  const length = (node) =>
    node.type === "text"
      ? node.text.length
      : node.type === "hardBreak"
        ? 1
        : (node.content || []).reduce((sum, child) => sum + length(child), 0);
  return length(bodyToDocument(body));
}

export function richTextNodeCount(body) {
  const count = (node) =>
    1 + (node.content || []).reduce((sum, child) => sum + count(child), 0);
  return count(bodyToDocument(body));
}

export function richTextDepth(body) {
  const depth = (node) =>
    (node.content || []).reduce(
      (max, child) => Math.max(max, depth(child) + 1),
      0,
    );
  return depth(bodyToDocument(body)) + 1;
}
