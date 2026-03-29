import axios from "axios";
import parse from "html-react-parser";

const BackendURL = import.meta.env.VITE_BACKEND_URL || '/api/';

// Create an unauthenticated API client for public endpoints
const publicApiClient = axios.create({
  baseURL: BackendURL,
});

/**
 * Fetches public indicators without authentication
 * @param {Object} params - Query parameters (page, size, sortBy, sortDirection)
 * @returns {Promise<Object>} - Public indicators data
 */
export const fetchPublicIndicators = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await publicApiClient.get(`v1/indicators/public?${queryString}`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch public indicators", error);
    throw error;
  }
};

/**
 * Fetches public indicator full details without authentication
 * @param {string} indicatorId - Indicator ID
 * @returns {Promise<Object>} - Indicator full details
 */
export const fetchPublicIndicatorDetail = async (indicatorId) => {
  try {
    const response = await publicApiClient.get(`v1/indicators/public/${indicatorId}`);
    const unescapedVizCode = decodeURIComponent(
      response.data.data.indicatorCode
    );
    let displayCode = parse(unescapedVizCode);
    let scriptData;
    try {
      scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
    } catch (error) {
      console.error("Error extracting script code", error);
    }

    return {
      indicatorName: response.data.data.name,
      type: response.data.data.type,
      createdOn: response.data.data.createdOn,
      createdBy: response.data.data.createdBy,
      analyticsMethod: response.data.data.analyticsTechnique,
      library: response.data.data.visualizationLibrary,
      chart: response.data.data.visualizationType,
      previewData: {
        displayCode,
        scriptData,
      },
    };
  } catch (error) {
    console.error("Failed to fetch public indicator details", error);
    throw error;
  }
};

/**
 * Previews a public indicator using a specific LRS store and user ID.
 * Calls the public preview endpoint so no authentication is required.
 * @param {string} indicatorId - Indicator ID
 * @param {string} lrsId - LRS store ID from the URL (CourseMapper integration)
 * @param {string} userId - User ID from the URL (CourseMapper integration)
 * @param {string} platform - Platform name from the URL (CourseMapper integration)
 * @returns {Promise<Object>} - Preview chart data { displayCode, scriptData }
 */
export const fetchPublicPreviewWithData = async (
  indicatorId,
  lrsId,
  userId,
  platform
) => {
  try {
    const response = await publicApiClient.post(
      `v1/indicators/public/${indicatorId}/preview`,
      {
        lrsId,
        userId,
        platform: platform || "CourseMapper",
      }
    );
    const unescapedVizCode = decodeURIComponent(response.data.data);
    let displayCode = parse(unescapedVizCode);
    let scriptData;
    try {
      scriptData = displayCode[1].props.dangerouslySetInnerHTML.__html;
    } catch (e) {
      console.error("Error extracting script code from preview response", e);
    }
    return { displayCode, scriptData };
  } catch (error) {
    console.error("Failed to preview indicator with user data", error);
    throw error;
  }
};

/**
 * Fetches public indicator embed code without authentication
 * @param {string} indicatorId - Indicator ID
 * @returns {Promise<Object>} - Indicator embed code
 */
export const fetchPublicIndicatorCode = async (indicatorId) => {
  try {
    const response = await publicApiClient.get(`v1/indicators/public/${indicatorId}/code`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch indicator code", error);
    throw error;
  }
};
