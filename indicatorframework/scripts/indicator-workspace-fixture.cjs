// Synthetic metadata endpoint shared by browser fixtures. Sorting and paging
// happen across both kinds before slicing, matching the workspace API contract.
// Never return full authoring documents or generated chart code from a list.
const savedRow = (item) => ({
  id: item.id, kind: "SAVED", status: "SAVED", name: item.name || item.indicatorName || "",
  indicatorType: item.indicatorType || item.type,
  createdAt: item.createdAt || item.createdOn || "2026-01-01T12:00:00Z",
  updatedAt: item.updatedAt || item.createdAt || item.createdOn || "2026-01-01T12:00:00Z",
  revision: null, sourceIndicatorId: null, recoverable: null, completionPending: false,
});
const draftRow = (item) => ({
  id: item.id, kind: "DRAFT", status: "DRAFT", name: item.name,
  indicatorType: item.indicatorType, createdAt: item.createdAt, updatedAt: item.updatedAt,
  revision: item.revision, sourceIndicatorId: item.sourceIndicatorId || null,
  recoverable: item.recoverable !== false, completionPending: Boolean(item.completionPending),
});
module.exports = function workspacePage({ saved = [], drafts = [], query = {} }) {
  const params = query instanceof URLSearchParams ? Object.fromEntries(query) : query;
  const search = String(params.search || "").toLocaleLowerCase();
  const rows = [
    ...(String(params.draftsOnly) === "true" ? [] : saved.map(savedRow)),
    ...drafts.filter((item) => item.status === "DRAFT").map(draftRow),
  ].filter((item) => (!search || item.name.toLocaleLowerCase().includes(search)) &&
    (!params.indicatorType || item.indicatorType === params.indicatorType));
  const field = new Set(["name", "indicatorType", "createdAt", "updatedAt", "status"]).has(params.sortBy) ? params.sortBy : "updatedAt";
  const direction = params.sortDirection === "asc" ? 1 : -1;
  rows.sort((a, b) => String(a[field] || "").localeCompare(String(b[field] || "")) * direction ||
    a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const page = Math.max(0, Number(params.page) || 0), size = Math.max(1, Number(params.size) || 10);
  const content = rows.slice(page * size, (page + 1) * size);
  return { content, totalElements: rows.length, totalPages: Math.ceil(rows.length / size),
    number: page, size, numberOfElements: content.length, first: page === 0, last: (page + 1) * size >= rows.length,
    pageable: { pageNumber: page, pageSize: size } };
};
