export const requestMyISCs = async (api, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`v1/isc/my?${queryString}`);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};
