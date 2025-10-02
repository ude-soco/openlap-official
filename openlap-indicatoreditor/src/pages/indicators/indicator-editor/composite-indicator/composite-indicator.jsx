import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Breadcrumbs, Link, Grid, Typography } from "@mui/material";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import Indicators from "./components/indicators/indicators";
import ColumnsMerge from "./components/columns-merge/columns-merge";

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
            params: { page: 0, searchText: "" },
            list: { content: [], totalPages: 1 },
            previewModal: {
              isPreviewModalOpen: false,
              previewIndicator: {
                name: "",
                type: "",
                createdOn: "",
                createdBy: "",
                analyticsMethod: { name: "" },
                previewData: {
                  displayCode: [],
                  scriptData: "",
                },
              },
            },
          },
          selectedIndicators: [],
          indicatorName: "",
          type: "COMPOSITE",
        };
  });
  const [columnsMerge, setColumnsMerge] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).columnsMerge }
      : {
          indicatorsToAnalyze: {
            indicators: [],
            analyticsOutputs: [],
          },
          columnToMerge: { id: "" },
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
          columnsMerge: { locked: true, openPanel: false, step: "2" },
          visualization: { locked: true, openPanel: false, step: "3" },
        };
  });

  const prevDependencies = useRef({
    lockedStep,
    columnsMerge,
    visualization,
    indicator,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session = {
        lockedStep,
        columnsMerge,
        visualization,
        indicator,
      };

      sessionStorage.setItem(SESSION_INDICATOR, JSON.stringify(session));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.lockedStep !== lockedStep ||
        prevDependencies.current.columnsMerge !== columnsMerge ||
        prevDependencies.current.visualization !== visualization ||
        prevDependencies.current.indicator !== indicator
      ) {
        enqueueSnackbar("Autosaved", { variant: "success" });
      }

      prevDependencies.current = {
        lockedStep,
        columnsMerge,
        visualization,
        indicator,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [lockedStep, columnsMerge, visualization, indicator]);

  return (
    <CompositeContext.Provider
      value={{
        lockedStep,
        columnsMerge,
        visualization,
        indicator,
        setLockedStep,
        setColumnsMerge,
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
            My Indicators
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
        <Grid size={{ xs: 12 }}>
          <ColumnsMerge />
        </Grid>
      </Grid>
    </CompositeContext.Provider>
  );
};

export default CompositeIndicator;
