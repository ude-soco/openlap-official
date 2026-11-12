function buildActivities(filters) {
  const result = {};
  filters.selectedActivities.forEach((item) => {
    item.selectedActivityList.forEach((activity) => {
      const { queryId, id } = activity;
      if (!result[queryId]) {
        result[queryId] = new Set(); // * Removes duplicates if exists
      }
      result[queryId].add(id);
    });
  });
  Object.keys(result).forEach((key) => {
    result[key] = Array.from(result[key]);
  });

  return result;
}

export function buildIndicatorQuery(dataset, filters, analysis) {
  return {
    lrsStores: dataset.selectedLRSList,
    activityTypes: filters.selectedActivities.map(
      (item) => item.selectedActivityType.id
    ),
    actionOnActivities: filters.selectedActivities.flatMap((item) =>
      item.selectedActionList.map((action) => action.id)
    ),
    activities: buildActivities(filters),
    duration: {
      from: filters.selectedTime.from,
      until: filters.selectedTime.until,
    },
    outputs: analysis.selectedAnalyticsMethod.mapping.mapping.map(
      (map) => map.outputPort.id
    ),
    userQueryCondition: filters.selectedUserFilter,
  };
}

export function buildAnalysisRef(analysis) {
  return {
    analyticsTechniqueId: analysis.selectedAnalyticsMethod.method.id,
    analyticsTechniqueParams: analysis.params,
    analyticsTechniqueMapping: {
      mapping: analysis.selectedAnalyticsMethod.mapping.mapping,
    },
  };
}

export function buildVisRef(visualization) {
  return {
    visualizationLibraryId: visualization.selectedLibrary.id,
    visualizationTypeId: visualization.selectedType.id,
    visualizationParams: { ...visualization.params },
    visualizationMapping: { mapping: visualization.mapping.mapping },
  };
}
