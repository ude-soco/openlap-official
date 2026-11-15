import ComplexSourcesStep from "./complex-sources-step";
import ComplexCombineStep from "./complex-combine-step";
import ComplexAnalysisStep from "./complex-analysis-step";
import ComplexVisualizationStep from "./complex-visualization-step";
import ComplexDialogs from "./complex-dialogs";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import parse from "html-react-parser";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Alert,
  Button,
  Chip,
  Collapse,
  LinearProgress,
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
import { useNavigationGuard } from "../../../../setup/routes-manager/navigation-guard-context";

import {
  analysisRequest,
  canSelectSource,
  compositionRequest,
  datasetRows,
  defaultMappings,
  fallbackConfiguration,
  mappingsReady,
  newComplexConfiguration,
  previewRequest,
  readComplexConfiguration,
  recoveryKey,
  saveRequest,
  sourceSelection,
  sourcesReady,
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

function chartPreviewData(code) {
  const markup = decodeURIComponent(code);
  const elements = parse(markup);
  const nodes = Array.isArray(elements) ? elements : [elements];
  return {
    displayCode: [
      <span key="complex-chart-markup">
        {nodes.filter((node) => node?.type !== "script")}
      </span>,
    ],
    scriptData: nodes
      .filter((node) => node?.type === "script")
      .map((node) => node.props?.dangerouslySetInnerHTML?.__html || "")
      .join("\n"),
  };
}

export default function ComplexIndicator({ type }) {
  const { api, user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const navigation = useNavigationGuard();
  const { enqueueSnackbar } = useSnackbar();
  const isMulti = type === "MULTI_LEVEL";
  const title = TYPE_LABELS[type];
  const key = recoveryKey(type, user?.sub, id);
  const [configuration, setConfiguration] = useState(() => {
    if (id) return newComplexConfiguration(type);
    return (
      readComplexConfiguration(sessionStorage.getItem(key), type) ||
      newComplexConfiguration(type)
    );
  });
  const [loaded, setLoaded] = useState(!id);
  const [loadError, setLoadError] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [recoveryCandidate, setRecoveryCandidate] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [workflow, setWorkflow] = useState({
    current: "sources",
    panels: { sources: true },
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
  const [sourcesConfirmed, setSourcesConfirmed] = useState(false);
  const [catalog, setCatalog] = useState({ content: [], totalPages: 0 });
  const [sourcePage, setSourcePage] = useState(0);
  const [search, setSearch] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [methods, setMethods] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [types, setTypes] = useState([]);
  const [methodInputs, setMethodInputs] = useState([]);
  const [methodLoading, setMethodLoading] = useState(false);
  const [methodContractId, setMethodContractId] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [merged, setMerged] = useState(null);
  const [analyzed, setAnalyzed] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewFingerprint, setPreviewFingerprint] = useState("");
  const [previewError, setPreviewError] = useState("");
  // Reselecting a chart may invalidate a preview without changing its payload.
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [busy, setBusy] = useState("");
  const [operationError, setOperationError] = useState({
    step: "",
    message: "",
  });
  const [sourcePreview, setSourcePreview] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [removeSource, setRemoveSource] = useState(null);
  const [removedSource, setRemovedSource] = useState(null);
  const [leaveTarget, setLeaveTarget] = useState(null);
  const generation = useRef(0);
  const mergedRef = useRef(merged);
  mergedRef.current = merged;
  const baseline = useRef(JSON.stringify(configuration));
  const configurationRef = useRef(configuration);
  configurationRef.current = configuration;
  const recoveryTimer = useRef(null);
  const savedRecovery = useRef(null);

  const endpoint = isMulti ? "multilevel" : "composite";
  const methodId = configuration.analysis.methodId;
  const libraryId = configuration.visualization.libraryId;
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
    loaded && !recoveryCandidate && !chartLoading && libraryId &&
      selectedType?.chartInputs?.length && sourcesReady(configuration.sources) &&
      datasetRows(chartDataset) > 0 && supportsSeries(selectedType) &&
      mappingsReady(selectedType.chartInputs, configuration.visualization.mapping, chartDataset),
  );
  const dirty =
    loaded &&
    configuration.sources.length > 0 &&
    baseline.current !== JSON.stringify(configuration);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!id) return undefined;
    const load = async () => {
      setLoaded(false);
      setLoadError("");
      try {
        const detail = apiData(
          await api.get(
            `v1/indicators/${encodeURIComponent(id)}?includeCode=false`,
          ),
        );
        if (detail.type !== type)
          throw new Error("This indicator belongs to a different editor type.");
        let restored = fallbackConfiguration(detail, type);
        if (!restored) {
          const allSources = [];
          for (let page = 0; page < 100; page += 1) {
            const result = apiData(
              await api.get(`v1/indicators/sources?page=${page}&size=100`),
            );
            allSources.push(...result.content);
            if (page + 1 >= result.totalPages) break;
          }
          restored = fallbackConfiguration(detail, type, allSources);
        }
        if (!restored)
          throw new Error(
            "This saved indicator has no recoverable configuration. Its sources may no longer be available.",
          );
        if (!cancelled) {
          setConfiguration(restored);
          baseline.current = JSON.stringify(restored);
          const local = readComplexConfiguration(
            sessionStorage.getItem(key),
            type,
          );
          setRecoveryCandidate(
            local && JSON.stringify(local) !== baseline.current ? local : null,
          );
          setLoaded(true);
          setSourcesConfirmed(restored.sources.length >= 2);
          setCurrent("combine");
        }
      } catch (error) {
        if (!cancelled)
          setLoadError(messageOf(error, "Could not open the saved indicator."));
      }
    };
    load();
    return () => {
      cancelled = true;
      generation.current += 1;
    };
  }, [api, id, type, key, setCurrent]);

  useEffect(() => {
    if (!loaded || recoveryCandidate) return undefined;
    const serialized = JSON.stringify(configuration);
    if (savedRecovery.current?.key === key
        && savedRecovery.current.configuration === serialized) {
      return undefined;
    }
    setRecoveryStatus("Saving in this tab…");
    const timer = setTimeout(() => {
      if (recoveryTimer.current !== timer) return;
      recoveryTimer.current = null;
      try {
        sessionStorage.setItem(key, serialized);
        setRecoveryStatus("Saved in this tab · not yet saved to My Indicators");
      } catch {
        setRecoveryStatus(
          "Tab recovery unavailable. Save your indicator before leaving.",
        );
      }
    }, 600);
    recoveryTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (recoveryTimer.current === timer) recoveryTimer.current = null;
    };
  }, [configuration, key, loaded, recoveryCandidate]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, busy]);

  useEffect(() => {
    if (!navigation) return undefined;
    const guard = (target) => {
      if (!dirty && !busy) return false;
      setLeaveTarget(target);
      return true;
    };
    navigation.registerGuard(guard);
    return () => navigation.unregisterGuard(guard);
  }, [navigation, dirty, busy]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSourcesLoading(true);
      setSourceError("");
      try {
        const result = apiData(
          await api.get(
            `v1/indicators/sources?${new URLSearchParams({ page: sourcePage, size: 6, searchText: search })}`,
          ),
        );
        if (!cancelled) setCatalog(result);
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
    };
  }, [api, sourcePage, search, catalogRetry]);

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
    setPreviewRevision((previous) => previous + 1);
    setOperationError({ step: "", message: "" });
    if (from === "sources" || from === "combine") {
      setMerged(null);
      setAnalyzed(null);
    }
    if (from === "analysis") setAnalyzed(null);
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
  const requestRemove = (source) => {
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
  const combine = () =>
    run(
      "combine",
      () =>
        api.post(
          `v1/indicators/${endpoint}/merge`,
          compositionRequest(configuration),
        ),
      (response) => {
        const result = apiData(response);
        setMerged(isMulti ? result.mergedData : result);
        setAnalyzed(null);
        setPreview(null);
        setPreviewFingerprint("");
      },
    );
  const analyze = () =>
    run(
      "analysis",
      () =>
        api.post(
          "v1/indicators/multilevel/analyze",
          analysisRequest(configuration),
        ),
      (response) => {
        setAnalyzed(apiData(response));
        setPreview(null);
      },
    );
  const previewChart = useCallback(() => setPreviewRetry((previous) => previous + 1), []);

  useEffect(() => {
    if (!autoPreviewReady) {
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
        setPreview(chartPreviewData(apiData(response)));
        setPreviewFingerprint(currentPreviewFingerprint);
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
  }, [api, endpoint, currentPreviewFingerprint, chartDataset, autoPreviewReady, previewRevision, previewRetry]);
  const save = () =>
    run(
      "save",
      () =>
        id
          ? api.put(
              `v1/indicators/${endpoint}/${encodeURIComponent(id)}/update`,
              saveRequest(configuration),
            )
          : api.post(
              `v1/indicators/${endpoint}/create`,
              saveRequest(configuration),
            ),
      () => {
        const serialized = JSON.stringify(configuration);
        savedRecovery.current = { key, configuration: serialized };
        clearTimeout(recoveryTimer.current);
        recoveryTimer.current = null;
        baseline.current = serialized;
        sessionStorage.removeItem(key);
        setRecoveryStatus("Saved to My Indicators");
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
  const keepAndLeave = () => {
    sessionStorage.setItem(key, JSON.stringify(configurationRef.current));
    navigate(leaveTarget);
  };
  const resetCurrent = () => {
    const fresh = newComplexConfiguration(type);
    baseline.current = JSON.stringify(fresh);
    sessionStorage.removeItem(key);
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
      completed: previewCurrent,
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
    return (
      <Stack sx={{ gap: 2 }}>
        <PageHeader title={`Edit ${title.toLowerCase()}`} />
        {loadError ? (
          <Failure message={loadError} retry={() => window.location.reload()} />
        ) : (
          <LinearProgress aria-label="Opening saved indicator" />
        )}
      </Stack>
    );

  if (recoveryCandidate)
    return (
      <Stack sx={{ gap: 2 }}>
        <PageHeader title={`Edit ${title.toLowerCase()}`} />
        <Alert severity="info">
          Unsaved changes from this browser tab are available. Restore those
          selections, or continue with the server-saved indicator. Computed
          previews will be refreshed either way.
        </Alert>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => {
              setConfiguration(recoveryCandidate);
              setRecoveryCandidate(null);
              setSourcesConfirmed(recoveryCandidate.sources.length >= 2);
              setCurrent("combine");
            }}
          >
            Restore tab changes
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              sessionStorage.removeItem(key);
              setRecoveryCandidate(null);
            }}
          >
            Use saved indicator
          </Button>
        </Stack>
      </Stack>
    );

  return (
    <Stack sx={{ gap: 3, width: "100%", minWidth: 0 }}>
      <PageHeader
        title={`${id ? "Edit " : "Create "}${title.toLowerCase()}`}
        actions={
          <Stack sx={{ gap: 1, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            <Typography variant="caption" color="text.secondary" role="status">
              {recoveryStatus}
            </Typography>
          {!id && configuration.sources.length > 0 && (
            <Button
              variant="outlined"
              disabled={Boolean(busy)}
              onClick={() => setResetOpen(true)}
            >
              Start over
            </Button>
          )}
          </Stack>
        }
        breadcrumbs={[
          {
            label: "Home",
            to: "/",
            onClick: (event) => {
              event.preventDefault();
              if (navigation) navigation.guardedNavigate("/");
              else navigate("/");
            },
          },
          {
            label: "My Indicators",
            to: "/indicator",
            onClick: (event) => {
              event.preventDefault();
              navigation?.guardedNavigate("/indicator") ||
                (!navigation && navigate("/indicator"));
            },
          },
          {
            label: "Create an indicator",
            to: "/indicator/editor",
            onClick: (event) => {
              event.preventDefault();
              if (navigation) navigation.guardedNavigate("/indicator/editor");
              else navigate("/indicator/editor");
            },
          },
        ]}
        subtitle={
          isMulti
            ? "Combine shared results from your Basic indicators, apply another analysis, and visualize the outcome."
            : "Combine Basic indicators using the same analytics method and compare their results in one chart."
        }
      />
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
          operationError={operationError}
          combine={combine}
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
            operationError={operationError}
            setCatalogRetry={setCatalogRetry}
            methodContractId={methodContractId}
            busy={busy}
            analyze={analyze}
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
          operationError={previewError ? { step: "visualization", message: previewError } : operationError}
          setCatalogRetry={setCatalogRetry}
          busy={busy}
          previewChart={previewChart}
          previewCurrent={previewCurrent}
          preview={preview}
          setSaveOpen={setSaveOpen}
          id={id}
        />,
      )}
      </Stack>
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
        previewCurrent={previewCurrent}
        save={save}
        leaveTarget={leaveTarget}
        setLeaveTarget={setLeaveTarget}
        keepAndLeave={keepAndLeave}
      />
    </Stack>
  );
}

ComplexIndicator.propTypes = {
  type: PropTypes.oneOf(["COMPOSITE", "MULTI_LEVEL"]).isRequired,
};
