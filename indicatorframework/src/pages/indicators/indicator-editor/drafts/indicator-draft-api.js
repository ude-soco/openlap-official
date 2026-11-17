const dataOf = (response) => response?.data?.data ?? response?.data;
const segment = (value) => encodeURIComponent(value);

// Keep draft persistence separate from preview/analysis APIs: incomplete drafts
// must never execute a plugin merely because an autosave runs.
export function createIndicatorDraftApi(api, { initialDraft = null } = {}) {
  let adaptationSourceDraftId = initialDraft?.adaptation ? initialDraft.id : null;
  const adaptationIds = new Set(adaptationSourceDraftId ? [adaptationSourceDraftId] : []);
  const remember = (draft) => {
    if (draft?.adaptation && draft.id) { adaptationIds.add(draft.id); adaptationSourceDraftId = draft.id; }
    return draft;
  };
  return {
    list: async (query = {}) => dataOf(await api.get(`v1/indicators/drafts?${new URLSearchParams(query)}`)),
    get: async (id) => remember(dataOf(await api.get(`v1/indicators/drafts/${segment(id)}`))),
    create: async (body) => remember(dataOf(await api.post("v1/indicators/drafts", adaptationSourceDraftId ? { ...body, adaptationSourceDraftId } : body))),
    update: async (id, body) => remember(dataOf(await api.put(`v1/indicators/drafts/${segment(id)}`, body))),
    edit: async (id) => dataOf(await api.post(`v1/indicators/${segment(id)}/edit-draft`)),
    prepareComplete: async (id, request) => {
      if (!adaptationIds.has(id)) return request;
      const preview = dataOf(await api.post(`v1/indicators/drafts/${segment(id)}/adaptation-preview`, { revision: request.revision, stage: "visualization" }));
      if (preview?.status !== "READY" || !preview.receiptId || preview.revision !== request.revision) {
        throw new Error(preview?.message || "Your latest selections could not be verified. Review the preview and try again.");
      }
      return { revision: request.revision, indicator: { adaptationReceiptId: preview.receiptId } };
    },
    complete: async (id, body) => dataOf(await api.post(`v1/indicators/drafts/${segment(id)}/complete`, body)),
    resume: async (id) => dataOf(await api.post(`v1/indicators/drafts/${segment(id)}/resume`)),
    discard: async (id, revision) => dataOf(await api.delete(`v1/indicators/drafts/${segment(id)}?revision=${segment(revision)}`)),
  };
}

export const draftErrorMessage = (error) => error?.response?.data?.message || error?.message || "Couldn’t save this draft. Your changes are kept here; retry when the connection is available.";
