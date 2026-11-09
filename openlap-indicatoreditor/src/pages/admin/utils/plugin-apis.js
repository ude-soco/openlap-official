export const listPluginUploads = async (api, kind) =>
  (await api.get("v1/admin/plugins", { params: { kind } })).data.data;

export const getPluginUpload = async (api, id) =>
  (await api.get(`v1/admin/plugins/${encodeURIComponent(id)}`)).data.data;

export const uploadPlugin = async (api, kind, file, onUploadProgress) => {
  const form = new FormData();
  form.append("file", file);
  return (await api.post("v1/admin/plugins/upload", form, {
    params: { kind }, onUploadProgress,
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
