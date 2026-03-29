export const PENDING_PERSONALIZED_SAVE_KEY = "pendingPersonalizedSave";

const DEFAULT_INDICATOR_NAME = "My Personalized Indicator";

const buildIndicatorActivities = (selectedActivities = []) => {
  const activityMap = {};

  selectedActivities.forEach((item) => {
    (item?.selectedActivityList || []).forEach((activity) => {
      const queryId = activity?.queryId;
      const activityId = activity?.id;
      if (!queryId || !activityId) return;

      if (!activityMap[queryId]) {
        activityMap[queryId] = new Set();
      }
      activityMap[queryId].add(activityId);
    });
  });

  const activities = {};
  Object.keys(activityMap).forEach((key) => {
    activities[key] = Array.from(activityMap[key]);
  });

  return activities;
};

const buildPersonalizedIndicatorQuery = (configuration, userId, lrsId) => {
  const selectedActivities = configuration?.filters?.selectedActivities || [];

  return {
    lrsStores: [
      {
        ...(configuration?.dataset?.selectedLRSList?.[0] || {}),
        id: lrsId,
        userId,
      },
    ],
    activityTypes: selectedActivities
      .map((item) => item?.selectedActivityType?.id)
      .filter(Boolean),
    actionOnActivities: selectedActivities.flatMap(
      (item) => item?.selectedActionList?.map((action) => action.id) || []
    ),
    activities: buildIndicatorActivities(selectedActivities),
    duration: {
      from: configuration?.filters?.selectedTime?.from || null,
      until: configuration?.filters?.selectedTime?.until || null,
    },
    outputs:
      configuration?.analysis?.selectedAnalyticsMethod?.mapping?.mapping
        ?.map((map) => map?.outputPort?.id)
        .filter(Boolean) || [],
    userQueryCondition: configuration?.filters?.selectedUserFilter || "ONLY_ME",
  };
};

const buildPersonalizedConfiguration = (baseConfiguration, pendingSave) => {
  const personalizedName =
    baseConfiguration?.indicator?.indicatorName ||
    pendingSave?.indicatorConfiguration?.indicatorName ||
    DEFAULT_INDICATOR_NAME;

  return {
    ...baseConfiguration,
    indicator: {
      ...(baseConfiguration?.indicator || {}),
      indicatorName: personalizedName,
    },
    dataset: {
      ...(baseConfiguration?.dataset || {}),
      selectedLRSList: [
        {
          ...(baseConfiguration?.dataset?.selectedLRSList?.[0] || {}),
          id: pendingSave.lrsId,
          userId: pendingSave.userId,
        },
      ],
    },
    filters: {
      ...(baseConfiguration?.filters || {}),
      selectedUserFilter: "ONLY_ME",
      userId: pendingSave.userId,
    },
  };
};

export const createPendingPersonalizedSave = ({
  indicatorId,
  indicatorName,
  indicatorType,
  userId,
  lrsId,
  platform,
}) => ({
  id: indicatorId,
  indicatorConfiguration: {
    indicatorName,
    type: indicatorType,
  },
  userId,
  lrsId,
  platform,
  intent: "SAVE_PERSONALIZED_INDICATOR",
});

export const buildPersonalizedCreatePayload = ({ baseConfiguration, pendingSave }) => {
  const personalizedConfiguration = buildPersonalizedConfiguration(
    baseConfiguration,
    pendingSave
  );

  return {
    name: personalizedConfiguration?.indicator?.indicatorName || DEFAULT_INDICATOR_NAME,
    platform: pendingSave?.platform || "CourseMapper",
    indicatorType: personalizedConfiguration?.indicator?.type,
    indicatorQuery: buildPersonalizedIndicatorQuery(
      personalizedConfiguration,
      pendingSave.userId,
      pendingSave.lrsId
    ),
    analyticsTechniqueId:
      personalizedConfiguration?.analysis?.selectedAnalyticsMethod?.method?.id,
    analyticsTechniqueParams: personalizedConfiguration?.analysis?.params || [],
    analyticsTechniqueMapping: {
      mapping:
        personalizedConfiguration?.analysis?.selectedAnalyticsMethod?.mapping
          ?.mapping || [],
    },
    visualizationLibraryId:
      personalizedConfiguration?.visualization?.selectedLibrary?.id,
    visualizationTypeId:
      personalizedConfiguration?.visualization?.selectedType?.id,
    visualizationParams: {
      ...(personalizedConfiguration?.visualization?.params || {}),
    },
    visualizationMapping: {
      mapping: personalizedConfiguration?.visualization?.mapping?.mapping || [],
    },
    configuration: JSON.stringify(personalizedConfiguration),
  };
};

export const buildCreatePayloadWithIndicatorName = (
  preparedPayload,
  indicatorName
) => {
  const baseConfiguration = JSON.parse(preparedPayload?.configuration || "{}");
  const updatedConfiguration = {
    ...baseConfiguration,
    indicator: {
      ...(baseConfiguration?.indicator || {}),
      indicatorName,
    },
  };

  return {
    ...preparedPayload,
    name: indicatorName,
    configuration: JSON.stringify(updatedConfiguration),
  };
};
