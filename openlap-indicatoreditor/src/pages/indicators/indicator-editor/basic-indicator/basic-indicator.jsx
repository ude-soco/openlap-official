import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { Paper, Stack } from "@mui/material";
import dayjs from "dayjs";
import { Condition } from "../utils/indicator-data";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";
import Analysis from "./components/analysis/analysis";
import Visualization from "./components/visualization/visualization";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import PageHeader from "../../../../common/components/page-header/page-header";
import WorkflowStepper from "../../../../common/components/workflow-stepper/workflow-stepper.jsx";
import {
  getCurrentStep,
  getWorkflowSteps,
} from "./utils/basic-workflow-ui.js";

export const BasicContext = createContext(undefined);

export default function BasicIndicator() {
  const { SESSION_INDICATOR } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).indicator }
      : { indicatorName: "", type: "BASIC" };
  });
  const [dataset, setDataset] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).dataset }
      : { myLRSList: [], selectedLRSList: [] };
  });
  const [filters, setFilters] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).filters }
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
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    return savedState
      ? { ...JSON.parse(savedState).analysis }
      : {
          analyticsMethodList: [],
          inputs: [],
          params: [],
          selectedAnalyticsMethod: {
            method: { id: "", name: "" },
            mapping: { mapping: [] },
          },
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
          dataset: { locked: false, openPanel: true, step: "1" },
          filters: { locked: true, openPanel: false, step: "2" },
          analysis: { locked: true, openPanel: false, step: "3" },
          visualization: { locked: true, openPanel: false, step: "4" },
          finalize: { locked: true, openPanel: false, step: "5" },
        };
  });

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

      sessionStorage.setItem(SESSION_INDICATOR, JSON.stringify(session));

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

  // Informational workflow view, derived purely from the live state (no gating
  // change). The stepper reflects progress; panel open/close stays owned by
  // each step's existing toggles and "Next" buttons.
  const workflowSteps = getWorkflowSteps(lockedStep, {
    dataset,
    filters,
    analysis,
    visualization,
  });
  const currentStep = getCurrentStep(lockedStep);

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
          handleResetIfDatasetEmpty,
        }}
      >
        <Stack gap={2}>
          <PageHeader
            title="Basic Indicator"
            breadcrumbs={[
              { label: "Home", to: "/" },
              { label: "My Indicators", to: "/indicator" },
              { label: "Create an indicator", to: "/indicator/editor" },
            ]}
            subtitle="Build your indicator step by step — each step unlocks the next."
          />
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: { xs: 2, md: 3 },
              borderRadius: `${theme.custom.radii.card}px`,
            })}
          >
            <WorkflowStepper steps={workflowSteps} current={currentStep} />
          </Paper>
          <Dataset />
          <Filters />
          <Analysis />
          <Visualization />
        </Stack>
      </BasicContext.Provider>
    </>
  );
}
