export const fetchAnalyticsTechnique = async (api) => {
  try {
    const response = await api.get("v1/analytics/methods");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch analytics technique data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchTechniqueInputs = async (api, techniqueId) => {
  try {
    const response = await api.get(
      "v1/analytics/methods/inputs/" + techniqueId
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch analytics technique data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchTechniqueParams = async (api, techniqueId) => {
  try {
    const response = await api.get(
      "v1/analytics/methods/params/" + techniqueId
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch analytics technique param data");
    throw error; // Re-throw the error to handle it in the component
  }
};
