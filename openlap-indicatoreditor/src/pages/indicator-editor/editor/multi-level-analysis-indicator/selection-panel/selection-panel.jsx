import React, { useContext } from "react";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { MultiLevelAnalysisIndicatorContext } from "../multi-level-analysis-indicator.jsx";
import SelectIndicator from "./components/select-indicator/select-indicator.jsx";
import ColumnMerge from "./components/column-merge/column-merge.jsx";
import Analysis from "../../components/analysis/analysis.jsx";

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
        loadAnalyzedData={
          () => console.log("preview")
          // loadAnalyzedData={() => loadAnalyzedData(api, indicatorQuery, analysisRef)
        }
      />
    </>
  );
};

export default SelectionPanel;
