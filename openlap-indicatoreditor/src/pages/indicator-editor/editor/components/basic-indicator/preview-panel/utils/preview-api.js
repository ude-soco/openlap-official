export const fetchCreateBasicIndicator = async (
  api,
  indicatorQuery,
  analysisRef,
  visRef,
  indicator
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
