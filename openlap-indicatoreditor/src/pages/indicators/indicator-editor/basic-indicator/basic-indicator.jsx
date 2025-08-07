import { createContext, useEffect, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid2";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import dayjs from "dayjs";
import { Condition } from "../utils/indicator-data";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";
import Visualization from "./components/visualization/visualization";

export const BasicContext = createContext(undefined);

const SESSION = "session_indicator";

export default function BasicIndicator() {
  const { enqueueSnackbar } = useSnackbar();
  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
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
  const [dataset, setDataset] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? {
          ...JSON.parse(savedState).dataset,
        }
      : {
          myLRSList: [],
          selectedLRSList: [],
        };
  });
  const [filters, setFilters] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? {
          ...JSON.parse(savedState).filters,
        }
      : {
          selectedUserFilter: Condition.only_me,
          selectedTime: {
            from: dayjs().subtract(1, "year").toISOString(),
            until: dayjs().toISOString(),
          },
          activityTypesList: [],
          selectedActivities: [
            // {activityType: {}, actionOnActivityList: [], selectedActionOnActivity: [{}], activities: [{}]}
          ],
        };
  });
  const [analysis, setAnalysis] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? { ...JSON.parse(savedState).analysis }
      : {
          analyticsMethodList: [],
          inputs: [],
          params: [],
          selectedAnalyticsMethod: {
            method: { name: "" },
            mapping: { mapping: [] },
          },
          analyzedData: {},
        };
  });
  const [visualization, setVisualization] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).visualization
      : {
          libraryList: [],
          selectedLibrary: { name: "" },
          typeList: [],
          selectedType: { name: "", chartInputs: [] },
          params: {
            height: 500,
            width: 500,
          },
          mapping: {
            mapping: [],
          },
          previewData: {
            displayCode: [],
            scriptData: {},
          },
        };
  });
  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          dataset: { locked: false, openPanel: true, step: "1" },
          filters: { locked: true, openPanel: false, step: "2" },
          analysis: { locked: true, openPanel: false, step: "3" },
          visualization: { locked: true, openPanel: false, step: "4" },
          finalize: { locked: true, openPanel: false, step: "5" },
        };
  });

  const prevDependencies = useRef({
    lockedStep,
    dataset,
    filters,
    analysis,
    visualization,
    indicator,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session = {
        lockedStep,
        dataset,
        filters,
        analysis,
        visualization,
        indicator,
      };

      sessionStorage.setItem(SESSION, JSON.stringify(session));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.lockedStep !== lockedStep ||
        prevDependencies.current.dataset !== dataset ||
        prevDependencies.current.filters !== filters ||
        prevDependencies.current.analysis !== analysis ||
        prevDependencies.current.visualization !== visualization ||
        prevDependencies.current.indicator !== indicator
      ) {
        enqueueSnackbar("Autosaved", { variant: "success" });
      }

      // Update the previous dependencies to the current ones
      prevDependencies.current = {
        lockedStep,
        dataset,
        filters,
        analysis,
        visualization,
        indicator,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [lockedStep, dataset, filters, analysis, visualization, indicator]);

  return (
    <>
      <BasicContext.Provider
        value={{
          lockedStep,
          dataset,
          filters,
          analysis,
          visualization,
          indicator,
          setLockedStep,
          setDataset,
          setFilters,
          setAnalysis,
          setVisualization,
          setIndicator,
        }}
      >
        <Grid container spacing={2}>
          <Breadcrumbs>
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/"
            >
              Home
            </Link>
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/indicator"
            >
              Indicator Dashboard
            </Link>

            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/indicator/editor"
            >
              Create an Indicator
            </Link>
            <Typography sx={{ color: "text.primary" }}>
              Basic Indicator
            </Typography>
          </Breadcrumbs>
          <Grid size={{ xs: 12 }}>
            <Dataset />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Filters />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Analysis />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Visualization />
          </Grid>
        </Grid>
      </BasicContext.Provider>
    </>
  );
}
