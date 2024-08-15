export const requestCompatibleColumnsToMerge = async (api, indicators) => {
  try {
    const response = await api.post(`v1/indicators/multilevel/compatible`, {
      indicators,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error;
  }
};

export const requestMergeIndicatorsToPreviewData = async (api, indicators) => {
  try {
    const response = await api.post(`v1/indicators/multilevel/merge`, {
      indicators,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error.response;
  }
};
