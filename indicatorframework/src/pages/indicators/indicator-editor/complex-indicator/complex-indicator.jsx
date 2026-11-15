import ComplexSourcesStep from "./complex-sources-step";
import ComplexCombineStep from "./complex-combine-step";
import ComplexAnalysisStep from "./complex-analysis-step";
import ComplexVisualizationStep from "./complex-visualization-step";
import ComplexDialogs from "./complex-dialogs";
import SourceIndicatorPreview from "./complex-source-preview";
import chartPreviewData from "./complex-preview-data";
import useDataPreview from "../utils/use-data-preview";
import { getCustomizationErrors, getVisualizationDescriptor } from "../basic-indicator/components/visualization/utils/visualization-descriptor";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Alert,
  Button,
  Chip,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";

import PageHeader from "../../../../common/components/page-header/page-header";
import WorkflowSection from "../../../../common/components/workflow-section/workflow-section";
import WorkflowStepper from "../../../../common/components/workflow-stepper/workflow-stepper";
import WorkflowStepHeader from "../../../../common/components/workflow-step-header/workflow-step-header";
import { ToggleEditButton } from "../../../../common/components/toggle-edit-button/toggle-edit-button";
import ToggleSummaryButton from "../../../../common/components/toggle-summary-button/toggle-summary-button";
import TipPopover from "../../../../common/components/tip-popover/tip-popover";

import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import useIndicatorDraft from "../drafts/use-indicator-draft.js";
import DraftHeader from "../drafts/draft-header.jsx";
import useDraftNavigation from "../drafts/use-draft-navigation.jsx";

import {
  analysisRequest,
  canSelectSource,
  compositionRequest,
  datasetRows,
  defaultMappings,
  mappingsReady,
  parametersReady,
  newComplexConfiguration,
  previewRequest,
  readComplexConfiguration,
  recoveryKey,
  saveRequest,
  sourceSelection,
  sourcesReady,
  toComplexDraftConfiguration,
} from "./complex-model";
import { Failure } from "./complex-controls";

const apiData = (response) => response.data.data;
const messageOf = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;
const TYPE_LABELS = {
  COMPOSITE: "Composite indicator",
  MULTI_LEVEL: "Multilevel analysis indicator",
};
const STEP_TIPS = {
  sources: "Choose at least two of your saved Basic indicators. Composite sources must use the same installed analytics method; their filters and parameters may differ.",
  combine: "Match each source by a shared key and choose the numeric measures to keep. Composite includes all keys and identifies filled zeros; Multilevel keeps only shared keys.",
  analysis: "Map the combined numeric columns to an installed method, review its parameters, and preview the results before choosing a chart.",
  visualization: "Choose a chart suited to your results, review its input mappings, and customize the live preview before saving.",
};

