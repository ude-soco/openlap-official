import parse from "html-react-parser";

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

export const fetchPreviewVisualization = async (
  api,
  indicatorQuery,
  analysisRef,
  visRef
) => {
  try {
    const requestBody = {
      indicatorQuery: { ...indicatorQuery },
      ...analysisRef,
      ...visRef,
    };
    const response = await api.post("v1/indicators/basic/preview", requestBody);

    const unescapedVizCode = decodeURIComponent(response.data.data);
    let displayCode = parse(unescapedVizCode);
    let scriptData;
    try {
      scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
    } catch (error) {
      console.error("Error script code", error);
    }
    let previewData = {
      displayCode,
      scriptData,
    };

    return previewData;
  } catch (error) {
    console.error("Failed to fetch analytics technique param data");
    throw error; // Re-throw the error to handle it in the component
  }
};
