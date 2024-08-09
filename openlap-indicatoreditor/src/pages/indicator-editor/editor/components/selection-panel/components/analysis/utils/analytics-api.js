export const fetchAnalyticsTechnique = async (api) => {
  try {
    const response = await api.get("v1/analytics/methods");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch analytics technique data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
