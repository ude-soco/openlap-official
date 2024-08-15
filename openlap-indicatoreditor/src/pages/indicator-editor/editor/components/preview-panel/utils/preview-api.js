export const requestCreateBasicIndicator = async (
  api,
  indicatorQuery,
  analysisRef,
  visRef,
  indicator,
) => {
  try {
    const requestBody = {
      name: indicator.indicatorName,
      indicatorType: indicator.type,
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
    const response = await api.post("v1/indicators/basic/create", requestBody);

    return response.data;
  } catch (error) {
    console.error("Failed to fetch analytics technique param data");
    throw error; // Re-throw the error to handle it in the component
  }
};

export const requestCreateCompositeIndicator = async (
  api,
  indicator,
  indicatorRef,
  visRef,
) => {
  try {
    const requestBody = {
      name: indicator.indicatorName,
      indicatorType: indicator.type,
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
      "v1/indicators/composite/create",
      requestBody,
    );

    return response.data;
  } catch (e) {
    throw e;
  }
};

export const requestCreateMultiLevelIndicatorIndicator = async (
  api,
  indicator,
  indicatorRef,
  analysisRef,
  visRef,
) => {
  try {
    const requestBody = {
      name: indicator.indicatorName,
      indicatorType: indicator.type,
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
      "v1/indicators/multilevel/create",
      requestBody,
    );

    return response.data;
  } catch (e) {
    throw e;
  }
};
