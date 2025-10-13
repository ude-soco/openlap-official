export const requestUploadAnalyticsJar = async (api, formData) => {
  try {
    const response = await api.post("v1/analytics/methods/upload", formData);
    return response.data.message;
  } catch (error) {
    console.error("Failed to upload jar fil");
    throw error;
  }
};

export const requestAnalyticsMethods = async (api) => {
  try {
    const response = await api.get("v1/analytics/methods");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch analytics methods data");
    throw error;
  }
};

export const requestDeleteAnalyticsMethodById = async (api, analyticsId) => {
  try {
    const response = await api.delete(`v1/analytics/methods/${analyticsId}`);
    return {
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to delete analytics method");
    throw error;
  }
};

export const requestUploadVisualizationJar = async (api, formData) => {
  try {
    const response = await api.post("v1/visualizations/upload", formData);
    return response.data.message;
  } catch (error) {
    console.error("Failed to upload jar fil");
    throw error;
  }
};

export const requestVisualizationLibraries = async (api) => {
  try {
    const response = await api.get("v1/visualizations/libraries");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch visualization library data");
    throw error;
  }
};

export const requestVisualizationTypesByLibraryId = async (api, libraryId) => {
  try {
    const response = await api.get(
      "v1/visualizations/libraries/" + libraryId + "/types"
    );
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch charts");
    throw error;
  }
};

export const requestDeleteVisualizationLibraryById = async (api, libraryId) => {
  try {
    const response = await api.delete(
      `v1/visualizations/libraries/${libraryId}`
    );
    return {
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to delete visualization library");
    throw error;
  }
};

export const requestDeleteVisualizationTypeById = async (api, typeId) => {
  try {
    const response = await api.delete(`v1/visualizations/types/${typeId}`);
    return {
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to delete chart");
    throw error;
  }
};
