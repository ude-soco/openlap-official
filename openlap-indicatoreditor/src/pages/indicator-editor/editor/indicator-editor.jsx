import { Grid, Typography, Divider, useMediaQuery, useTheme } from "@mui/material";
import PreviewPanel from "./components/preview-panel/preview-panel";
import SelectionPanel from "./components/selection-panel/selection-panel";
import { useState, createContext } from "react";
import dayjs from "dayjs";
import Condition from "./components/selection-panel/utils/condition";

export const IndicatorEditorContext = createContext();

const IndicatorEditor = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const [indicator, setIndicator] = useState({
    previewData: {
      displayCode: "",
      scriptData: [],
    },
    indicatorName: "",
    type: "BASIC",
  });

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
    analyzedData: {},
  });

  const [visRef, setVisRef] = useState({
    visualizationLibraryId: "",
    visualizationTypeId: "",
    visualizationParams: {
      height: 400,
      width: 400,
    },
    visualizationMapping: {
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
      title: "Users",
      description: "Selected list of the User(s) specified in User Filter",
    },
  });

  const [lockedStep, setLockedStep] = useState({
    filters: true,
    analysis: true,
    visualization: true,
  });

  return (
    <IndicatorEditorContext.Provider
      value={{
        indicator,
        indicatorQuery,
        lockedStep,
        analysisRef,
        analysisInputMenu,
        visRef,
        setIndicatorQuery,
        setLockedStep,
        setAnalysisRef,
        setAnalysisInputMenu,
        setVisRef,
        setIndicator,
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Indicator Editor</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {isSmallScreen ? (
              <>
                <Grid item xs={12} lg={8}>
                  <SelectionPanel />
                </Grid>
                <Grid item xs={12} lg={4}>
                  <PreviewPanel />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} lg={4}>
                  <PreviewPanel />
                </Grid>
                <Grid item xs={12} lg={8}>
                  <SelectionPanel />
                </Grid>
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </IndicatorEditorContext.Provider>
  );
};

export default IndicatorEditor;
