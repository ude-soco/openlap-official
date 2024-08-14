import Dataset from "./components/dataset/dataset.jsx";
import Filters from "./components/filters/filters.jsx";
import Analysis from "./components/analysis/analysis.jsx";
import Visualization from "./components/visualization/visualization.jsx";
import { requestBasicIndicatorPreview } from "./components/visualization/utils/visualization-api.js";
import { useContext } from "react";
import { BasicIndicatorContext } from "../basic-indicator.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";

const SelectionPanel = () => {
  const { api } = useContext(AuthContext);
  const {
    indicatorQuery,
    visRef,
    analysisRef,
    lockedStep,
    setLockedStep,
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

  return (
    <>
      <Dataset />
      <Filters />
      <Analysis />
      <Visualization
        lockedStep={lockedStep}
        setLockedStep={setLockedStep}
        visRef={visRef}
        setVisRef={setVisRef}
        analyzedData={analysisRef.analyzedData}
        setIndicator={setIndicator}
        handlePreview={loadPreviewVisualization(
          api,
          indicatorQuery,
          analysisRef,
          visRef,
        )}
      />
    </>
  );
};

export default SelectionPanel;
