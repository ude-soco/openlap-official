import { createContext, useState } from "react";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";
import Visualization from "./components/visualization/visualization";
import Condition from "./utils/condition";
import dayjs from "dayjs";

export const SelectionContext = createContext();

const SelectionPanel = () => {
  const [indicatorQuery, setIndicatorQuery] = useState({
    lrsStores: [],
    platforms: [],
    activityTypes: [],
    activities: {},
    actionOnActivities: [],
    duration: {
      from: dayjs().subtract(1, "year").toISOString(),
      until: dayjs().toISOString(),
    },
    outputs: [],
    userQueryCondition: Condition.only_me,
  });

  const [analysisRef, setAnalysisRef] = useState({
    analyticsTechniqueId: "",
    analyticsTechniqueParams: [],
    analyticsTechniqueMapping: {
      mappings: [],
    },
  });

  const [lockedStep, setLockedStep] = useState({
    filters: true,
    analysis: false,
    visualization: true,
  });

  return (
    <SelectionContext.Provider
      value={{
        indicatorQuery,
        lockedStep,
        analysisRef,
        setIndicatorQuery,
        setLockedStep,
        setAnalysisRef,
      }}
    >
      <Dataset />
      <Filters />
      <Analysis />
      <Visualization />
    </SelectionContext.Provider>
  );
};

export default SelectionPanel;
