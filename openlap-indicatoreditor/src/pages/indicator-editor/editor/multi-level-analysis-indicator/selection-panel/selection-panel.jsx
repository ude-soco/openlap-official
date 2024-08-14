import React, { useContext } from "react";
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { MultiLevelAnalysisIndicatorContext } from "../multi-level-analysis-indicator.jsx";
import SelectIndicator from "./components/select-indicator/select-indicator.jsx";

const SelectionPanel = () => {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    setLockedStep,
    visRef,
    setVisRef,
    indicatorRef,
    setIndicator,
  } = useContext(MultiLevelAnalysisIndicatorContext);

  return (
    <>
      <SelectIndicator />
    </>
  );
};

export default SelectionPanel;
