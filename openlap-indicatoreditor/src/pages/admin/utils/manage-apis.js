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

// Admin catalog lists (GET /v1/admin/...). These return all items, including
// disabled ones, and include the `enabled` flag. Keep them separate from the
// editor list helpers above, which intentionally return enabled items only.
export const requestAdminAnalyticsMethods = async (api) => {
  try {
    const response = await api.get("v1/admin/analytics-methods");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch admin analytics methods");
    throw error;
  }
};

export const requestSetAnalyticsMethodStatus = async (api, methodId, enabled) => {
  try {
    const response = await api.patch(
      `v1/admin/analytics-methods/${methodId}/status`,
      { enabled }
    );
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to update analytics method status");
    throw error;
  }
};

// Admin-only user detail (GET /v1/admin/users/{id}). Read-only: safe fields only
// (id, name, email, roles) plus the user's LRS connections via secret-free DTOs —
// never password or LRS credentials. Returns `data` = the AdminUserDetailResponse.
export const requestUserDetail = async (api, id) => {
  try {
    const response = await api.get(`v1/admin/users/${id}`);
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch user detail");
    throw error;
  }
};

// Admin update of a user's basic info (PATCH /v1/admin/users/{id}). Name + email
// only; no password. `payload` = { name, email }. Returns the updated detail.
export const requestUpdateUser = async (api, id, payload) => {
  try {
    const response = await api.patch(`v1/admin/users/${id}`, payload);
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to update user");
    throw error;
  }
};

// Admin replacement of a user's roles (PATCH /v1/admin/users/{id}/roles).
// `roles` = array of RoleType strings. Returns the updated detail.
export const requestUpdateUserRoles = async (api, id, roles) => {
  try {
    const response = await api.patch(`v1/admin/users/${id}/roles`, { roles });
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to update user roles");
    throw error;
  }
};

// Admin-only usage analytics (GET /v1/admin/usage). Read-only: how many saved
// indicators (and distinct users) reference each visualization library, type, and
// analytics method. Returns `data` =
// { visualizationLibraries, visualizationTypes, analyticsMethods },
// each [{ id, indicatorCount, uniqueUserCount }].
export const requestAdminUsage = async (api) => {
  try {
    const response = await api.get("v1/admin/usage");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch admin usage");
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

export const requestAdminVisualizationLibraries = async (api) => {
  try {
    const response = await api.get("v1/admin/visualizations/libraries");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch admin visualization libraries");
    throw error;
  }
};

export const requestSetVisualizationLibraryStatus = async (
  api,
  libraryId,
  enabled
) => {
  try {
    const response = await api.patch(
      `v1/admin/visualizations/libraries/${libraryId}/status`,
      { enabled }
    );
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to update visualization library status");
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

export const requestAdminVisualizationTypes = async (api) => {
  try {
    const response = await api.get("v1/admin/visualizations/types");
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to fetch admin visualization types");
    throw error;
  }
};

export const requestSetVisualizationTypeStatus = async (api, typeId, enabled) => {
  try {
    const response = await api.patch(
      `v1/admin/visualizations/types/${typeId}/status`,
      { enabled }
    );
    return {
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Failed to update visualization type status");
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
