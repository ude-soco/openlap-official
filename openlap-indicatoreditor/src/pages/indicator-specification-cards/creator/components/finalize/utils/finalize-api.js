export const requestCreateISC = async (
  api,
  requirements,
  dataset,
  visRef,
  lockedStep,
) => {
  try {
    let requestBody = {
      requirements: JSON.stringify(requirements),
      dataset: JSON.stringify(dataset),
      visRef: JSON.stringify(visRef),
      lockedStep: JSON.stringify(lockedStep),
    };
    const response = await api.post("v1/isc/create", requestBody);
    return response.data;
  } catch (error) {
    throw error.response;
  }
};

export const requestUpdateISC = async (
  api,
  id,
  requirements,
  dataset,
  visRef,
  lockedStep,
) => {
  try {
    let requestBody = {
      requirements: JSON.stringify(requirements),
      dataset: JSON.stringify(dataset),
      visRef: JSON.stringify(visRef),
      lockedStep: JSON.stringify(lockedStep),
    };
    const response = await api.put(`v1/isc/${id}`, requestBody);
    return response.data;
  } catch (error) {
    throw error.response;
  }
};
