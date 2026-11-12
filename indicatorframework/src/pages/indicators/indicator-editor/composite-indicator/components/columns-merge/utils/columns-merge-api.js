export const requestIndicatorsToAnalyze = async (api, indicators) => {
  try {
    const response = await api.post(`v1/indicators/analyze`, {
      indicators,
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error;
  }
};

export const requestMergeIndicatorData = async (
  api,
  columnToMerge,
  indicators
) => {
  try {
    const response = await api.post(`v1/indicators/composite/merge`, {
      columnToMerge,
      indicators,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error;
  }
};
