export const PUBLICATION_TYPES = [
  "Journal",
  "Conference",
  "Workshop",
  "Book chapter",
];
export const CONTENT_KINDS = ["news", "publications"];

export const contentLabel = (kind) =>
  kind === "news" ? "news" : "publication";
export const isContentKind = (kind) => CONTENT_KINDS.includes(kind);

export function emptyContent(kind, now = new Date()) {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return kind === "news"
    ? { title: "", date, body: [""], venue: "" }
    : {
        title: "",
        authors: "",
        year: String(now.getFullYear()),
        type: "Journal",
        venue: "",
        pdfLink: "",
        details: "",
      };
}

export const bodyToText = (body = []) =>
  body
    .map((part) => (typeof part === "string" ? part : part.text || ""))
    .join("");

export function bodyLinks(body = []) {
  let offset = 0;
  return body.flatMap((part) => {
    const text = typeof part === "string" ? part : part.text || "";
    const start = offset;
    offset += text.length;
    return typeof part === "string"
      ? []
      : [{ start, end: offset, text, href: part.href || "" }];
  });
}

function fromRanges(text, ranges) {
  const result = [];
  let offset = 0;
  for (const link of ranges
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start)) {
    if (link.start > offset) result.push(text.slice(offset, link.start));
    result.push({ text: text.slice(link.start, link.end), href: link.href });
    offset = link.end;
  }
  if (offset < text.length) result.push(text.slice(offset));
  return result.length ? result : [""];
}

// Apply the changed text range while retaining link formatting on surviving
// characters. Insertion inside a link extends it; insertion at its edge does not.
export function editBodyText(body, nextText) {
  const previous = bodyToText(body);
  if (previous === nextText) return body;
  let start = 0;
  while (
    start < previous.length &&
    start < nextText.length &&
    previous[start] === nextText[start]
  )
    start++;
  let suffix = 0;
  while (
    suffix < previous.length - start &&
    suffix < nextText.length - start &&
    previous[previous.length - suffix - 1] ===
      nextText[nextText.length - suffix - 1]
  )
    suffix++;
  const oldEnd = previous.length - suffix;
  const newEnd = nextText.length - suffix;
  const delta = nextText.length - previous.length;
  const links = bodyLinks(body).flatMap((link) => {
    if (link.end <= start) return [link];
    if (link.start >= oldEnd)
      return [{ ...link, start: link.start + delta, end: link.end + delta }];
    if (
      link.start <= start &&
      link.end >= oldEnd &&
      (start > link.start || oldEnd < link.end)
    ) {
      return [{ ...link, end: link.end + delta }];
    }
    return [
      ...(link.start < start ? [{ ...link, end: start }] : []),
      ...(link.end > oldEnd
        ? [{ ...link, start: newEnd, end: link.end + delta }]
        : []),
    ];
  });
  return fromRanges(nextText, links);
}

export function setBodyLink(body, start, end, href) {
  const text = bodyToText(body);
  if (start < 0 || end > text.length || end <= start) return body;
  const links = bodyLinks(body).flatMap((link) => {
    if (link.end <= start || link.start >= end) return [link];
    return [
      ...(link.start < start ? [{ ...link, end: start }] : []),
      ...(link.end > end ? [{ ...link, start: end }] : []),
    ];
  });
  if (href) links.push({ start, end, href: href.trim() });
  return fromRanges(text, links);
}

export function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      value.length <= 2048 &&
      ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const validDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function validateContent(kind, draft, publishing = false) {
  const errors = {};
  if (!draft.title?.trim()) errors.title = "Enter a title.";
  else if (draft.title.trim().length > 300)
    errors.title = "Keep the title to 300 characters or fewer.";
  if (kind === "news") {
    if ((publishing || draft.date) && !validDate(draft.date))
      errors.date = "Choose a valid news date.";
    if (publishing && !bodyToText(draft.body).trim())
      errors.body = "Enter the news content before publishing.";
    if (bodyToText(draft.body).length > 30000)
      errors.body = "Keep the content to 30,000 characters or fewer.";
    if (draft.body?.length > 500)
      errors.body =
        "This update contains too many separate links. Remove a few links before saving.";
    if (bodyLinks(draft.body).some((link) => !validHttpUrl(link.href)))
      errors.body =
        "Each content link must be a valid http:// or https:// URL.";
  } else {
    if (
      (publishing || draft.year) &&
      (!/^\d{4}$/.test(String(draft.year || "")) ||
        Number(draft.year) < 1000 ||
        Number(draft.year) > 2999)
    )
      errors.year =
        "Enter a four-digit publication year between 1000 and 2999.";
    if ((publishing || draft.type) && !PUBLICATION_TYPES.includes(draft.type))
      errors.type = "Choose a publication type.";
    if (publishing && !draft.authors?.trim())
      errors.authors = "Enter the authors in publication order.";
    if (publishing && !draft.venue?.trim())
      errors.venue = "Enter the journal, conference, or publication venue.";
    for (const field of ["pdfLink", "details"]) {
      if (draft[field]?.trim() && !validHttpUrl(draft[field].trim()))
        errors[field] =
          "Enter a valid http:// or https:// URL, or leave this blank.";
    }
  }
  for (const field of ["authors", "venue"]) {
    const limit = kind === "news" ? 1000 : 2000;
    if (draft[field]?.trim().length > limit)
      errors[field] =
        `Keep this field to ${limit.toLocaleString("en-US")} characters or fewer.`;
  }
  return errors;
}

export function contentPayload(kind, draft) {
  const common = {
    title: draft.title.trim(),
    venue: (draft.venue || "").trim(),
  };
  return kind === "news"
    ? { ...common, date: (draft.date || "").trim(), body: draft.body || [""] }
    : {
        ...common,
        authors: (draft.authors || "").trim(),
        year: String(draft.year || "").trim(),
        type: (draft.type || "").trim(),
        pdfLink: (draft.pdfLink || "").trim(),
        details: (draft.details || "").trim(),
      };
}

export const contentError = (
  error,
  fallback = "Something went wrong. Your changes are still here; try again.",
) => error?.response?.data?.message || fallback;

export function contentFieldErrors(error) {
  const fields = error?.response?.data?.details?.fieldErrors;
  if (!fields) return {};
  const pairs = Array.isArray(fields)
    ? fields.map((item) => [item.field, item.message])
    : Object.entries(fields);
  return Object.fromEntries(
    pairs.map(([field, message]) => [
      field?.replace(/^draft\./, "").replace(/\[.*$/, ""),
      message,
    ]),
  );
}

export function contentStatus(entry) {
  if (entry.deletedAt || entry.status === "TRASH") return "In trash";
  if (entry.status === "PUBLISHED")
    return entry.hasUnpublishedChanges
      ? "Published · draft changes"
      : "Published";
  return "Draft";
}
