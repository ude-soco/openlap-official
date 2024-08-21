export const requestAllGoals = async (api) => {
  try {
    const response = await api.get("v1/analytics/goals");
    return response.data.data;
  } catch (error) {
    throw error.response;
  }
};
