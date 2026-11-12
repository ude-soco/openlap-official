export const requestMyISCs = async (api, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`v1/isc/my?${queryString}`);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

export const requestISCDetails = async (api, iscId) => {
  try {
    const response = await api.get(`v1/isc/${iscId}`);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

export const requestDeleteISC = async (api, iscId) => {
  try {
    const response = await api.delete(`v1/isc/${iscId}`);
    return response.data.message;
  } catch (error) {
    throw error;
  }
};
