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
      "v1/analytics/methods/inputs/" + techniqueId,
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
      "v1/analytics/methods/params/" + techniqueId,
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch analytics technique param data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchAnalyzedData = async (api, indicatorQuery, analysisRef) => {
  try {
    const requestBody = {
      indicatorQuery: { ...indicatorQuery },
      ...analysisRef,
    };
    const response = await api.post("v1/indicators/basic/analyze", requestBody);
    return {
      data: response.data.data.columns,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to fetch analytics technique param data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const requestAnalyzedDataForMultiLevelIndicator = async (
  api,
  indicatorRef,
  analysisRef,
) => {
  try {
    const requestBody = {
      indicators: indicatorRef.indicators,
      analyticsTechniqueId: analysisRef.analyticsTechniqueId,
      analyticsTechniqueMapping: {
        mapping: analysisRef.analyticsTechniqueMapping.mapping,
      },
      analyticsTechniqueParams: analysisRef.analyticsTechniqueParams,
    };
    const response = await api.post(
      "v1/indicators/multilevel/analyze",
      requestBody,
    );
    return {
      data: response.data.data.columns,
      message: response.data.message,
    };
  } catch (error) {
    throw error;
  }
};
