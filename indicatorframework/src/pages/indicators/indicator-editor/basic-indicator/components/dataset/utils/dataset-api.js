export const fetchUserLRSList = async (api) => {
  try {
    const response = await api.get("v1/users/my/lrs");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch lrs data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchActivityTypesList = async (api, lrsStores) => {
  const requestBody = lrsStores.map((store) => ({
    lrsId: store.lrsId,
    uniqueIdentifier: store.uniqueIdentifier,
  }));
  try {
    const response = await api.post("v1/statements/activity-types", {
      lrsStores: requestBody,
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch activity types data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
