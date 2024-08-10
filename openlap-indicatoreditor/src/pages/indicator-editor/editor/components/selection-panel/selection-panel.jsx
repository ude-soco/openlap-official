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
      mapping: [],
    },
  });

  const [analysisInputMenu, setAnalysisInputMenu] = useState({
    activities: {
      id: undefined,
      type: "Text",
      required: true,
      title: "Activities",
      description:
        "Selected list of all the Activities specified in Activity Filter. " +
        'E.g. courses that are selected in Activity name section are "Learning Analytics", "Data Mining" etc.',
      options: [],
    },
    activityTypes: {
      id: "statement.object.definition.type",
      type: "Text",
      required: true,
      title: "Activity Types",
      description: "Types of activities",
    },
    actionOnActivities: {
      id: undefined,
      type: "Text",
      required: true,
      title: "Actions",
      description:
        "Selected list of actions performed on the activity(ies). E.g. a list of actions that were " +
        'performed on a course such as "viewed", "enrolled" etc.',
      options: [],
    },
    platforms: {
      id: "statement.context.platform",
      type: "Text",
      required: true,
      title: "Platforms",
      description:
        'Selected list of sources specified in Dataset such as "Moodle" etc.',
    },
    user: {
      id: "statement.actor.account.name",
      type: "Text",
      required: true,
      title: "User",
      description: "Selected list of the User(s) specified in User Filter",
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
        analysisInputMenu,
        setIndicatorQuery,
        setLockedStep,
        setAnalysisRef,
        setAnalysisInputMenu,
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
