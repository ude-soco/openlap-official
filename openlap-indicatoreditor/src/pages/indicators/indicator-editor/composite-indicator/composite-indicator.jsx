import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import Grid from "@mui/material/Grid2";
import { useSnackbar } from "notistack";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import Indicators from "./components/indicators/indicators";

export const CompositeContext = createContext(undefined);

const CompositeIndicator = () => {
  const { api, SESSION_INDICATOR } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).indicator }
      : {
          myIndicators: {
            params: { page: 0 },
            list: { content: [], totalPages: 1 },
          },
          selectedIndicators: [],
          indicatorName: "",
          type: "COMPOSITE",
        };
  });
  const [analysis, setAnalysis] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).analysis }
      : {
          columnToMerge: {},
          indicators: [],
          analyzedData: {},
        };
  });
  const [visualization, setVisualization] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).visualization }
      : {
          libraryList: [],
          selectedLibrary: { id: "", name: "" },
          typeList: [],
          selectedType: { id: "", name: "", chartInputs: [] },
          inputs: [],
          params: { height: 500, width: 500 },
          mapping: { mapping: [] },
          previewData: { displayCode: [], scriptData: {} },
        };
  });
  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).lockedStep }
      : {
          indicators: { locked: false, openPanel: true, step: "1" },
          analysis: { locked: true, openPanel: false, step: "2" },
          visualization: { locked: true, openPanel: false, step: "3" },
        };
  });

  const prevDependencies = useRef({
    lockedStep,
    analysis,
    visualization,
    indicator,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session = {
        lockedStep,
        analysis,
        visualization,
        indicator,
      };

      sessionStorage.setItem(SESSION_INDICATOR, JSON.stringify(session));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.lockedStep !== lockedStep ||
        prevDependencies.current.analysis !== analysis ||
        prevDependencies.current.visualization !== visualization ||
        prevDependencies.current.indicator !== indicator
      ) {
        enqueueSnackbar("Autosaved", { variant: "success" });
      }

      prevDependencies.current = {
        lockedStep,
        analysis,
        visualization,
        indicator,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [lockedStep, analysis, visualization, indicator]);

  return (
    <CompositeContext.Provider
      value={{
        lockedStep,
        analysis,
        visualization,
        indicator,
        setLockedStep,
        setAnalysis,
        setVisualization,
        setIndicator,
      }}
    >
      <Grid container spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
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
            Composite Indicator
          </Typography>
        </Breadcrumbs>
        <Grid size={{ xs: 12 }}>
          <Indicators />
        </Grid>
      </Grid>
    </CompositeContext.Provider>
  );
};

export default CompositeIndicator;
