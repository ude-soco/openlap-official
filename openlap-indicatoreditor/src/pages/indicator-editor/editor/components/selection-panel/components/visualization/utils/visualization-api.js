export const fetchVisualizationLibrary = async (api) => {
  try {
    const response = await api.get("v1/visualizations/libraries");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch visualization library data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchVisualizationTypeByLibraryId = async (api, libraryId) => {
  try {
    const response = await api.get(
      "v1/visualizations/libraries/" + libraryId + "/types"
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch visualization type data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchVisualizationTypeInputs = async (api, typeId) => {
  try {
    const response = await api.get(
      "v1/visualizations/types/" + typeId + "/inputs"
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch visualization type input data");
    throw error; // Re-throw the error to handle it in the component
  }
};
