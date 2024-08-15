import React, { useContext } from "react";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { MultiLevelAnalysisIndicatorContext } from "../multi-level-analysis-indicator.jsx";
import SelectIndicator from "./components/select-indicator/select-indicator.jsx";
import ColumnMerge from "./components/column-merge/column-merge.jsx";
import Analysis from "../../components/analysis/analysis.jsx";
import { requestAnalyzedDataForMultiLevelIndicator } from "../../components/analysis/utils/analytics-api.js";
import Visualization from "../../components/visualization/visualization.jsx";
import { requestMultiLevelIndicatorPreview } from "../../components/visualization/utils/visualization-api.js";

const SelectionPanel = () => {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    setLockedStep,
    indicator,
    analysisRef,
    setAnalysisRef,
    visRef,
    setVisRef,
    indicatorRef,
    setIndicator,
  } = useContext(MultiLevelAnalysisIndicatorContext);

  const loadAnalyzedData = async (api, indicatorRef, analysisRef) => {
    try {
      return await requestAnalyzedDataForMultiLevelIndicator(
        api,
        indicatorRef,
        analysisRef,
      );
    } catch (error) {
      throw error;
    }
  };

  const loadPreviewVisualization = async (
    api,
    indicatorRef,
    analysisRef,
    visRef,
  ) => {
    try {
      return await requestMultiLevelIndicatorPreview(
        api,
        indicatorRef,
        analysisRef,
        visRef,
      );
    } catch (error) {
      console.log("Error analyzing the data");
      throw error;
    }
  };

  return (
    <>
      <SelectIndicator />
      <ColumnMerge />
      <Analysis
        lockedStep={lockedStep}
        setLockedStep={setLockedStep}
        indicator={indicator}
        analysisRef={analysisRef}
        setAnalysisRef={setAnalysisRef}
        loadAnalyzedData={() =>
          loadAnalyzedData(api, indicatorRef, analysisRef)
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
          loadPreviewVisualization(api, indicatorRef, analysisRef, visRef)
        }
      />
    </>
  );
};

export default SelectionPanel;
