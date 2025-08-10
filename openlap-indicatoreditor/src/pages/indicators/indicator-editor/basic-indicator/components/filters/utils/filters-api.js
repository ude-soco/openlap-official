export const fetchActivitiesList = async (
  api,
  myLRSStoreList,
  activityTypesIdList,
  actionsIdList
) => {
  try {
    let requestBody = {
      lrsStores: myLRSStoreList,
      activityTypes: [activityTypesIdList],
      actionOnActivities: actionsIdList,
    };
    const response = await api.post("v1/statements/activities", requestBody);
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
    let requestBody = {
      lrsStores: myLRSStoreList,
      activityTypes: [activityTypesIdList],
    };
    const response = await api.post("v1/statements/actions", requestBody);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch action on activites data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
