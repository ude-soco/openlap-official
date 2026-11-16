const kinds = new Set(["indicators", "isc"]);
const pathFor = (kind, id = "") => {
  if (!kinds.has(kind)) throw new Error("Unknown community pool.");
  return `v1/community/${kind}${id ? `/${encodeURIComponent(id)}` : ""}`;
};
const dataOf = (response) => response.data.data;

export const requestCommunityPool = async (api, kind, query, signal) =>
  dataOf(await api.get(`${pathFor(kind)}?${new URLSearchParams(query)}`, { signal }));
export const requestCommunityFilters = async (api, kind, signal) =>
  dataOf(await api.get(`${pathFor(kind)}/filters`, { signal }));
export const requestCommunityDetail = async (api, kind, id, signal) =>
  dataOf(await api.get(pathFor(kind, id), { signal }));
export const requestCommunityPreview = async (api, id, connections = {}, signal) =>
  dataOf(await api.post(`${pathFor("indicators", id)}/preview`, { connections }, { signal }));
export const requestCommunityAdaptation = async (api, id, clientRequestId) =>
  dataOf(await api.post(`${pathFor("indicators", id)}/adaptations`, { clientRequestId }));
export const requestCommunityCopy = async (api, kind, id, receiptId, version) =>
  dataOf(await api.post(`${pathFor(kind, id)}/copy`, kind === "indicators" ? { receiptId } : { version }));

export const communityError = (error, fallback) => {
  // An Axios Error.message can include request internals. Only the community
  // boundary's deliberately public message is suitable for this interface.
  const message = error?.response?.data?.message;
  return typeof message === "string" && message.length <= 500 ? message : fallback;
};
export const communityTypeName = (type) => ({
  BASIC: "Basic", COMPOSITE: "Composite", MULTI_LEVEL: "Multilevel analysis", ISC: "ISC",
}[type] || type || "—");
export const canSaveCommunityPreview = (preview, chartReady) =>
  Boolean(preview?.status === "READY" && preview.receiptId && chartReady);
