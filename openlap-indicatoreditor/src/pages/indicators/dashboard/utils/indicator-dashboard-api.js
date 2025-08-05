import parse from "html-react-parser";

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

    return {
      ...response.data.data,
      indicatorCode: {
        displayCode,
        scriptData,
      },
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
}

export const requestIndicatorDeletion = async (api, indicatorId) => {
  try {
    const response = await api.delete(`v1/indicators/${indicatorId}/delete`);
    return response.data;
  } catch (error) {
    console.error("Failed to delete indicator");
    throw error.response.data;
  }
}
