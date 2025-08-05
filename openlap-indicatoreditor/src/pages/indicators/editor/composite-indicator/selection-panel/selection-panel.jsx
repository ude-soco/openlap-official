import React, { useContext } from "react";
import SelectIndicator from "./select-indicator.jsx";
import Visualization from "../../components/visualization/visualization.jsx";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { CompositeIndicatorContext } from "../composite-indicator.jsx";
import { requestCompositeIndicatorPreview } from "../../components/visualization/utils/visualization-api.js";
import ColumnMerge from "./components/column-merge.jsx";

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
      <ColumnMerge />
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
