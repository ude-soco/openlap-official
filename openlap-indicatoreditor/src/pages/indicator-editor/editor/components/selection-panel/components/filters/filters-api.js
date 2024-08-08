export const fetchActivityTypesList = async (api, lrsStores, platforms) => {
  try {
    let activityTypesRequest = {
      lrsStores,
      platforms,
    };
    const response = await api.post(
      "v1/statements/activity-types",
      activityTypesRequest
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch lrs data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
