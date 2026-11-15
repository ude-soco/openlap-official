import parseChartCode from "../../indicator-editor/components/utils/parse-chart-code";

export const requestMyIndicatorWorkspace = async (api, params = {}) => {
  const response = await api.get(`v1/indicators/my/workspace?${new URLSearchParams(params)}`);
  return response.data.data;
};

export const requestMyIndicators = async (api, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`v1/indicators/my?${queryString}`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch user's indicators list data");
    throw error;
  }
};

export const requestIndicatorFullDetail = async (api, indicatorId) => {
  try {
    const response = await api.get(`v1/indicators/${indicatorId}`);

    return {
      indicatorName: response.data.data.name,
      type: response.data.data.type,
      createdOn: response.data.data.createdOn,
      createdBy: response.data.data.createdBy,
      analyticsMethod: response.data.data.analyticsTechnique,
      library: response.data.data.visualizationLibrary,
      chart: response.data.data.visualizationType,
      previewData: parseChartCode(response.data.data.indicatorCode, response.data.data.visualizationTypeId),
      configuration: response.data.data.configuration,
    };
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error;
  }
};

export const requestIndicatorCode = async (api, indicatorId) => {
  try {
    const response = await api.get(`v1/indicators/${indicatorId}/code`);
    return response.data;
  } catch (error) {
    console.error("Failed to request indicators code data");
    throw error;
  }
};

export const requestIndicatorDeletion = async (api, indicatorId) => {
  try {
    const response = await api.delete(`v1/indicators/${indicatorId}/delete`);
    return response.data;
  } catch (error) {
    console.error("Failed to delete indicator");
    throw error.response?.data || error;
  }
};

export const requestMyIndicatorDuplication = async (api, indicatorId) => {
  try {
    const response = await api.get(`v1/indicators/my/${indicatorId}/copy`);
    return response.data;
  } catch (error) {
    console.error("Failed to duplicate indicator");
    throw error.response?.data || error;
  }
};
