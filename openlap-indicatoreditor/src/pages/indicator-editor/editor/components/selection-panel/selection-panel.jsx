import { createContext, useState } from "react";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";
import Visualization from "./components/visualization/visualization";
import Condition from "./utils/condition";
import dayjs from 'dayjs';

export const SelectionContext = createContext();

const SelectionPanel = () => {
  const [indicatorQuery, setIndicatorQuery] = useState({
    lrsStores: [],
    platforms: [],
    activityTypes: [],
    activities: {},
    actionOnActivities: [],
    duration: {
      from: dayjs().subtract(1, 'year').toISOString(),
      until: dayjs().toISOString(),
    },
    outputs: [],
    userQueryCondition: Condition.only_me,
  });

  const [lockedStep, setLockedStep] = useState({
    filters: true,
    analysis: true,
    visualization: true,
  });

  console.log(indicatorQuery.duration);
  return (
    <SelectionContext.Provider
      value={{ indicatorQuery, lockedStep, setIndicatorQuery, setLockedStep }}
    >
      <Dataset />
      <Filters />
      <Analysis />
      <Visualization />
    </SelectionContext.Provider>
  );
};

export default SelectionPanel;
