const TYPES = { basic: "BASIC", composite: "COMPOSITE", "multi-level-analysis": "MULTI_LEVEL" };
export function editorRoute(path) {
  const parts = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (!parts.length) return { mode: "choose", identity: "choose" };
  if (parts.length === 1 && TYPES[parts[0]]) return { mode: "new", indicatorType: TYPES[parts[0]], identity: `new:${TYPES[parts[0]]}` };
  if (parts.length === 2 && parts[0] === "drafts") return { mode: "draft", id: parts[1], identity: `draft:${parts[1]}` };
  if (parts.length === 3 && TYPES[parts[0]] && parts[1] === "edit") return { mode: "edit", id: parts[2],
    indicatorType: TYPES[parts[0]], identity: `edit:${TYPES[parts[0]]}:${parts[2]}` };
  return { mode: "unknown", identity: "unknown" };
}
