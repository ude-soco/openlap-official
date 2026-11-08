import StarterKit from "@tiptap/starter-kit";
import { validHttpUrl } from "../utils/content-model.js";

// Keep the editable schema identical to the allow-listed public content schema.
export function contentEditorExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      strike: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        enableClickSelection: true,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        isAllowedUri: validHttpUrl,
        shouldAutoLink: (url) => Boolean(editorLinkUrl(url)),
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      },
    }),
  ];
}

// Accept a familiar bare domain in the dialog, while retaining the same strict
// HTTP(S) validation used for storage. Explicit non-web schemes stay invalid.
export function editorLinkUrl(value) {
  const trimmed = value.trim();
  if (validHttpUrl(trimmed)) return trimmed;
  if (
    !/^[a-z][a-z\d+.-]*:/i.test(trimmed) &&
    !/\s/.test(trimmed) &&
    /^[^/]+\.[^/]+(?:\/.*)?$/.test(trimmed)
  ) {
    const candidate = `https://${trimmed}`;
    if (validHttpUrl(candidate)) return candidate;
  }
  return null;
}
