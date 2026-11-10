export const listPluginUploads = async (api, kind) =>
  (await api.get("v1/admin/plugins", { params: { kind } })).data.data;

export const getPluginUpload = async (api, id) =>
  (await api.get(`v1/admin/plugins/${encodeURIComponent(id)}`)).data.data;

export const uploadPlugin = async (api, kind, file, onUploadProgress, replacementTarget) => {
  const form = new FormData();
  form.append("file", file);
  return (await api.post("v1/admin/plugins/upload", form, {
    params: { kind, ...(replacementTarget ? { replacementKind: replacementTarget.kind, replacementId: replacementTarget.id } : {}) }, onUploadProgress,
  })).data.data;
};

export const inspectPlugin = async (api, review, trusted) =>
  (await api.post(`v1/admin/plugins/${encodeURIComponent(review.id)}/inspect`, {
    version: review.version, trusted,
  })).data.data;

export const activatePlugin = async (api, review) =>
  (await api.post(`v1/admin/plugins/${encodeURIComponent(review.id)}/activate`, {
    version: review.version,
  })).data.data;

const catalogPath = (kind, id) => `v1/admin/plugins/catalog/${kind}/${encodeURIComponent(id)}`;
export const getPluginDetails = async (api, kind, id) => (await api.get(catalogPath(kind, id))).data.data;
export const getPluginHistory = async (api, kind, id) => (await api.get(`${catalogPath(kind, id)}/history`)).data.data;
export const savePluginDetails = async (api, kind, id, payload) => (await api.patch(catalogPath(kind, id), payload)).data.data;
export const configurePluginReplacement = async (api, review, payload) =>
  (await api.post(`v1/admin/plugins/${encodeURIComponent(review.id)}/replacement`, { version: review.version, ...payload })).data.data;
export const retirePreviousPlugin = async (api, review) =>
  (await api.post(`v1/admin/plugins/${encodeURIComponent(review.id)}/retire-previous`, {
    version: review.version,
    expectedVersions: Object.fromEntries((review.retirementTargets || []).filter((row) => row.enabled).map((row) => [row.id, row.version])),
  })).data.data;

export const reviewPluginRemoval = async (api, kind, id) => (await api.get(`${catalogPath(kind, id)}/removal`)).data.data;
export const removePlugin = async (api, preview) => (await api.delete(catalogPath(preview.kind, preview.id), { data: {
  expectedVersions: Object.fromEntries(preview.affected.map((entry) => [entry.key, entry.version])),
} })).data.data;
export const listRemovedPlugins = async (api, kind) => (await api.get("v1/admin/plugins/removed", { params: { kind } })).data.data;
export const restoreRemovedPlugin = async (api, id) => (await api.post(`v1/admin/plugins/removals/${encodeURIComponent(id)}/restore`)).data.data;
export const resumePluginRemoval = async (api, id) => (await api.post(`v1/admin/plugins/removals/${encodeURIComponent(id)}/resume`)).data.data;
export const reviewArtifactCleanup = async (api) => (await api.get("v1/admin/plugins/cleanup")).data.data;
export const cleanupPluginArtifacts = async (api, artifactIds) => (await api.post("v1/admin/plugins/cleanup", { confirmed: true, artifactIds })).data.data;
export const transitionPluginReview = async (api, review, action) => (await api.post(`v1/admin/plugins/${encodeURIComponent(review.id)}/${action}`, { version: review.version })).data.data;
export const disablePlugin = async (api, kind, id) => {
  const path = kind === "ANALYTICS_METHOD" ? "analytics-methods" : kind === "VISUALIZATION_LIBRARY" ? "visualizations/libraries" : "visualizations/types";
  return (await api.patch(`v1/admin/${path}/${encodeURIComponent(id)}/status`, { enabled: false })).data.data;
};