export default function ComplexIndicator({ type, initialDraft = null, onDraftCreated }) {
  const { api, user } = useContext(AuthContext);
  const id = initialDraft?.sourceIndicatorId || null;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isMulti = type === "MULTI_LEVEL";
  const title = TYPE_LABELS[type];
  const key = recoveryKey(type, user?.sub, id);
  const [configuration, setConfiguration] = useState(() => {
    const restored = initialDraft && readComplexConfiguration(initialDraft.configuration, type);
    return restored ? { ...restored, name: initialDraft.name || restored.name } : newComplexConfiguration(type);
  });
  const loaded = !initialDraft || Boolean(readComplexConfiguration(initialDraft.configuration, type));
  const [legacyRecovery, setLegacyRecovery] = useState(() => {
    try {
      const local = readComplexConfiguration(sessionStorage.getItem(key), type);
      return local && JSON.stringify(local) !== JSON.stringify(configuration) ? local : null;
    }
    catch { return null; }
  });
  const [importingRecovery, setImportingRecovery] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [workflow, setWorkflow] = useState({
    current: initialDraft && configuration.sources.length >= 2 ? "combine" : "sources",
    panels: initialDraft && configuration.sources.length >= 2 ? { combine: true } : { sources: true },
  });
  const current = workflow.current;
  const setCurrent = useCallback((step) => {
    setWorkflow((previous) => ({
      current: step,
      panels: { ...previous.panels, [previous.current]: false, [step]: true },
    }));
  }, []);
  const [summaryVisible, setSummaryVisible] = useState({});
  const [tip, setTip] = useState({ step: "", anchor: null });
  const [sourcesConfirmed, setSourcesConfirmed] = useState(Boolean(initialDraft && configuration.sources.length >= 2));
  const [catalog, setCatalog] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [sourcePage, setSourcePage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [compatibleOnly, setCompatibleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [methods, setMethods] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [types, setTypes] = useState([]);
  const [methodInputs, setMethodInputs] = useState([]);
  const [methodLoading, setMethodLoading] = useState(false);
  const [methodContractId, setMethodContractId] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewFingerprint, setPreviewFingerprint] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [rendererReady, setRendererReady] = useState(false);
  // Reselecting a chart may invalidate a preview without changing its payload.
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [operationBusy, setBusy] = useState("");
  const [operationError, setOperationError] = useState({
    step: "",
    message: "",
  });
  const [sourcePreview, setSourcePreview] = useState(null);
  const [catalogPreview, setCatalogPreview] = useState(null);
  const previewOrigin = useRef(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [removeSource, setRemoveSource] = useState(null);
  const [removedSource, setRemovedSource] = useState(null);
  const generation = useRef(0);
  const pendingMethodDefaults = useRef("");
  const configurationRef = useRef(configuration);
  configurationRef.current = configuration;
  const draftConfiguration = useMemo(() => toComplexDraftConfiguration(configuration), [configuration]);
  const applyDraft = useCallback(({ name, configuration: savedConfiguration }) => {
    const restored = readComplexConfiguration(savedConfiguration, type);
    if (!restored) throw new Error("This draft uses an unsupported indicator configuration.");
    generation.current += 1;
    setConfiguration({ ...restored, name: name || restored.name });
    setSourcesConfirmed(restored.sources.length >= 2);
    setWorkflow({ current: restored.sources.length >= 2 ? "combine" : "sources",
      panels: restored.sources.length >= 2 ? { combine: true } : { sources: true } });
    setPreview(null);
    setPreviewFingerprint("");
  }, [type]);
  const draft = useIndicatorDraft({
    api, owner: user?.sub,
    indicatorType: type, name: configuration.name, configuration: draftConfiguration,
    initialDraft, meaningful: loaded && Boolean(configuration.sources.length || configuration.name.trim()),
    onCreated: onDraftCreated, onApply: applyDraft,
    onCompleted: () => draftNavigation.release(),
  });
  const draftNavigation = useDraftNavigation(draft);

  const endpoint = isMulti ? "multilevel" : "composite";
  const methodId = configuration.analysis.methodId;
  const libraryId = configuration.visualization.libraryId;
  const sourceMethodId = configuration.sources[0]?.analyticsMethod?.id || "";
  const methodFilterId = !isMulti && compatibleOnly
    ? sourceMethodId
    : "";
  const combinePreview = useDataPreview({
    api,
    path: `v1/indicators/${endpoint}/merge`,
    fingerprint: JSON.stringify(compositionRequest(configuration)),
    ready: Boolean(loaded && sourcesConfirmed &&
      sourcesReady(configuration.sources)),
  });
  const merged = isMulti ? combinePreview.data?.mergedData : combinePreview.data;
  const mergedRef = useRef(merged);
  mergedRef.current = merged;
  const analysisPreview = useDataPreview({
    api,
    path: "v1/indicators/multilevel/analyze",
    fingerprint: JSON.stringify(analysisRequest(configuration)),
    upstream: merged,
    ready: Boolean(isMulti && loaded &&
      datasetRows(merged) > 0 && methodId && !methodLoading &&
      methodContractId === methodId && methodInputs.length &&
      configuration.analysis.mapping.mapping.length > 0 &&
      mappingsReady(methodInputs, configuration.analysis.mapping, merged) &&
      parametersReady(configuration.analysis.params)),
  });
  const analyzed = analysisPreview.data;
  const busy = combinePreview.loading ? "combine"
    : analysisPreview.loading ? "analysis" : operationBusy;
  const selectedType = types.find(
    (chart) => chart.id === configuration.visualization.typeId,
  );
  const resultDataset = isMulti ? analyzed : merged;
  const chartDataset =
    !isMulti && configuration.visualization.dataMode === "combined"
      ? merged?.chartData
      : resultDataset;
  const currentPreviewFingerprint = JSON.stringify(
    previewRequest(configuration),
  );
  const previewCurrent = Boolean(
    preview && previewFingerprint === currentPreviewFingerprint,
  );
  const supportsSeries = (chart) =>
    isMulti ||
    configuration.visualization.dataMode !== "combined" ||
    (chart?.chartInputs || []).filter((input) => input.type === "Text")
      .length >= 2;
  const autoPreviewReady = Boolean(
    loaded && !chartLoading && libraryId &&
      selectedType?.chartInputs?.length && sourcesReady(configuration.sources) &&
      datasetRows(chartDataset) > 0 && supportsSeries(selectedType) &&
      mappingsReady(selectedType.chartInputs, configuration.visualization.mapping, chartDataset) &&
      Object.keys(getCustomizationErrors(getVisualizationDescriptor(selectedType), configuration.visualization.params)).length === 0,
  );

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  useEffect(() => setSourcePage(0), [methodFilterId]);
  useEffect(() => {
    if (!sourceMethodId) setCompatibleOnly(false);
  }, [sourceMethodId]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setSourcesLoading(true);
    setSourceError("");
    setCatalog((previous) => ({ ...previous, content: [] }));
    const timer = setTimeout(async () => {
      try {
        const result = apiData(
          await api.get(
            `v1/indicators/sources?${new URLSearchParams({
              page: sourcePage, size: pageSize, searchText: search,
              sortBy, sortDirection, ...(methodFilterId ? { methodId: methodFilterId } : {}),
            })}`,
            { signal: controller.signal },
          ),
        );
        if (!cancelled) {
          setCatalog(result);
          if (sourcePage >= Math.max(1, result.totalPages)) setSourcePage(Math.max(0, result.totalPages - 1));
        }
      } catch (error) {
        if (!cancelled)
          setSourceError(
            messageOf(error, "Could not load your Basic indicators."),
          );
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, sourcePage, pageSize, sortBy, sortDirection, methodFilterId, search, catalogRetry]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      isMulti
        ? api.get("v1/analytics/methods")
        : Promise.resolve({ data: { data: [] } }),
      api.get("v1/visualizations/libraries"),
    ]).then(([methodResult, libraryResult]) => {
      if (cancelled) return;
      const errors = [];
      if (methodResult.status === "fulfilled")
        setMethods(apiData(methodResult.value) || []);
      else {
        setMethods([]);
        errors.push(
          messageOf(methodResult.reason, "Could not load analytics methods."),
        );
      }
      if (libraryResult.status === "fulfilled")
        setLibraries(apiData(libraryResult.value) || []);
      else {
        setLibraries([]);
        errors.push(
          messageOf(
            libraryResult.reason,
            "Could not load visualization libraries.",
          ),
        );
      }
      setCatalogError(errors.join(" "));
    });
    return () => {
      cancelled = true;
    };
  }, [api, catalogRetry, isMulti]);

  useEffect(() => {
    let cancelled = false;
    if (!methodId || !isMulti) {
      setMethodInputs([]);
      return undefined;
    }
    setMethodLoading(true);
    setMethodContractId("");
    api
      .get(`v1/analytics/methods/input-params/${encodeURIComponent(methodId)}`)
      .then((response) => {
        if (cancelled) return;
        const result = apiData(response);
        setMethodInputs(result.inputs || []);
        setMethodContractId(methodId);
        setOperationError((previous) => previous.step === "analysis"
          ? { step: "", message: "" } : previous);
        setConfiguration((previous) => ({
          ...previous,
          analysis: {
            ...previous.analysis,
            mapping: previous.analysis.mapping.mapping?.length
              ? previous.analysis.mapping
              : defaultMappings(result.inputs, mergedRef.current),
            params: (result.params || []).map((param) => ({
              ...param,
              value:
                previous.analysis.params.find(
                  (existing) => existing.id === param.id,
                )?.value ?? param.defaultValue,
            })),
          },
        }));
        pendingMethodDefaults.current = methodId;
      })
      .catch((error) => {
        if (!cancelled)
          setOperationError({
            step: "analysis",
            message: messageOf(
              error,
              "Could not load method inputs and parameters.",
            ),
          });
      })
      .finally(() => {
        if (!cancelled) setMethodLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, methodId, isMulti, catalogRetry]);

  useEffect(() => {
    if (!datasetRows(merged) || methodContractId !== methodId ||
        pendingMethodDefaults.current !== methodId) return;
    pendingMethodDefaults.current = "";
    setConfiguration((previous) => previous.analysis.mapping.mapping.length
      ? previous
      : {
        ...previous,
        analysis: {
          ...previous.analysis,
          mapping: defaultMappings(methodInputs, merged),
        },
      });
  }, [merged, methodId, methodContractId, methodInputs]);

  useEffect(() => {
    let cancelled = false;
    if (!libraryId) {
      setTypes([]);
      return undefined;
    }
    setChartLoading(true);
    api
      .get(`v1/visualizations/libraries/${encodeURIComponent(libraryId)}/types`)
      .then((response) => {
        if (!cancelled) setTypes(apiData(response) || []);
      })
      .catch((error) => {
        if (!cancelled)
          setOperationError({
            step: "visualization",
            message: messageOf(error, "Could not load chart types."),
          });
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, libraryId, catalogRetry]);

  const change = useCallback((updater, from = "visualization") => {
    generation.current += 1;
    setBusy("");
    setPreview(null);
    setPreviewFingerprint("");
    setPreviewError("");
    setRendererReady(false);
    setPreviewRevision((previous) => previous + 1);
    setOperationError({ step: "", message: "" });
    if (from === "sources") setSourcesConfirmed(false);
    setConfiguration((previous) =>
      typeof updater === "function" ? updater(previous) : updater,
    );
  }, []);

  const updateSource = (sourceId, update) =>
    change(
      (previous) => ({
        ...previous,
        sources: previous.sources.map((source) =>
          source.id === sourceId ? { ...source, ...update } : source,
        ),
      }),
      "combine",
    );
  const addSource = (source) => {
    if (!canSelectSource(type, configuration.sources, source).allowed) return;
    change(
      (previous) => ({
        ...previous,
        sources: [...previous.sources, sourceSelection(source)],
      }),
      "sources",
    );
  };
  const confirmRemove = () => {
    setRemovedSource({
      source: removeSource,
      index: configuration.sources.findIndex(
        (source) => source.id === removeSource.id,
      ),
    });
    change(
      (previous) => ({
        ...previous,
        sources: previous.sources.filter(
          (source) => source.id !== removeSource.id,
        ),
      }),
      "sources",
    );
    setRemoveSource(null);
    setCurrent("sources");
  };
  const requestRemove = (candidate) => {
    const source = configuration.sources.find((entry) => entry.id === candidate.id);
    if (!source) return;
    if (merged || analyzed || preview) {
      setRemoveSource(source);
      return;
    }
    setRemovedSource({ source, index: configuration.sources.indexOf(source) });
    change(
      (previous) => ({
        ...previous,
        sources: previous.sources.filter((item) => item.id !== source.id),
      }),
      "sources",
    );
  };
  const previewIndicator = (source, trigger) => {
    previewOrigin.current = { element: trigger || document.activeElement, id: source.id };
    setCatalogPreview(source);
  };
  const restorePreviewFocus = () => {
    const origin = previewOrigin.current;
    const replacement = Array.from(document.querySelectorAll("[data-source-preview-id]"))
      .find((element) => element.dataset.sourcePreviewId === origin?.id);
    const target = origin?.element?.isConnected ? origin.element
      : replacement || document.getElementById("complex-source-search");
    target?.focus();
  };
  const run = async (step, action, success) => {
    const request = ++generation.current;
    setBusy(step);
    setOperationError({ step: "", message: "" });
    try {
      const result = await action();
      if (request !== generation.current) return;
      success(result);
    } catch (error) {
      if (request === generation.current)
        setOperationError({
          step,
          message: messageOf(
            error,
            "The request could not complete. Your selections are preserved; review them and retry.",
          ),
        });
    } finally {
      if (request === generation.current) setBusy("");
    }
  };
  const previewChart = useCallback(() => setPreviewRetry((previous) => previous + 1), []);

  useEffect(() => {
    if (!autoPreviewReady) {
      setRendererReady(false);
      setPreview(null);
      setPreviewFingerprint("");
      return undefined;
    }
    const request = ++generation.current;
    const controller = new AbortController();
    let cancelled = false;
    setBusy("visualization");
    setPreview(null);
    setPreviewFingerprint("");
    setPreviewError("");
    setRendererReady(false);
    setOperationError((previous) => previous.step === "visualization"
      ? { step: "", message: "" }
      : previous);

    const load = async () => {
      try {
        const response = await api.post(
          `v1/indicators/${endpoint}/preview`,
          JSON.parse(currentPreviewFingerprint),
          { signal: controller.signal },
        );
        if (cancelled || request !== generation.current) return;
        setPreview(chartPreviewData(apiData(response), configurationRef.current.visualization.typeId));
        setPreviewFingerprint(currentPreviewFingerprint);
        setOperationError((previous) => previous.step === "visualization"
          ? { step: "", message: "" }
          : previous);
      } catch (error) {
        if (!cancelled && request === generation.current) {
          setPreviewError(messageOf(error, "Could not generate the chart preview. Review the inputs and retry."));
        }
      } finally {
        if (!cancelled && request === generation.current) setBusy("");
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
      if (request === generation.current) {
        setBusy((previous) => previous === "visualization" ? "" : previous);
      }
    };
  }, [api, endpoint, currentPreviewFingerprint, chartDataset, autoPreviewReady, previewRevision, previewRetry, catalogRetry]);
  const save = () =>
    run(
      "save",
      () => draft.complete(saveRequest(configuration)),
      () => {
        setSaveOpen(false);
        enqueueSnackbar(
          id ? "Indicator updated." : "Indicator saved to My Indicators.",
          { variant: "success" },
        );
        navigate("/indicator");
      },
    );

  const previewSourceData = (source) =>
    run(
      "source",
      () =>
        api.post("v1/indicators/analyze", {
          indicators: [{ indicatorId: source.id }],
        }),
      (response) =>
        setSourcePreview({
          name: source.name,
          dataset: apiData(response).indicators?.[0]?.analyzedDataset,
        }),
    );
  const importLegacyRecovery = () => {
    applyDraft({ name: legacyRecovery.name, configuration: legacyRecovery });
    setLegacyRecovery(null);
    setImportingRecovery(true);
  };
  useEffect(() => {
    if (importingRecovery && draft.draftId && !draft.dirty && !draft.saving && !draft.error) {
      try { sessionStorage.removeItem(key); } catch { /* The server copy remains authoritative. */ }
      setImportingRecovery(false);
    }
  }, [draft.draftId, draft.dirty, draft.saving, draft.error, importingRecovery, key]);
  const resetCurrent = () => {
    const fresh = newComplexConfiguration(type);
    change(fresh, "sources");
    setWorkflow({ current: "sources", panels: { sources: true } });
    setSummaryVisible({});
    setRemovedSource(null);
    setResetOpen(false);
  };

  const steps = [
    {
      key: "sources",
      label: "Select indicators",
      locked: false,
      completed: sourcesConfirmed,
      summary: `${configuration.sources.length} selected`,
    },
    {
      key: "combine",
      label: "Combine data",
      locked: !sourcesConfirmed,
      completed: datasetRows(merged) > 0,
      summary: datasetRows(merged)
        ? `${datasetRows(merged)} matching rows`
        : isMulti
          ? "Shared rows only"
          : "All rows",
    },
    ...(isMulti
      ? [
          {
            key: "analysis",
            label: "Analysis",
            locked: !datasetRows(merged),
            completed: datasetRows(analyzed) > 0,
            summary: methods.find((method) => method.id === methodId)?.name,
          },
        ]
      : []),
    {
      key: "visualization",
      label: "Visualization",
      locked: !datasetRows(resultDataset),
      completed: previewCurrent && rendererReady,
      summary: selectedType?.name,
    },
  ];
  const status = (step) =>
    step.locked
      ? "locked"
      : workflow.panels[step.key]
        ? "active"
        : step.completed
          ? "completed"
          : "available";
  const section = (stepKey, body) => {
    const index = steps.findIndex((step) => step.key === stepKey);
    const step = steps[index];
    if (step.locked && stepKey !== steps.find((entry) => entry.locked)?.key) return null;
    const expanded = !step.locked && Boolean(workflow.panels[stepKey]);
    const contentId = `complex-${type.toLowerCase()}-${stepKey}-content`;
    return (
      <WorkflowSection
        status={status(step)}
        lockedHint={
          stepKey === "combine"
            ? "Select at least two compatible Basic indicators and continue."
            : stepKey === "analysis"
              ? "Generate combined data first."
              : "Generate a nonempty result before choosing a visualization."
        }
        ariaLabel={`${step.label} step`}
      >
        <WorkflowStepHeader
          stepNumber={index + 1}
          title={step.label}
          locked={step.locked}
          helper={!step.locked && (
            <TipPopover
              tipAnchor={tip.step === stepKey ? tip.anchor : null}
              toggleTipAnchor={(anchor) => setTip({ step: stepKey, anchor })}
              description={STEP_TIPS[stepKey]}
            />
          )}
          summaryToggle={!step.locked && !expanded && (
            <ToggleSummaryButton
              showSelections={summaryVisible[stepKey] !== false}
              toggleShowSelection={() => setSummaryVisible((previous) => ({
                ...previous,
                [stepKey]: previous[stepKey] === false,
              }))}
            />
          )}
          editToggle={
            !step.locked && (
              <ToggleEditButton
                openPanel={expanded}
                controls={contentId}
                togglePanel={() => setWorkflow((previous) => ({
                  current: previous.panels[stepKey] ? previous.current : stepKey,
                  panels: { ...previous.panels, [stepKey]: !previous.panels[stepKey] },
                }))}
              />
            )
          }
        />
        <Collapse in={!expanded && !step.locked && summaryVisible[stepKey] !== false} unmountOnExit>
          <Stack sx={{ gap: 1 }}>
            <Typography variant="body2">Selection summary</Typography>
            {stepKey === "sources" ? (
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                {configuration.sources.map((source) => <Chip key={source.id} label={source.name} />)}
                {!configuration.sources.length && <Typography variant="body2" color="text.secondary">No indicators selected.</Typography>}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {step.summary || "Ready to configure"}
              </Typography>
            )}
          </Stack>
        </Collapse>
        <Collapse id={contentId} in={expanded} timeout={{ enter: 500, exit: 250 }} unmountOnExit>
          <Stack sx={{ gap: 2, py: 2 }}>{body}</Stack>
        </Collapse>
      </WorkflowSection>
    );
  };

  if (!loaded)
    return <Stack sx={{ gap: 2 }}>
      <PageHeader title={title} />
      <Failure message="This draft uses an unsupported indicator configuration. Your saved draft has not been changed." />
      <Button onClick={() => navigate("/indicator")}>Back to My Indicators</Button>
    </Stack>;

  return (
    <Stack component="fieldset" disabled={Boolean(draft.finalizing)}
      aria-busy={draft.finalizing || undefined}
      onKeyDownCapture={(event) => {
        if (draft.finalizing) { event.preventDefault(); event.stopPropagation(); }
      }}
      sx={{ gap: 3, width: "100%", minWidth: 0, border: 0, m: 0, p: 0,
        pointerEvents: draft.finalizing ? "none" : undefined }}>
      <PageHeader
        title={`${id ? "Edit " : "Create "}${title.toLowerCase()}`}

        breadcrumbs={[
          {
            label: "Home",
            to: "/",
            onClick: (event) => {
              event.preventDefault();
              draftNavigation.requestLeave("/");
            },
          },
          {
            label: "My Indicators",
            to: "/indicator",
            onClick: (event) => {
              event.preventDefault();
              draftNavigation.requestLeave("/indicator");
            },
          },
          {
            label: "Create an indicator",
            to: "/indicator/editor",
            onClick: (event) => {
              event.preventDefault();
              draftNavigation.requestLeave("/indicator/editor");
            },
          },
        ]}
        subtitle={
          isMulti
            ? "Combine shared results from your Basic indicators, apply another analysis, and visualize the outcome."
            : "Combine Basic indicators using the same analytics method and compare their results in one chart."
        }
      />
      <DraftHeader
        name={configuration.name}
        onNameChange={(name) => setConfiguration((previous) => ({ ...previous, name }))}
        indicatorType={type}
        draft={draft}
        onSaveAndExit={() => draftNavigation.saveAndExit()}
        onDiscard={() => draftNavigation.requestDiscard()}
      />
      {legacyRecovery && <Alert severity="info" action={<Button onClick={importLegacyRecovery}>Import local draft</Button>}>
        An older {title.toLowerCase()} is saved only in this tab. Import those selections into this private draft. Saved indicators stay unchanged.
      </Alert>}
      {!id && configuration.sources.length > 0 && <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button variant="outlined" disabled={Boolean(busy) || draft.saving} onClick={() => setResetOpen(true)}>Start over</Button>
      </Stack>}
      <WorkflowStepper
        steps={steps}
        current={current}
        onStepSelect={setCurrent}
        ariaLabel={`${title} creation progress`}
      />
      <Failure
        message={catalogError}
        retry={() => setCatalogRetry((value) => value + 1)}
      />
      <Stack sx={{ gap: 2 }}>
      {section(
        "sources",
        <ComplexSourcesStep
          setCatalogRetry={setCatalogRetry}
          sourcesLoading={sourcesLoading}
          isMulti={isMulti}
          search={search}
          setSearch={setSearch}
          setSourcePage={setSourcePage}
          sourceError={sourceError}
          catalog={catalog}
          type={type}
          configuration={configuration}
          addSource={addSource}
          sourcePage={sourcePage}
          pageSize={pageSize}
          setPageSize={(size) => { setPageSize(size); setSourcePage(0); }}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={(field) => {
            setSortDirection(field === sortBy && sortDirection === "asc" ? "desc" : "asc");
            setSortBy(field);
            setSourcePage(0);
          }}
          compatibleOnly={compatibleOnly}
          setCompatibleOnly={setCompatibleOnly}
          previewIndicator={previewIndicator}
          requestRemove={requestRemove}
          removedSource={removedSource}
          change={change}
          setRemovedSource={setRemovedSource}
          setSourcesConfirmed={setSourcesConfirmed}
          setCurrent={setCurrent}
        />,
      )}
      {section(
        "combine",
        <ComplexCombineStep
          isMulti={isMulti}
          configuration={configuration}
          updateSource={updateSource}
          busy={busy}
          previewSourceData={previewSourceData}
          operationError={combinePreview.error
            ? { step: "combine", message: combinePreview.error } : operationError}
          combine={combinePreview.retry}
          merged={merged}
          setCurrent={setCurrent}
        />,
      )}
      {isMulti &&
        section(
          "analysis",
          <ComplexAnalysisStep
            methods={methods}
            methodId={methodId}
            change={change}
            methodLoading={methodLoading}
            methodInputs={methodInputs}
            merged={merged}
            configuration={configuration}
            operationError={analysisPreview.error
              ? { step: "analysis", message: analysisPreview.error } : operationError}
            setCatalogRetry={setCatalogRetry}
            methodContractId={methodContractId}
            busy={busy}
            analyze={analysisPreview.retry}
            analyzed={analyzed}
            setCurrent={setCurrent}
          />,
        )}
      {section(
        "visualization",
        <ComplexVisualizationStep
          libraryId={libraryId}
          change={change}
          libraries={libraries}
          isMulti={isMulti}
          configuration={configuration}
          chartLoading={chartLoading}
          types={types}
          chartDataset={chartDataset}
          supportsSeries={supportsSeries}
          selectedType={selectedType}
          operationError={operationError}
          previewError={previewError}
          setCatalogRetry={setCatalogRetry}
          busy={busy}
          previewChart={previewChart}
          previewCurrent={previewCurrent}
          saveBlocked={Boolean(draft.conflict || draft.recovery)}
          rendererReady={rendererReady}
          onRendererStatus={setRendererReady}
          preview={preview}
          setSaveOpen={setSaveOpen}
          id={id}
        />,
      )}
      </Stack>
      <SourceIndicatorPreview
        source={catalogPreview}
        type={type}
        selectedSources={configuration.sources}
        onSelect={addSource}
        onRemove={requestRemove}
        onClose={() => setCatalogPreview(null)}
        onExited={restorePreviewFocus}
      />
      <ComplexDialogs
        resetOpen={resetOpen}
        setResetOpen={setResetOpen}
        resetCurrent={resetCurrent}
        sourcePreview={sourcePreview}
        setSourcePreview={setSourcePreview}
        removeSource={removeSource}
        setRemoveSource={setRemoveSource}
        confirmRemove={confirmRemove}
        saveOpen={saveOpen}
        busy={busy}
        setSaveOpen={setSaveOpen}
        id={id}
        title={title}
        configuration={configuration}
        setConfiguration={setConfiguration}
        isMulti={isMulti}
        methods={methods}
        methodId={methodId}
        libraries={libraries}
        libraryId={libraryId}
        selectedType={selectedType}
        operationError={operationError}
        previewCurrent={previewCurrent && !draft.conflict && !draft.recovery}
        save={save}
      />
      {draftNavigation.dialog}
    </Stack>
  );
}

ComplexIndicator.propTypes = {
  type: PropTypes.oneOf(["COMPOSITE", "MULTI_LEVEL"]).isRequired,
  initialDraft: PropTypes.object,
  onDraftCreated: PropTypes.func,
};
