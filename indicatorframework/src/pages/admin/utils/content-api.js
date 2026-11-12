const base = (kind) => `v1/admin/content/${kind}`;
const unwrap = (response) => response.data.data;

export const listContent = (api, kind, params, signal) =>
  api.get(base(kind), { params, signal }).then(unwrap);
export const getContent = (api, kind, id) =>
  api.get(`${base(kind)}/${id}`).then(unwrap);
export const createContent = (api, kind, draft) =>
  api.post(base(kind), { draft }).then(unwrap);
export const updateContent = (api, kind, entry, draft) =>
  api
    .put(`${base(kind)}/${entry.id}`, { draft, version: entry.version })
    .then(unwrap);
export const transitionContent = (api, kind, entry, action) =>
  action === "trash"
    ? api
        .delete(`${base(kind)}/${entry.id}`, {
          params: { version: entry.version },
        })
        .then(unwrap)
    : api
        .post(`${base(kind)}/${entry.id}/${action}`, { version: entry.version })
        .then(unwrap);
