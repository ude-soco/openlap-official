import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid2";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import dayjs from "dayjs";
import { Condition } from "../utils/indicator-data";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";

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
  const [visRef, setVisRef] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
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
  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          dataset: {
            locked: false,
            openPanel: true,
            step: "1",
          },
          filters: {
            locked: true,
            openPanel: false,
            step: "2",
          },
          analysis: {
            locked: true,
            openPanel: false,
            step: "3",
          },
          visualization: {
            locked: true,
            openPanel: false,
            step: "4",
          },
          finalize: {
            locked: true,
            openPanel: false,
            step: "5",
          },
        };
  });

  const prevDependencies = useRef({
    visRef,
    lockedStep,
    indicator,
    dataset,
    filters,
    analysis,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session = {
        visRef,
        indicator,
        lockedStep,
        dataset,
        filters,
        analysis,
      };

      sessionStorage.setItem(SESSION, JSON.stringify(session));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.visRef !== visRef ||
        prevDependencies.current.lockedStep !== lockedStep ||
        prevDependencies.current.indicator !== indicator ||
        prevDependencies.current.dataset !== dataset ||
        prevDependencies.current.filters !== filters ||
        prevDependencies.current.analysis !== analysis
      ) {
        enqueueSnackbar("Autosaved", { variant: "success" });
      }

      // Update the previous dependencies to the current ones
      prevDependencies.current = {
        visRef,
        lockedStep,
        indicator,
        dataset,
        filters,
        analysis,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [visRef, lockedStep, indicator, dataset, filters, analysis]);

  return (
    <>
      <BasicContext.Provider
        value={{
          visRef,
          lockedStep,
          indicator,
          dataset,
          filters,
          analysis,
          setVisRef,
          setLockedStep,
          setIndicator,
          setDataset,
          setFilters,
          setAnalysis,
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
        </Grid>
      </BasicContext.Provider>
    </>
  );
}
