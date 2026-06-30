export const requestUploadAnalyticsJar = async (api, formData) => {
  try {
    const response = await api.post("v1/analytics/methods/upload", formData);
    return response.data.message;
  } catch (error) {
    console.error("Failed to upload jar fil");
    throw error;
  }
};

export const requestAnalyticsMethods = async (api) => {
  try {
    const response = await api.get("v1/analytics/methods");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch analytics methods data");
    throw error;
  }
};

// Per-method inputs and parameters (GET /v1/analytics/methods/input-params/{id}).
// Loaded on demand (it resolves the method's class from its JAR server-side), so
// the admin page fetches it lazily per row rather than for the whole list.
// Returns `data` = { inputs: [...], params: [...] }.
export const requestAnalyticsMethodInputParams = async (api, methodId) => {
  try {
    const response = await api.get(
      `v1/analytics/methods/input-params/${methodId}`
    );
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch analytics method inputs/params");
    throw error;
  }
};

export const requestDeleteAnalyticsMethodById = async (api, analyticsId) => {
  try {
    const response = await api.delete(`v1/analytics/methods/${analyticsId}`);
    return {
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to delete analytics method");
    throw error;
  }
};

export const requestUploadVisualizationJar = async (api, formData) => {
  try {
    const response = await api.post("v1/visualizations/upload", formData);
    return response.data.message;
  } catch (error) {
    console.error("Failed to upload jar fil");
    throw error;
  }
};

export const requestVisualizationLibraries = async (api) => {
  try {
    const response = await api.get("v1/visualizations/libraries");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch visualization library data");
    throw error;
  }
};

export const requestVisualizationTypes = async (api) => {
  try {
    const response = await api.get("v1/visualizations/types");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch visualization types");
    throw error;
  }
};

export const requestVisualizationTypesByLibraryId = async (api, libraryId) => {
  try {
    const response = await api.get(
      "v1/visualizations/libraries/" + libraryId + "/types"
    );
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch charts");
    throw error;
  }
};

export const requestDeleteVisualizationLibraryById = async (api, libraryId) => {
  try {
    const response = await api.delete(
      `v1/visualizations/libraries/${libraryId}`
    );
    return {
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to delete visualization library");
    throw error;
  }
};

export const requestDeleteVisualizationTypeById = async (api, typeId) => {
  try {
    const response = await api.delete(`v1/visualizations/types/${typeId}`);
    return {
      message: response.data.message,
    };
  } catch (error) {
    console.error("Failed to delete chart");
    throw error;
  }
};

// Admin-only, read-only user listing (GET /v1/users). Returns the Spring Page
// envelope in `data` (content[], totalElements, totalPages, number, size, ...).
// The endpoint exposes safe fields only (id, name, email, roles).
export const requestUsers = async (api, page = 0, size = 10) => {
  try {
    const response = await api.get("v1/users", { params: { page, size } });
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch users");
    throw error;
  }
};
