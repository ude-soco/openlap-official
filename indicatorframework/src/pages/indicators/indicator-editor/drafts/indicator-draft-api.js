const dataOf = (response) => response?.data?.data ?? response?.data;
const segment = (value) => encodeURIComponent(value);

// Keep draft persistence separate from preview/analysis APIs: incomplete drafts
// must never execute a plugin merely because an autosave runs.
export function createIndicatorDraftApi(api) {
  return {
    list: async (query = {}) => dataOf(await api.get(`v1/indicators/drafts?${new URLSearchParams(query)}`)),
    get: async (id) => dataOf(await api.get(`v1/indicators/drafts/${segment(id)}`)),
    create: async (body) => dataOf(await api.post("v1/indicators/drafts", body)),
    update: async (id, body) => dataOf(await api.put(`v1/indicators/drafts/${segment(id)}`, body)),
    edit: async (id) => dataOf(await api.post(`v1/indicators/${segment(id)}/edit-draft`)),
    complete: async (id, body) => dataOf(await api.post(`v1/indicators/drafts/${segment(id)}/complete`, body)),
    resume: async (id) => dataOf(await api.post(`v1/indicators/drafts/${segment(id)}/resume`)),
    discard: async (id, revision) => dataOf(await api.delete(`v1/indicators/drafts/${segment(id)}?revision=${segment(revision)}`)),
  };
}

export const draftErrorMessage = (error) => error?.response?.data?.message || error?.message || "Couldn’t save this draft. Your changes are kept here; retry when the connection is available.";
