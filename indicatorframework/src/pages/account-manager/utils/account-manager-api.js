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

export const updateProfile = async (api, { name }) => {
  try {
    const response = await api.patch("v1/users/my/profile", { name });
    return response.data.data;
  } catch (error) {
    throw error.response?.data ?? error; // ApiErrorResponse envelope when available
  }
};

export const updateEmail = async (api, { newEmail, currentPassword }) => {
  try {
    const response = await api.patch("v1/users/my/email", {
      newEmail,
      currentPassword,
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data ?? error; // ApiErrorResponse envelope when available
  }
};

export const changePassword = async (
  api,
  { currentPassword, newPassword, confirmNewPassword }
) => {
  try {
    const response = await api.patch("v1/users/my/password", {
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data ?? error; // ApiErrorResponse envelope when available
  }
};

export const requestLrsConsumerValidation = async (
  api,
  lrsId,
  uniqueIdentifier
) => {
  const requestBody = {
    lrsId,
    uniqueIdentifier,
  };
  const response = await api.post("v1/users/my/lrs/add", requestBody);
  return response.data;
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

export const requestDeleteLRSStatements = async (api, lrsId) => {
  try {
    const response = await api.delete(`v1/lrs/${lrsId}/statements/confirm`);
    return response.data;
  } catch (error) {
    throw error.response.data; // Re-throw the error to handle it in the component
  }
};

export const requestUpdateLRS = async (
  api,
  lrsId,
  title,
  uniqueIdentifierType
) => {
  try {
    let requestBody = { title, uniqueIdentifierType };
    const response = await api.put(`v1/lrs/${lrsId}/confirm`, requestBody);
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
