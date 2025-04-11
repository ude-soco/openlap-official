export const requestAvailableLrsInOpenLAP = async (api) => {
  try {
    const response = await api.get("v1/register/lrs");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch list of LRS data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};

export const requestUserDetails = async (api) => {
  const response = await api.get("v1/users/my");
  return response.data.data;
};

export const requestLrsConsumerValidation = async (
  api,
  lrsId,
  uniqueIdentifier
) => {
  try {
    let requestBody = {
      lrsId,
      uniqueIdentifier,
    };
    const response = await api.post("v1/users/my/lrs/add", requestBody);
    return response.data;
  } catch (error) {
    throw error; // Re-throw the error to handle it in the component
  }
};

export const requestDeleteLrsConsumer = async (api, lrsConsumerId) => {
  try {
    const response = await api.delete(
      `v1/users/my/lrs/${lrsConsumerId}/delete`
    );
    return response.data;
  } catch (error) {
    throw error.response.data; // Re-throw the error to handle it in the component
  }
};

export const requestDeleteLRSProvider = async (api, lrsId) => {
  try {
    const response = await api.delete(`v1/lrs/${lrsId}/confirm`);
    return response.data;
  } catch (error) {
    throw error.response.data; // Re-throw the error to handle it in the component
  }
};

export const requestCreateLRSProvider = async (
  api,
  title,
  uniqueIdentifierType
) => {
  try {
    let requestBody = {
      title,
      uniqueIdentifierType,
    };
    const response = await api.post(`v1/lrs/create`, requestBody);
    return response.data;
  } catch (error) {
    throw error.response.data; // Re-throw the error to handle it in the component
  }
};
