export const requestAvailableLrsList = async (api) => {
  try {
    const response = await api.get("v1/register/lrs");
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (
  api,
  name,
  email,
  password,
  confirmPassword,
  role,
  lrsConsumerRequest,
  lrsProviderRequest,
) => {
  try {
    return await api.post("v1/register", {
      name,
      email,
      password,
      confirmPassword,
      role,
      lrsConsumerRequest,
      lrsProviderRequest,
    });
  } catch (error) {
    throw error.response;
  }
};
