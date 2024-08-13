export const fetchUserLRSList = async (api) => {
  try {
    const response = await api.get("v1/users/my/lrs");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch lrs data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};

export const fetchPlatformList = async (api, lrsStores) => {
  try {
    let request = {
      lrsStores,
    };
    const response = await api.post("v1/statements/platforms", request);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch platform data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
