import Dataset from "./components/dataset/dataset.jsx";
import Filters from "./components/filters/filters.jsx";
import Analysis from "../../components/analysis/analysis.jsx";
import Visualization from "../../components/visualization/visualization.jsx";
import { requestBasicIndicatorPreview } from "../../components/visualization/utils/visualization-api.js";
import { useContext } from "react";
import { BasicIndicatorContext } from "../basic-indicator.jsx";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchAnalyzedData } from "../../components/analysis/utils/analytics-api.js";

const SelectionPanel = () => {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    indicator,
    indicatorQuery,
    analysisRef,
    visRef,
    setLockedStep,
    setAnalysisRef,
    setVisRef,
    setIndicator,
  } = useContext(BasicIndicatorContext);

  const loadPreviewVisualization = async (
    api,
    indicatorQuery,
    analysisRef,
    visRef,
  ) => {
    try {
      return await requestBasicIndicatorPreview(
        api,
        indicatorQuery,
        analysisRef,
        visRef,
      );
    } catch (error) {
      console.log("Error analyzing the data");
      throw error;
    }
  };

  const loadAnalyzedData = async (api, indicatorQuery, analysisRef) => {
    try {
      return await fetchAnalyzedData(api, indicatorQuery, analysisRef);
    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <Dataset />
      <Filters />
      <Analysis
        lockedStep={lockedStep}
        setLockedStep={setLockedStep}
        indicator={indicator}
        analysisRef={analysisRef}
        setAnalysisRef={setAnalysisRef}
        loadAnalyzedData={() =>
          loadAnalyzedData(api, indicatorQuery, analysisRef)
        }
      />
      <Visualization
        lockedStep={lockedStep}
        setLockedStep={setLockedStep}
        visRef={visRef}
        setVisRef={setVisRef}
        analyzedData={analysisRef.analyzedData}
        setIndicator={setIndicator}
        handlePreview={() =>
          loadPreviewVisualization(api, indicatorQuery, analysisRef, visRef)
        }
      />
    </>
  );
};

export default SelectionPanel;
