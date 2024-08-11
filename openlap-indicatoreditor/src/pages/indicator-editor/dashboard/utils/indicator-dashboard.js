export const fetchMyIndicators = async (api, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`v1/indicators/my?${queryString}`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch user's indicators list data");
    console.log(error);
    throw error; // Re-throw the error to handle it in the component
  }
};
