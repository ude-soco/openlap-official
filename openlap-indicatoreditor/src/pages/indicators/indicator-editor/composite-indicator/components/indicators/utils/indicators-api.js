import parse from "html-react-parser";

export const requestAllMyIndicatorsWithCode = async (api, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(
      `v1/indicators/my/indicator-with-code?${queryString}`
    );
    let newContentList = [];
    for (let i = 0; i < response.data.data.content.length; i++) {
      let tempContent = response.data.data.content[i];
      const unescapedVizCode = decodeURIComponent(tempContent.indicatorCode);
      let displayCode = parse(unescapedVizCode);
      let scriptData;
      try {
        scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
      } catch (error) {
        console.error("Error script code", error);
      }
      let newContent = {
        id: tempContent.id,
        createdBy: tempContent.createdBy,
        createdOn: tempContent.createdOn,
        name: tempContent.name,
        type: tempContent.type,
        analyticsMethod: tempContent.analyticsTechnique,
        previewData: {
          displayCode,
          scriptData,
        },
      };
      newContentList.push(newContent);
    }

    return {
      ...response.data.data,
      content: newContentList,
    };
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error;
  }
};

export const requestCompatibleIndicators = async (
  api,
  indicatorId,
  params = {}
) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(
      `v1/indicators/${indicatorId}/compatible?${queryString}`
    );
    let newIndicatorList = [];
    for (let i = 0; i < response.data.data.content[0].indicators.length; i++) {
      let tempContent = response.data.data.content[0].indicators[i];
      const unescapedVizCode = decodeURIComponent(tempContent.indicatorCode);
      let displayCode = parse(unescapedVizCode);
      let scriptData;
      try {
        scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
      } catch (error) {
        console.error("Error script code", error);
      }
      let newIndicator = {
        ...tempContent,
        displayCode,
        scriptData,
      };
      newIndicatorList.push(newIndicator);
    }

    return {
      ...response.data.data,
      content: [
        {
          ...response.data.data.content[0],
          indicators: newIndicatorList,
        },
      ],
    };
  } catch (error) {
    console.error("Failed to request indicator details");
    throw error;
  }
};
