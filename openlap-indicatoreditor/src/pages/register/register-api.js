export const fetchLRSData = async (api) => {
  try {
    const response = await api.get("v1/register/lrs");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch user data", error);
    throw error; // Re-throw the error to handle it in the component
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
  lrsProviderRequest
) => {
  const requestBody = {
    name,
    email,
    password,
    confirmPassword,
    role,
    lrsConsumerRequest,
    lrsProviderRequest,
  };

  try {
    const response = await api.post("v1/register", requestBody);
    return response;
  } catch (e) {
    throw e.response;
  }
};
