import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
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
  isStepRevealed,
} from "./utils/basic-workflow-ui.js";

import useIndicatorDraft from "../drafts/use-indicator-draft.js";
import DraftHeader from "../drafts/draft-header.jsx";
import useDraftNavigation from "../drafts/use-draft-navigation.jsx";
import { basicDraftMeaningful, emptyBasicState, readBasicDraft, refreshBasicReferences, restoreBasicState, serializeBasicDraft } from "./utils/basic-draft-model.js";

export const BasicContext = createContext(undefined);

const referencesOf = (value) => JSON.stringify({ lrs: value.dataset.selectedLRSList.map((entry) => [entry.lrsId, entry.uniqueIdentifier]),
  method: value.analysis.selectedAnalyticsMethod.method.id, library: value.visualization.selectedLibrary.id,
  chart: value.visualization.selectedType.id,
  filters: value.filters.selectedActivities.map((entry) => [entry.selectedActivityType?.id,
    entry.selectedActionList?.map((action) => action.id), entry.selectedActivityList?.map((item) => item.id)]),
});

export default function BasicIndicator({ initialDraft = null, initialState = null, onDraftCreated }) {
  const { api, user, SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const first = useRef(null);
  if (!first.current) {
    const restored = initialState?.state || restoreBasicState(initialDraft?.configuration);
    first.current = { ...restored, indicator: { ...restored.indicator,
      indicatorName: initialDraft?.name ?? restored.indicator.indicatorName } };
  }
  const [indicator, setIndicator] = useState(first.current.indicator);
  const [dataset, setDataset] = useState(first.current.dataset);
  const [filters, setFilters] = useState(first.current.filters);
  const [analysis, setAnalysis] = useState(first.current.analysis);
  const [visualization, setVisualization] = useState(first.current.visualization);
  const [lockedStep, setLockedStep] = useState(first.current.lockedStep);
  const [hydrating, setHydrating] = useState(false);
  const [referenceWarnings, setReferenceWarnings] = useState(initialState?.warnings || []);
  const refreshGeneration = useRef(0);
  useEffect(() => () => { refreshGeneration.current += 1; }, []);
  const legacyPending = useRef(false);
  const [legacyCandidate, setLegacyCandidate] = useState(() => {
    if (initialDraft) return null;
    try { return readBasicDraft(sessionStorage.getItem(SESSION_INDICATOR)); }
    catch { return null; }
  });
  const [legacyOpen, setLegacyOpen] = useState(false);
  const live = useMemo(() => ({ indicator, dataset, filters, analysis, visualization, lockedStep }),
    [indicator, dataset, filters, analysis, visualization, lockedStep]);
  const configuration = useMemo(() => serializeBasicDraft(live), [live]);
  const warningReferences = useRef(referencesOf(first.current));
  const referencesValid = !hydrating && (!referenceWarnings.length || referencesOf(live) !== warningReferences.current);
  const applyState = useCallback((next) => {
    setIndicator(next.indicator); setDataset(next.dataset); setFilters(next.filters);
    setAnalysis(next.analysis); setVisualization(next.visualization); setLockedStep(next.lockedStep);
  }, []);
  const applyDraft = useCallback(async ({ name, configuration: saved }) => {
    const run = ++refreshGeneration.current;
    const restored = restoreBasicState(saved);
    restored.indicator.indicatorName = name || restored.indicator.indicatorName;
    applyState(restored);
    setHydrating(true);
    try {
      const refreshed = await refreshBasicReferences(api, serializeBasicDraft(restored));
      if (run !== refreshGeneration.current) return;
      warningReferences.current = referencesOf(refreshed.state);
      setReferenceWarnings(refreshed.warnings);
      applyState(refreshed.state);
    } finally { if (run === refreshGeneration.current) setHydrating(false); }
  }, [api, applyState]);
  const draft = useIndicatorDraft({ api, owner: user?.sub, indicatorType: "BASIC", configuration,
    name: indicator.indicatorName, initialDraft, meaningful: basicDraftMeaningful(configuration),
    onCreated: onDraftCreated, onApply: applyDraft,
    onCompleted: () => { draftNavigation.release(); navigate("/indicator"); } });
  const draftNavigation = useDraftNavigation(draft);
  useEffect(() => {
    if (!legacyPending.current || draft.status !== "saved" || !draft.draftId) return;
    try { sessionStorage.removeItem(SESSION_INDICATOR); } catch { /* The confirmed server draft is safe. */ }
    legacyPending.current = false;
    setLegacyCandidate(null);
  }, [draft.status, draft.draftId, SESSION_INDICATOR]);

  const handleResetIfDatasetEmpty = () => {
    setLockedStep({
      dataset: { locked: false, openPanel: true, step: "1" },
      filters: { locked: true, openPanel: false, step: "2" },
      analysis: { locked: true, openPanel: false, step: "3" },
      visualization: { locked: true, openPanel: false, step: "4" },
      finalize: { locked: true, openPanel: false, step: "5" },
    });
    setFilters({
      selectedUserFilter: "ONLY_ME",
      selectedTime: {
        ...emptyBasicState().filters.selectedTime,
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
          draft, draftNavigation, referencesValid: referencesValid && !draft.finalizing,
        }}
      >
        <Stack sx={{ gap: 3 }}>
          <PageHeader
            title="Basic Indicator"
            breadcrumbs={[
              { label: "Home", to: "/", onClick: (event) => { event.preventDefault(); draftNavigation.requestLeave("/"); } },
              { label: "My Indicators", to: "/indicator", onClick: (event) => { event.preventDefault(); draftNavigation.requestLeave("/indicator"); } },
              { label: "Create an indicator", to: "/indicator/editor", onClick: (event) => { event.preventDefault(); draftNavigation.requestLeave("/indicator/editor"); } },
            ]}
          />
          {!hydrating && <DraftHeader name={indicator.indicatorName} onNameChange={(name) => setIndicator((previous) => ({ ...previous, indicatorName: name }))}
            indicatorType="BASIC" draft={draft} onSaveAndExit={() => draftNavigation.saveAndExit()}
            onDiscard={() => draftNavigation.requestDiscard()} />}
          {legacyCandidate && !legacyPending.current && <Alert severity="info" action={<Button color="inherit" onClick={() => setLegacyOpen(true)}>Review legacy recovery</Button>}>
            An older Basic indicator recovery copy exists in this browser tab. It has no recorded account owner.
          </Alert>}
          {referenceWarnings.length > 0 && !referencesValid && <Alert severity="warning" action={<Button color="inherit" onClick={() => applyDraft({ name: indicator.indicatorName, configuration })}>Refresh selections</Button>}>
            {referenceWarnings.join(" ")}
          </Alert>}
          {hydrating ? <CircularProgress aria-label="Refreshing saved selections" /> : <>
          <WorkflowStepper steps={workflowSteps} current={currentStep} />
          <Stack sx={{ gap: 2 }} inert={draft.finalizing || undefined}>
            {isStepRevealed(lockedStep, "dataset") && <Dataset />}
            {isStepRevealed(lockedStep, "filters") && <Filters />}
            {isStepRevealed(lockedStep, "analysis") && <Analysis />}
            {isStepRevealed(lockedStep, "visualization") && <Visualization />}
          </Stack>
          </>}
          {draftNavigation.dialog}
          <Dialog open={legacyOpen} onClose={() => setLegacyOpen(false)} aria-labelledby="legacy-basic-draft-title">
            <DialogTitle id="legacy-basic-draft-title">Restore this older recovery copy?</DialogTitle>
            <DialogContent><Typography>This copy was saved before drafts were linked to accounts. Restore it only if it is your work. It will become a new private draft; your saved indicators stay unchanged.</Typography></DialogContent>
            <DialogActions><Button onClick={() => setLegacyOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => {
                legacyPending.current = true;
                setLegacyOpen(false);
                applyDraft({ name: legacyCandidate.indicator.indicatorName, configuration: legacyCandidate });
              }}>Restore my work</Button></DialogActions>
          </Dialog>
        </Stack>
      </BasicContext.Provider>
    </>
  );
}

BasicIndicator.propTypes = { initialDraft: PropTypes.object, initialState: PropTypes.object, onDraftCreated: PropTypes.func };
