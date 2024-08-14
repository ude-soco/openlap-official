import React, { useContext } from "react";
import SelectIndicator from "./components/select-indicator/select-indicator.jsx";
import Visualization from "../../basic-indicator/selection-panel/components/visualization/visualization.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { CompositeIndicatorContext } from "../composite-indicator.jsx";
import { requestCompositeIndicatorPreview } from "../../basic-indicator/selection-panel/components/visualization/utils/visualization-api.js";

const SelectionPanel = () => {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    setLockedStep,
    visRef,
    setVisRef,
    indicatorRef,
    setIndicator,
  } = useContext(CompositeIndicatorContext);

  const loadPreviewVisualization = async () => {
    try {
      return await requestCompositeIndicatorPreview(api, indicatorRef, visRef);
    } catch (error) {
      console.log("Error analyzing the data");
      throw error;
    }
  };

  return (
    <>
      <SelectIndicator />
      <Visualization
        lockedStep={lockedStep}
        setLockedStep={setLockedStep}
        visRef={visRef}
        setVisRef={setVisRef}
        analyzedData={indicatorRef.analyzedData}
        setIndicator={setIndicator}
        handlePreview={() =>
          loadPreviewVisualization(api, indicatorRef, visRef)
        }
      />
    </>
  );
};

export default SelectionPanel;
