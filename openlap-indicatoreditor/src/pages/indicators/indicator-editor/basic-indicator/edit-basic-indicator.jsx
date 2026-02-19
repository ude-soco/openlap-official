import { createContext, useContext, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumbs,
  Link,
  Stack,
  Typography,
  Grid,
  Box,
  Divider,
  Alert,
  AlertTitle,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import dayjs from "dayjs";
import { Condition } from "../utils/indicator-data";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";
import Visualization from "./components/visualization/visualization";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "./basic-indicator";

export default function EditBasicIndicator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { SESSION_INDICATOR, api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  // Current (editable) state
  const [indicator, setIndicator] = useState({ indicatorName: "", type: "BASIC" });
  const [dataset, setDataset] = useState({ myLRSList: [], selectedLRSList: [] });
  const [filters, setFilters] = useState({
    selectedUserFilter: Condition.only_me,
    selectedTime: {
      from: dayjs().subtract(1, "year").toISOString(),
      until: dayjs().toISOString(),
    },
    activityTypesList: [],
    selectedActivities: [],
  });
  const [analysis, setAnalysis] = useState({
    analyticsMethodList: [],
    inputs: [],
    params: [],
    selectedAnalyticsMethod: {
      method: { id: "", name: "" },
      mapping: { mapping: [] },
    },
    analyzedData: {},
  });
  const [visualization, setVisualization] = useState({
    libraryList: [],
    selectedLibrary: { id: "", name: "" },
    typeList: [],
    selectedType: { id: "", name: "", chartInputs: [] },
    inputs: [],
    params: { height: 500, width: 500 },
    mapping: { mapping: [] },
    previewData: { displayCode: [], scriptData: {} },
  });

  // Previous (read-only) state - loaded from database
  const [previousIndicatorData, setPreviousIndicatorData] = useState({
    indicator: null,
    dataset: null,
    filters: null,
    analysis: null,
    visualization: null,
  });

  // Accordion expansion state
  const [expandedStep, setExpandedStep] = useState("dataset");

  const [lockedStep, setLockedStep] = useState({
    dataset: { locked: false, openPanel: true, step: "1" },
    filters: { locked: true, openPanel: false, step: "2" },
    analysis: { locked: true, openPanel: false, step: "3" },
    visualization: { locked: true, openPanel: false, step: "4" },
    finalize: { locked: true, openPanel: false, step: "5" },
  });

  const [loading, setLoading] = useState(true);
  const [hasDatasetChanged, setHasDatasetChanged] = useState(false);

  // Detect dataset changes and reset downstream configurations
  useEffect(() => {
    if (!previousIndicatorData.dataset || loading) return;

    // Compare current dataset with previous dataset
    const previousLRSIds = previousIndicatorData.dataset.selectedLRSList
      .map(lrs => lrs.id)
      .sort()
      .join(',');
    const currentLRSIds = dataset.selectedLRSList
      .map(lrs => lrs.id)
      .sort()
      .join(',');

    // If dataset has changed, reset downstream configurations
    if (previousLRSIds !== currentLRSIds) {
      if (!hasDatasetChanged) {
        setHasDatasetChanged(true);
        enqueueSnackbar(
          "Dataset changed! Filters, Analysis, and Visualization will be reset.",
          { variant: "warning" }
        );
      }

      // Reset filters to default
      setFilters({
        selectedUserFilter: Condition.only_me,
        selectedTime: {
          from: dayjs().subtract(1, "year").toISOString(),
          until: dayjs().toISOString(),
        },
        activityTypesList: filters.activityTypesList, // Keep activity types list
        selectedActivities: [],
      });

      // Reset analysis
      setAnalysis({
        analyticsMethodList: analysis.analyticsMethodList,
        inputs: [],
        params: [],
        selectedAnalyticsMethod: {
          method: { id: "", name: "" },
          mapping: { mapping: [] },
        },
        analyzedData: {},
      });

      // Reset visualization
      setVisualization({
        libraryList: visualization.libraryList,
        selectedLibrary: { id: "", name: "" },
        typeList: [],
        selectedType: { id: "", name: "", chartInputs: [] },
        inputs: [],
        params: { height: 500, width: 500 },
        mapping: { mapping: [] },
        previewData: { displayCode: [], scriptData: {} },
      });

      // Reset locked steps
      setLockedStep({
        dataset: { locked: false, openPanel: true, step: "1" },
        filters: { locked: false, openPanel: true, step: "2" },
        analysis: { locked: true, openPanel: false, step: "3" },
        visualization: { locked: true, openPanel: false, step: "4" },
        finalize: { locked: true, openPanel: false, step: "5" },
      });
    }
  }, [dataset.selectedLRSList]);

  // Load indicator data from sessionStorage (set by edit button click)
  useEffect(() => {
    try {
      setLoading(true);
      
      // Get data from sessionStorage (stored by the edit button handler)
      const savedState = sessionStorage.getItem(SESSION_INDICATOR);
      
      if (!savedState) {
        enqueueSnackbar("No indicator data found. Please try again.", { variant: "error" });
        navigate("/indicator");
        return;
      }

      const indicatorData = JSON.parse(savedState);

      // Store previous data for comparison (deep clone to avoid reference issues)
      setPreviousIndicatorData({
        indicator: indicatorData.indicator ? { ...indicatorData.indicator } : null,
        dataset: indicatorData.dataset ? { ...indicatorData.dataset } : null,
        filters: indicatorData.filters ? { ...indicatorData.filters } : null,
        analysis: indicatorData.analysis ? { ...indicatorData.analysis } : null,
        visualization: indicatorData.visualization ? { ...indicatorData.visualization } : null,
      });

      // Initialize current state with loaded data
      setIndicator(indicatorData.indicator || indicator);
      setDataset(indicatorData.dataset || dataset);
      setFilters(indicatorData.filters || filters);
      setAnalysis(indicatorData.analysis || analysis);
      setVisualization(indicatorData.visualization || visualization);

      enqueueSnackbar("Indicator loaded successfully", { variant: "success" });
    } catch (error) {
      console.error("Failed to load indicator data", error);
      enqueueSnackbar("Failed to parse indicator data", { variant: "error" });
      navigate("/indicator");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleResetIfDatasetEmpty = () => {
    setLockedStep({
      dataset: { locked: false, openPanel: true, step: "1" },
      filters: { locked: true, openPanel: false, step: "2" },
      analysis: { locked: true, openPanel: false, step: "3" },
      visualization: { locked: true, openPanel: false, step: "4" },
      finalize: { locked: true, openPanel: false, step: "5" },
    });
    setFilters({
      selectedUserFilter: Condition.only_me,
      selectedTime: {
        from: dayjs().subtract(1, "year").toISOString(),
        until: dayjs().toISOString(),
      },
      activityTypesList: [],
      selectedActivities: [],
    });
    setAnalysis({
      analyticsMethodList: [],
      inputs: [],
      params: [],
      selectedAnalyticsMethod: {
        method: { id: "", name: "" },
        mapping: { mapping: [] },
      },
      analyzedData: {},
    });
    setVisualization({
      libraryList: [],
      selectedLibrary: { id: "", name: "" },
      typeList: [],
      selectedType: { id: "", name: "", chartInputs: [] },
      inputs: [],
      params: { height: 500, width: 500 },
      mapping: { mapping: [] },
      previewData: { displayCode: [], scriptData: {} },
    });
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedStep(isExpanded ? panel : false);
  };

  const handleNextStep = (currentStep) => {
    const steps = ["dataset", "filters", "analysis", "visualization"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setExpandedStep(steps[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <Stack gap={2}>
        <Typography>Loading indicator data...</Typography>
      </Stack>
    );
  }

  return (
    <>
      <BasicContext.Provider
        value={{
          api,
          lockedStep,
          setLockedStep,
          dataset,
          setDataset,
          filters,
          setFilters,
          analysis,
          setAnalysis,
          visualization,
          setVisualization,
          indicator,
          setIndicator,
          handleResetIfDatasetEmpty,
          previousIndicatorData,
          expandedStep,
          handleNextStep,
          hasDatasetChanged,
        }}
      >
        <Stack gap={2}>
          <Breadcrumbs>
            <Link component={RouterLink} underline="hover" color="inherit" to="/">
              Home
            </Link>
            <Link component={RouterLink} underline="hover" color="inherit" to="/indicator">
              My Indicators
            </Link>
            <Typography sx={{ color: "text.primary" }}>Edit Indicator</Typography>
          </Breadcrumbs>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CompareArrowsIcon color="primary" />
            <Typography variant="h5">Edit & Compare Indicator</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Compare your changes side-by-side with the original configuration.
          </Typography>

          {/* Dataset Change Warning */}
          {hasDatasetChanged && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
              <AlertTitle>Dataset Modified</AlertTitle>
              You have changed the data sources. Filters, Analysis, and Visualization 
              configurations have been reset and need to be reconfigured based on the new dataset.
            </Alert>
          )}

          {/* Column Headers */}
          <Grid container spacing={3} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Typography variant="h6" color="primary" fontWeight="bold" align="center">
                Current Selection
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Typography variant="h6" color="text.secondary" fontWeight="bold" align="center">
                Previous Selection
              </Typography>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Left Column: Current Selection */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack gap={2}>
                <Dataset />
                <Filters />
                <Analysis />
                <Visualization />
              </Stack>
            </Grid>

            {/* Right Column: Previous Selection (Read-Only) */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Box
                sx={{
                  pl: { lg: 3 },
                  borderLeft: { lg: '2px solid' },
                  borderColor: { lg: 'grey.300' },
                  pointerEvents: "none",//makes the right column unclickable
                  opacity: 0.6,// styling to indicate read-only state
                  userSelect: "none",
                  "& .MuiButton-root": { display: "none" },
                  "& .MuiIconButton-root": { display: "none" },// hide all buttons
                }}
              >
                <Stack gap={2}>
                  {previousIndicatorData.dataset && (
                    <BasicContext.Provider
                      value={{
                        api,
                        lockedStep: lockedStep,
                        setLockedStep: () => {},
                        dataset: previousIndicatorData.dataset,
                        setDataset: () => {},
                        filters: previousIndicatorData.filters || filters,
                        setFilters: () => {},
                        analysis: previousIndicatorData.analysis || analysis,
                        setAnalysis: () => {},
                        visualization: previousIndicatorData.visualization || visualization,
                        setVisualization: () => {},
                        indicator: previousIndicatorData.indicator || indicator,
                        setIndicator: () => {},
                        handleResetIfDatasetEmpty: () => {},
                      }}
                    >
                      <Dataset />
                    </BasicContext.Provider>
                  )}
                  
                  {previousIndicatorData.filters && (
                    <BasicContext.Provider
                      value={{
                        api,
                        lockedStep: lockedStep,
                        setLockedStep: () => {},
                        dataset: previousIndicatorData.dataset || dataset,
                        setDataset: () => {},
                        filters: previousIndicatorData.filters,
                        setFilters: () => {},
                        analysis: previousIndicatorData.analysis || analysis,
                        setAnalysis: () => {},
                        visualization: previousIndicatorData.visualization || visualization,
                        setVisualization: () => {},
                        indicator: previousIndicatorData.indicator || indicator,
                        setIndicator: () => {},
                        handleResetIfDatasetEmpty: () => {},
                      }}
                    >
                      <Filters />
                    </BasicContext.Provider>
                  )}
                  
                  {previousIndicatorData.analysis && (
                    <BasicContext.Provider
                      value={{
                        api,
                        lockedStep: lockedStep,
                        setLockedStep: () => {},
                        dataset: previousIndicatorData.dataset || dataset,
                        setDataset: () => {},
                        filters: previousIndicatorData.filters || filters,
                        setFilters: () => {},
                        analysis: previousIndicatorData.analysis,
                        setAnalysis: () => {},
                        visualization: previousIndicatorData.visualization || visualization,
                        setVisualization: () => {},
                        indicator: previousIndicatorData.indicator || indicator,
                        setIndicator: () => {},
                        handleResetIfDatasetEmpty: () => {},
                      }}
                    >
                      <Analysis />
                    </BasicContext.Provider>
                  )}
                  
                  {previousIndicatorData.visualization && (
                    <BasicContext.Provider
                      value={{
                        api,
                        lockedStep: lockedStep,
                        setLockedStep: () => {},
                        dataset: previousIndicatorData.dataset || dataset,
                        setDataset: () => {},
                        filters: previousIndicatorData.filters || filters,
                        setFilters: () => {},
                        analysis: previousIndicatorData.analysis || analysis,
                        setAnalysis: () => {},
                        visualization: previousIndicatorData.visualization,
                        setVisualization: () => {},
                        indicator: previousIndicatorData.indicator || indicator,
                        setIndicator: () => {},
                        handleResetIfDatasetEmpty: () => {},
                      }}
                    >
                      <Visualization />
                    </BasicContext.Provider>
                  )}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </BasicContext.Provider>
    </>
  );
}
