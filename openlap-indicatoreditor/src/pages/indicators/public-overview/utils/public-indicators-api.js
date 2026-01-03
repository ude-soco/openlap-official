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
