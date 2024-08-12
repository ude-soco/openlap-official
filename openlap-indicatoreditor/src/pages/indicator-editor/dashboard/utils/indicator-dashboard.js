import parse from "html-react-parser";

export const fetchMyIndicators = async (api, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`v1/indicators/my?${queryString}`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch user's indicators list data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchIndicatorFullDetail = async (api, indicatorId) => {
  try {
    const response = await api.get(`v1/indicators/${indicatorId}`);
    const unescapedVizCode = decodeURIComponent(
      response.data.data.indicatorCode
    );
    let displayCode = parse(unescapedVizCode);
    let scriptData;
    try {
      scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
    } catch (error) {
      console.error("Error script code", error);
    }

    let updatedResponse = {
      ...response.data.data,
      indicatorCode: {
        displayCode,
        scriptData,
      },
    };
    return updatedResponse;
  } catch (error) {
    console.error("Failed to fetch indicators code data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchRequestIndicatorCode = async (api, indicatorId) => {
  try {
    const response = await api.get(`v1/indicators/${indicatorId}/code`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch indicators code data");
    throw error; // Re-throw the error to handle it in the component
  }
};
