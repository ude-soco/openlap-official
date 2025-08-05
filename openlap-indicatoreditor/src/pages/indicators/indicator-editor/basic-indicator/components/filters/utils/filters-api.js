export const fetchActivityTypesList = async (api, lrsStores) => {
  try {
    const response = await api.post("v1/statements/activity-types", {
      lrsStores,
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch activity types data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchActivitiesList = async (
  api,
  myLRSStoreList,
  activityTypesIdList,
  actionsIdList
) => {
  try {
    let activitiesRequest = {
      lrsStores: myLRSStoreList,
      activityTypes: [activityTypesIdList],
      actionOnActivities: actionsIdList,
    };
    const response = await api.post(
      "v1/statements/activities",
      activitiesRequest
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch activities data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchActionOnActivitiesList = async (
  api,
  myLRSStoreList,
  activityTypesIdList
) => {
  try {
    let actionOnActivitiesRequest = {
      lrsStores: myLRSStoreList,
      activityTypes: [activityTypesIdList],
    };
    const response = await api.post(
      "v1/statements/actions",
      actionOnActivitiesRequest
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch action on activites data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
