export const requestUploadAnalyticsJar = async (api, formData) => {
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
    throw error; // Re-throw the error to handle it in the component
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
    console.error("Failed to fetch visualization type data");
    throw error; // Re-throw the error to handle it in the component
  }
};
