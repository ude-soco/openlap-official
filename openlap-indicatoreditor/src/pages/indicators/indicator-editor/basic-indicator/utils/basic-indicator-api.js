export const requestCreateBasicIndicator = async (
  api,
  indicatorQuery,
  analysisRef,
  visRef,
  indicator,
  configuration
) => {
  try {
    const requestBody = {
      name: indicator.indicatorName,
      indicatorType: indicator.type,
      indicatorQuery,
      ...analysisRef,
      ...visRef,
      configuration: configuration,
    };
    const response = await api.post("v1/indicators/basic/create", requestBody);
    return response.data;
  } catch (error) {
    console.error("Failed to save indicator", error);
    throw error; // Re-throw the error to handle it in the component
  }
};

export const requestUpdateBasicIndicator = async (
  api,
  indicatorId,
  indicatorQuery,
  analysisRef,
  visRef,
  indicator,
  configuration
) => {
  try {
    const requestBody = {
      name: indicator.indicatorName,
      indicatorType: indicator.type,
      indicatorQuery,
      ...analysisRef,
      ...visRef,
      configuration: configuration,
    };
    const response = await api.put(
      `v1/indicators/basic/${indicatorId}/update`,
      requestBody
    );
    return response.data;
  } catch (error) {
    console.error("Failed to save indicator", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
