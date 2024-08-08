import axios from "axios";

export const fetchUserData = async (api) => {
  try {
    const response = await api.get("v1/users/my");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch user data", error);
    throw error; // Re-throw the error to handle it in the component
  }
};
