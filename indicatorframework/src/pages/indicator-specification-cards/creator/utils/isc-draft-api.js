// Draft lifecycle API client (Frontend Phase 1).
//
// Wraps the database-backed draft endpoints added in backend Phase 0. The four
// ISC domain slices live as objects in creator state; the backend stores them as
// stringified JSON, so we serialize them the same way the legacy finalize-api
// does. Each helper returns the unwrapped payload (`response.data.data`), mirroring
// the existing dashboard-api helpers.

/** Serialize the four domain slices into the backend request body. */
export const toDraftRequestBody = ({ requirements, dataset, visRef, lockedStep }) => ({
  requirements: JSON.stringify(requirements),
  dataset: JSON.stringify(dataset),
  visRef: JSON.stringify(visRef),
  lockedStep: JSON.stringify(lockedStep),
});

/** Create a new DRAFT row. Returns { id, status }. */
export const createDraft = async (api, domain) => {
  const response = await api.post("v1/isc/drafts", toDraftRequestBody(domain));
  return response.data.data;
};

/** Autosave an existing draft. */
export const updateDraft = async (api, draftId, domain) => {
  const response = await api.put(`v1/isc/drafts/${draftId}`, toDraftRequestBody(domain));
  return response.data.data;
};

/** Find-or-create the caller's edit draft for a saved ISC. Returns { id, status }. */
export const createOrGetEditDraft = async (api, sourceId) => {
  const response = await api.post(`v1/isc/${sourceId}/edit-draft`);
  return response.data.data;
};

/** Publish a draft (new → SAVED; edit → merge into source). Returns { id, status }. */
export const publishDraft = async (api, draftId) => {
  const response = await api.post(`v1/isc/drafts/${draftId}/publish`);
  return response.data.data;
};

/** Discard (delete) a draft. The source saved ISC (if any) is untouched. */
export const discardDraft = async (api, draftId) => {
  const response = await api.delete(`v1/isc/drafts/${draftId}`);
  return response.data;
};
