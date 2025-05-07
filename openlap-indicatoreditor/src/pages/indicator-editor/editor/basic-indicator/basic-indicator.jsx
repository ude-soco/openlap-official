import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Divider, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import SelectionPanel from "./selection-panel/selection-panel.jsx";
import dayjs from "dayjs";
import Condition from "./selection-panel/utils/condition.js";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { requestCreateBasicIndicator } from "../components/preview-panel/utils/preview-api.js";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";

export const BasicIndicatorContext = createContext(undefined);

const BasicIndicator = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [generate, setGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chartConfiguration, setChartConfiguration] = useState(null);
  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem("session");
    return savedState
      ? {
          ...JSON.parse(savedState).indicator,
          previewData: {
            displayCode: [],
            scriptData: "",
          },
        }
      : {
          previewData: {
            displayCode: [],
            scriptData: "",
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
            height: 500,
            width: 500,
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
          // user: {
          //   id: "statement.actor.account.name",
          //   type: "Text",
          //   required: true,
          //   title: "Users",
          //   description:
          //     "Selected list of the User(s) specified in User Filter",
          // },
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
          finalize: {
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
    }, 4000);

    return () => clearInterval(intervalId);
  }, [
    indicatorQuery,
    analysisRef,
    visRef,
    analysisInputMenu,
    lockedStep,
    indicator,
  ]);

  const handleSaveNewBasicIndicator = () => {
    const loadCreateBasicIndicator = async (
      api,
      indicatorQuery,
      analysisRef,
      visRef,
      indicator
    ) => {
      try {
        return await requestCreateBasicIndicator(
          api,
          indicatorQuery,
          analysisRef,
          visRef,
          indicator
        );
      } catch (error) {
        console.log("Error analyzing the data");
      }
    };

    loadCreateBasicIndicator(
      api,
      indicatorQuery,
      analysisRef,
      visRef,
      indicator
    ).then((response) => {
      enqueueSnackbar(response.message, {
        variant: "success",
      });
      navigate("/indicator");
      clearSession();
    });
  };

  const clearSession = () => {
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("dataset");
    sessionStorage.removeItem("filters");
    sessionStorage.removeItem("analysis");
    sessionStorage.removeItem("visualization");
  };

  return (
    <BasicIndicatorContext.Provider
      value={{
        indicatorQuery,
        lockedStep,
        analysisRef,
        analysisInputMenu,
        visRef,
        indicator,
        generate,
        loading,
        chartConfiguration,
        setIndicatorQuery,
        setLockedStep,
        setAnalysisRef,
        setAnalysisInputMenu,
        setVisRef,
        setIndicator,
        setGenerate,
        setLoading,
        setChartConfiguration,
        handleSaveNewBasicIndicator,
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container alignItems="center">
            <Grid item>
              <Grid container alignItems="center">
                <Grid item>
                  <Tooltip
                    arrow
                    title={
                      <Typography variant="body2">
                        Back to Indicator Editor
                      </Typography>
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={() => navigate("/indicator/editor")}
                    >
                      <ArrowBack />
                    </IconButton>
                  </Tooltip>
                </Grid>
                <Grid item>
                  <Typography>Back</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs>
              <Typography align="center">Basic Indicator Editor</Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <SelectionPanel />
        </Grid>
      </Grid>
    </BasicIndicatorContext.Provider>
  );
};

export default BasicIndicator;
