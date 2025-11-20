export const requestAllIndicators = async (api, params = {}) => { // takes the api client and params objects containing query parameters(pageNo, Size and sorting)
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`v1/indicators/all?${queryString}`);// Get request to fetch all indicators from the API endpoint "v1/indicators/all"
    return response.data.data; // returns an array of indicators
  } catch (error) {
    console.error("Failed to fetch all indicators list data");
    throw error;
  }
};
