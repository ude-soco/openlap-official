import {
  Grid,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PreviewPanel from "./components/preview-panel/preview-panel";
import SelectionPanel from "./components/selection-panel/selection-panel";
import { useState, createContext, useEffect, useRef } from "react";
import dayjs from "dayjs";
import Condition from "./components/selection-panel/utils/condition";
import { useSnackbar } from "notistack";

export const IndicatorEditorContext = createContext();

const IndicatorEditor = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const { enqueueSnackbar } = useSnackbar();

  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).indicator
      : {
          previewData: {
            displayCode: "",
            scriptData: [],
          },
          indicatorName: "",
          type: "BASIC",
        };
  });

  const [indicatorQuery, setIndicatorQuery] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).indicatorQuery
      : {
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
        };
  });

  const [analysisRef, setAnalysisRef] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).analysisRef
      : {
          analyticsTechniqueId: "",
          analyticsTechniqueParams: [],
          analyticsTechniqueMapping: {
            mapping: [],
          },
          analyzedData: {},
        };
  });

  const [visRef, setVisRef] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).visRef
      : {
          visualizationLibraryId: "",
          visualizationTypeId: "",
          visualizationParams: {
            height: 400,
            width: 400,
          },
          visualizationMapping: {
            mapping: [],
          },
        };
  });

  const [analysisInputMenu, setAnalysisInputMenu] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).analysisInputMenu
      : {
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
            description:
              "Selected list of the User(s) specified in User Filter",
          },
        };
  });

  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          filter: {
            locked: true,
            openPanel: false,
          },
          analysis: {
            locked: true,
            openPanel: false,
          },
          visualization: {
            locked: true,
            openPanel: false,
          },
        };
  });

  const prevDependencies = useRef({
    indicatorQuery,
    analysisRef,
    visRef,
    analysisInputMenu,
    lockedStep,
    indicator,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session = {
        indicatorQuery,
        analysisRef,
        visRef,
        analysisInputMenu,
        indicator,
        lockedStep,
      };

      sessionStorage.setItem("session", JSON.stringify(session));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.indicatorQuery !== indicatorQuery ||
        prevDependencies.current.analysisRef !== analysisRef ||
        prevDependencies.current.visRef !== visRef ||
        prevDependencies.current.analysisInputMenu !== analysisInputMenu ||
        prevDependencies.current.lockedStep !== lockedStep ||
        prevDependencies.current.indicator !== indicator
      ) {
        enqueueSnackbar("Autosaved", { variant: "success" });
      }

      // Update the previous dependencies to the current ones
      prevDependencies.current = {
        indicatorQuery,
        analysisRef,
        visRef,
        analysisInputMenu,
        lockedStep,
        indicator,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [indicatorQuery, analysisRef, visRef, analysisInputMenu, lockedStep]);

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
