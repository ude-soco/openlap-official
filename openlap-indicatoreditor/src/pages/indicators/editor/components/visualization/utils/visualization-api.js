/* eslint-disable no-useless-catch */
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
      "v1/visualizations/libraries/" + libraryId + "/types",
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
      "v1/visualizations/types/" + typeId + "/inputs",
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch visualization type input data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const requestBasicIndicatorPreview = async (
  api,
  indicatorQuery,
  analysisRef,
  visRef,
) => {
  try {
    const requestBody = {
      indicatorQuery: {
        lrsStores: indicatorQuery.lrsStores,
        platforms: indicatorQuery.platforms,
        activityTypes: indicatorQuery.activityTypes,
        activities: indicatorQuery.activities,
        actionOnActivities: indicatorQuery.actionOnActivities,
        duration: {
          from: indicatorQuery.duration.from,
          until: indicatorQuery.duration.until,
        },
        outputs: indicatorQuery.outputs,
        userQueryCondition: indicatorQuery.userQueryCondition,
      },
      analyticsTechniqueId: analysisRef.analyticsTechniqueId,
      analyticsTechniqueParams: analysisRef.analyticsTechniqueParams,
      analyticsTechniqueMapping: {
        mapping: analysisRef.analyticsTechniqueMapping.mapping,
      },
      visualizationLibraryId: visRef.visualizationLibraryId,
      visualizationTypeId: visRef.visualizationTypeId,
      visualizationParams: {
        ...visRef.visualizationParams,
      },
      visualizationMapping: {
        mapping: visRef.visualizationMapping.mapping,
      },
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
    return {
      message: response.data.message,
      displayCode,
      scriptData,
    };
  } catch (error) {
    throw error;
  }
};

export const requestCompositeIndicatorPreview = async (
  api,
  indicatorRef,
  visRef,
) => {
  try {
    const requestBody = {
      columnToMerge: indicatorRef.columnToMerge,
      indicators: indicatorRef.indicators,
      visualizationLibraryId: visRef.visualizationLibraryId,
      visualizationTypeId: visRef.visualizationTypeId,
      visualizationParams: {
        ...visRef.visualizationParams,
      },
      visualizationMapping: {
        mapping: visRef.visualizationMapping.mapping,
      },
    };
    const response = await api.post(
      "v1/indicators/composite/preview",
      requestBody,
    );

    const unescapedVizCode = decodeURIComponent(response.data.data);
    let displayCode = parse(unescapedVizCode);
    let scriptData;
    try {
      scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
    } catch (error) {
      console.error("Error script code", error);
    }
    return {
      message: response.data.message,
      displayCode,
      scriptData,
    };
  } catch (e) {
    throw e;
  }
};

export const requestMultiLevelIndicatorPreview = async (
  api,
  indicatorRef,
  analysisRef,
  visRef,
) => {
  try {
    const requestBody = {
      indicators: indicatorRef.indicators,
      analyticsTechniqueId: analysisRef.analyticsTechniqueId,
      analyticsTechniqueMapping: {
        mapping: analysisRef.analyticsTechniqueMapping.mapping,
      },
      analyticsTechniqueParams: analysisRef.analyticsTechniqueParams,
      visualizationLibraryId: visRef.visualizationLibraryId,
      visualizationTypeId: visRef.visualizationTypeId,
      visualizationParams: visRef.visualizationParams,
      visualizationMapping: {
        mapping: visRef.visualizationMapping.mapping,
      },
    };
    const response = await api.post(
      "v1/indicators/multilevel/preview",
      requestBody,
    );
    const unescapedVizCode = decodeURIComponent(response.data.data);
    let displayCode = parse(unescapedVizCode);
    let scriptData;
    try {
      scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
    } catch (error) {
      console.error("Error script code", error);
    }
    return {
      message: response.data.message,
      displayCode,
      scriptData,
    };
  } catch (error) {
    throw error;
  }
};
