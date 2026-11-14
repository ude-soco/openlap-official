import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import parse from "html-react-parser";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PageHeader from "../../../../common/components/page-header/page-header";
import WorkflowSection from "../../../../common/components/workflow-section/workflow-section";
import WorkflowStepper from "../../../../common/components/workflow-stepper/workflow-stepper";
import WorkflowStepHeader from "../../../../common/components/workflow-step-header/workflow-step-header";
import SectionCard from "../../../../common/components/section-card/section-card";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import { useNavigationGuard } from "../../../../setup/routes-manager/navigation-guard-context";
import ChartPreview from "../components/chart-preview";
import {
  defaultParams,
  visualizationImages,
} from "../basic-indicator/components/visualization/utils/visualization-data";
import {
  getChartCompatibility,
  buildRequirementText,
} from "../basic-indicator/components/visualization/utils/chart-compatibility";
import {
  analysisRequest,
  canSelectSource,
  compositionRequest,
  datasetColumns,
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
import {
  ChartCustomization,
  ColumnMappings,
  Failure,
  MethodParameters,
  ResultTable,
} from "./complex-controls";

const apiData = (response) => response.data.data;
const messageOf = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;
const TYPE_LABELS = {
  COMPOSITE: "Composite indicator",
  MULTI_LEVEL: "Multilevel analysis indicator",
};

function chartPreviewData(code) {
  const markup = decodeURIComponent(code);
  const elements = parse(markup);
  const nodes = Array.isArray(elements) ? elements : [elements];
  return {
    displayCode: nodes.filter((node) => node?.type !== "script"),
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
  const [current, setCurrent] = useState("sources");
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
  const dirty =
    loaded &&
    configuration.sources.length > 0 &&
    baseline.current !== JSON.stringify(configuration);

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
  }, [api, id, type]);

  useEffect(() => {
    if (!loaded) return undefined;
    setRecoveryStatus("Saving in this tab…");
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(configuration));
        setRecoveryStatus("Saved in this tab · not yet saved to My Indicators");
      } catch {
        setRecoveryStatus(
          "Tab recovery unavailable. Save your indicator before leaving.",
        );
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [configuration, key, loaded]);

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
    Promise.all([
      api.get("v1/analytics/methods"),
      api.get("v1/visualizations/libraries"),
    ])
      .then(([methodResponse, libraryResponse]) => {
        if (cancelled) return;
        setMethods(apiData(methodResponse) || []);
        setLibraries(apiData(libraryResponse) || []);
        setCatalogError("");
      })
      .catch((error) => {
        if (!cancelled)
          setCatalogError(
            messageOf(
              error,
              "Could not load analytics and visualization catalogs.",
            ),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [api, catalogRetry]);

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
  const previewChart = () => {
    const fingerprint = currentPreviewFingerprint;
    run(
      "visualization",
      () =>
        api.post(
          `v1/indicators/${endpoint}/preview`,
          previewRequest(configuration),
        ),
      (response) => {
        setPreview(chartPreviewData(apiData(response)));
        setPreviewFingerprint(fingerprint);
      },
    );
  };
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
        baseline.current = JSON.stringify(configuration);
        sessionStorage.removeItem(key);
        setSaveOpen(false);
        enqueueSnackbar(
          id ? "Indicator updated." : "Indicator saved to My Indicators.",
          { variant: "success" },
        );
        navigate("/indicator");
      },
    );

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
      : current === step.key
        ? "active"
        : step.completed
          ? "completed"
          : "available";
  const section = (stepKey, body) => {
    const index = steps.findIndex((step) => step.key === stepKey);
    const step = steps[index];
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
          editToggle={
            !step.locked && (
              <Button
                onClick={() => setCurrent(step.key)}
                aria-expanded={current === step.key}
              >
                {current === step.key
                  ? "Editing"
                  : step.completed
                    ? "Review"
                    : "Open"}
              </Button>
            )
          }
        />
        {current !== step.key && !step.locked && (
          <Typography variant="body2" color="text.secondary">
            {step.summary || "Ready to configure"}
          </Typography>
        )}
        <Collapse in={current === step.key && !step.locked} unmountOnExit>
          <Stack sx={{ gap: 2, pt: 1 }}>{body}</Stack>
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

  return (
    <Stack sx={{ gap: 3, width: "100%", minWidth: 0 }}>
      <PageHeader
        title={`${id ? "Edit " : "Create "}${title.toLowerCase()}`}
        breadcrumbs={[
          {
            label: "My Indicators",
            to: "/indicator",
            onClick: (event) => {
              event.preventDefault();
              navigation?.guardedNavigate("/indicator") ||
                (!navigation && navigate("/indicator"));
            },
          },
          { label: "Create an indicator", to: "/indicator/editor" },
        ]}
        subtitle={
          isMulti
            ? "Combine shared results from your Basic indicators, apply another analysis, and visualize the outcome."
            : "Combine Basic indicators using the same analytics method and compare their results in one chart."
        }
      />
      <Typography variant="caption" color="text.secondary" role="status">
        {recoveryStatus}
      </Typography>
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
      {section(
        "sources",
        <>
          <SectionCard
            title="Your Basic indicators"
            helper={
              isMulti
                ? "Choose two to ten saved Basic indicators with a shared matching field. Analytics methods may differ."
                : "Choose two to ten saved Basic indicators. The first selection sets the required analytics method."
            }
          >
            <TextField
              fullWidth
              type="search"
              label="Search your Basic indicators"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSourcePage(0);
              }}
            />
            <Failure
              message={sourceError}
              retry={() => setCatalogRetry((value) => value + 1)}
            />
            {sourcesLoading && (
              <LinearProgress aria-label="Loading Basic indicators" />
            )}
            {!sourcesLoading && !sourceError && !catalog.content?.length && (
              <Alert severity="info">
                No Basic indicators found.{" "}
                <Button
                  component={RouterLink}
                  to="/indicator/editor/basic"
                  size="small"
                  target="_blank"
                  rel="noopener"
                >
                  Create a Basic indicator
                </Button>{" "}
                Your complex-indicator selections stay in this tab.
              </Alert>
            )}
            <Grid container spacing={2}>
              {(catalog.content || []).map((source) => {
                const selection = canSelectSource(
                  type,
                  configuration.sources,
                  source,
                );
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={source.id}>
                    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                      <Stack sx={{ gap: 1 }}>
                        <Typography fontWeight={600}>{source.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {source.analyticsMethod?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(source.outputs || [])
                            .map(
                              (column) =>
                                `${column.title || column.id} (${column.type})`,
                            )
                            .join(" · ")}
                        </Typography>
                        <Button
                          startIcon={<AddIcon />}
                          variant="outlined"
                          disabled={!selection.allowed}
                          onClick={() => addSource(source)}
                          aria-label={`Select ${source.name}`}
                        >
                          Select indicator
                        </Button>
                        {!selection.allowed && (
                          <Typography variant="caption" color="text.secondary">
                            {selection.reason}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
            {catalog.totalPages > 1 && (
              <Pagination
                count={catalog.totalPages}
                page={sourcePage + 1}
                onChange={(_, page) => setSourcePage(page - 1)}
                aria-label="Basic indicator pages"
              />
            )}
          </SectionCard>
          {configuration.sources.length > 0 && (
            <SectionCard
              title="Selected indicators"
              helper="Selections are retained while you search or move between pages."
            >
              <Stack sx={{ gap: 1 }}>
                {configuration.sources.map((source) => (
                  <Stack
                    key={source.id}
                    direction="row"
                    sx={{ alignItems: "center", gap: 1 }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={500}>{source.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {source.analyticsMethod?.name}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={`Remove ${source.name}`}
                      onClick={() => requestRemove(source)}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          )}
          {removedSource && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  onClick={() => {
                    change(
                      (previous) => ({
                        ...previous,
                        sources: [
                          ...previous.sources.slice(0, removedSource.index),
                          removedSource.source,
                          ...previous.sources.slice(removedSource.index),
                        ],
                      }),
                      "sources",
                    );
                    setRemovedSource(null);
                  }}
                >
                  Undo
                </Button>
              }
            >
              Removed {removedSource.source.name}. Combined results need to be
              generated again.
            </Alert>
          )}
          <Button
            variant="contained"
            disabled={configuration.sources.length < 2}
            onClick={() => {
              setSourcesConfirmed(true);
              setCurrent("combine");
            }}
          >
            Continue to combine data
          </Button>
        </>,
      )}
      {section(
        "combine",
        <>
          <Alert severity="info">
            {isMulti
              ? "Only rows whose matching value appears in every selected indicator are included. Unmatched rows are excluded; values are not filled or normalized."
              : "All matching values from every selected indicator are included. Absent numeric measures are filled with zero and marked in the preview."}
          </Alert>
          {configuration.sources.map((source) => (
            <SectionCard
              key={source.id}
              title={source.name}
              helper={`Analytics method: ${source.analyticsMethod?.name || "Unknown"}`}
              action={
                <Button
                  component={RouterLink}
                  to={`/indicator/${source.id}`}
                  target="_blank"
                  rel="noopener"
                  size="small"
                >
                  View source
                </Button>
              }
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label={`Match rows from ${source.name} by`}
                    value={source.keyColumnId}
                    onChange={(event) =>
                      updateSource(source.id, {
                        keyColumnId: event.target.value,
                        measureColumnIds: source.measureColumnIds.filter(
                          (column) => column !== event.target.value,
                        ),
                      })
                    }
                    helperText="Choose a unique, nonempty identifier. Matching values must use the same type."
                  >
                    {source.outputs.map((column) => (
                      <MenuItem key={column.id} value={column.id}>
                        {column.title || column.id} ({column.type})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label={`Measures from ${source.name}`}
                    value={source.measureColumnIds}
                    slotProps={{ select: { multiple: true } }}
                    onChange={(event) =>
                      updateSource(source.id, {
                        measureColumnIds: event.target.value,
                      })
                    }
                    helperText="Choose numerical measures to include."
                  >
                    {source.outputs
                      .filter(
                        (column) =>
                          column.type === "Numeric" &&
                          column.id !== source.keyColumnId,
                      )
                      .map((column) => (
                        <MenuItem key={column.id} value={column.id}>
                          {column.title || column.id}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label={`Series label for ${source.name}`}
                    value={source.label}
                    onChange={(event) =>
                      updateSource(source.id, { label: event.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 150 } }}
                    helperText="This label identifies the source in the combined table and chart."
                  />
                </Grid>
              </Grid>
              {source.filterSummary && (
                <Typography variant="caption" color="text.secondary">
                  {typeof source.filterSummary === "string"
                    ? source.filterSummary
                    : JSON.stringify(source.filterSummary)}
                </Typography>
              )}
              <Button
                size="small"
                disabled={Boolean(busy)}
                onClick={() =>
                  run(
                    "source",
                    () =>
                      api.post("v1/indicators/analyze", {
                        indicators: [{ indicatorId: source.id }],
                      }),
                    (response) =>
                      setSourcePreview({
                        name: source.name,
                        dataset:
                          apiData(response).indicators?.[0]?.analyzedDataset,
                      }),
                  )
                }
              >
                Preview source data
              </Button>
            </SectionCard>
          ))}
          <Failure
            message={
              operationError.step === "combine" ||
              operationError.step === "source"
                ? operationError.message
                : ""
            }
          />
          <Button
            variant="outlined"
            disabled={!sourcesReady(configuration.sources) || Boolean(busy)}
            onClick={combine}
          >
            {busy === "combine" ? (
              <CircularProgress size={20} />
            ) : (
              "Generate combined data"
            )}
          </Button>
          {merged && (
            <>
              <ResultTable dataset={merged} title="Combined data preview" />
              {(merged.sources || []).map((source) => (
                <Typography variant="caption" key={source.indicatorId}>
                  {source.label}: {source.includedRows} included ·{" "}
                  {source.excludedRows} excluded from {source.inputRows} source
                  rows
                </Typography>
              ))}
              <Button
                variant="contained"
                disabled={!datasetRows(merged)}
                onClick={() =>
                  setCurrent(isMulti ? "analysis" : "visualization")
                }
              >
                Continue to {isMulti ? "analysis" : "visualization"}
              </Button>
            </>
          )}
        </>,
      )}
      {isMulti &&
        section(
          "analysis",
          <>
            <SectionCard
              title="Analytics method"
              helper="Apply another analysis to the combined columns. Only installed methods are listed."
            >
              <Autocomplete
                fullWidth
                options={methods}
                value={methods.find((method) => method.id === methodId) || null}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name || ""}
                onChange={(_, method) =>
                  change(
                    (previous) => ({
                      ...previous,
                      analysis: {
                        methodId: method?.id || "",
                        mapping: { mapping: [] },
                        params: [],
                      },
                    }),
                    "analysis",
                  )
                }
                renderInput={(params) => (
                  <TextField {...params} label="Analytics method" />
                )}
              />
            </SectionCard>
            {methodLoading && (
              <LinearProgress aria-label="Loading method inputs and parameters" />
            )}
            {methodId && !methodLoading && (
              <>
                <ColumnMappings
                  inputs={methodInputs}
                  dataset={merged}
                  mapping={configuration.analysis.mapping}
                  onChange={(mapping) =>
                    change(
                      (previous) => ({
                        ...previous,
                        analysis: { ...previous.analysis, mapping },
                      }),
                      "analysis",
                    )
                  }
                  title="Method inputs"
                  helper="Map the method's inputs to columns from the combined data, then review the parameters."
                />
                <MethodParameters
                  params={configuration.analysis.params}
                  onChange={(params) =>
                    change(
                      (previous) => ({
                        ...previous,
                        analysis: { ...previous.analysis, params },
                      }),
                      "analysis",
                    )
                  }
                />
              </>
            )}
            <Failure
              message={
                operationError.step === "analysis" ? operationError.message : ""
              }
              retry={
                operationError.message && methodLoading
                  ? () => setCatalogRetry((value) => value + 1)
                  : undefined
              }
            />
            <Button
              variant="outlined"
              disabled={
                !methodId ||
                methodLoading ||
                methodContractId !== methodId ||
                !mappingsReady(
                  methodInputs,
                  configuration.analysis.mapping,
                  merged,
                ) ||
                Boolean(busy)
              }
              onClick={analyze}
            >
              {busy === "analysis" ? (
                <CircularProgress size={20} />
              ) : (
                "Generate analysis preview"
              )}
            </Button>
            {analyzed && (
              <>
                <ResultTable dataset={analyzed} title="Analysis data preview" />
                <Button
                  variant="contained"
                  disabled={!datasetRows(analyzed)}
                  onClick={() => setCurrent("visualization")}
                >
                  Continue to visualization
                </Button>
              </>
            )}
          </>,
        )}
      {section(
        "visualization",
        <>
          <SectionCard
            title="Visualization library"
            helper="Choose an installed chart library, then a chart suited to the resulting data."
          >
            <TextField
              fullWidth
              select
              label="Library"
              value={libraryId}
              onChange={(event) =>
                change((previous) => ({
                  ...previous,
                  visualization: {
                    ...previous.visualization,
                    libraryId: event.target.value,
                    typeId: "",
                    mapping: { mapping: [] },
                  },
                }))
              }
            >
              {libraries.map((library) => (
                <MenuItem key={library.id} value={library.id}>
                  {library.name}
                </MenuItem>
              ))}
            </TextField>
          </SectionCard>
          {!isMulti && (
            <TextField
              select
              label="Compare measures"
              value={configuration.visualization.dataMode}
              onChange={(event) =>
                change((previous) => ({
                  ...previous,
                  visualization: {
                    ...previous.visualization,
                    dataMode: event.target.value,
                    typeId: "",
                    mapping: { mapping: [] },
                  },
                }))
              }
              helperText="Compare all measures uses a series label for each source. Individual columns support charts such as scatter plots."
            >
              <MenuItem value="combined">
                All selected measures, grouped by source
              </MenuItem>
              <MenuItem value="individual">Individual measure columns</MenuItem>
            </TextField>
          )}
          {chartLoading && <LinearProgress aria-label="Loading chart types" />}
          {libraryId && !chartLoading && (
            <SectionCard
              title="Chart"
              helper="Compatibility checks column types. Choose a chart that answers your question."
            >
              <Grid container spacing={2}>
                {types.map((chart) => {
                  const compatibility = getChartCompatibility(
                    chart,
                    chartDataset?.columns || {},
                  );
                  const disabled = compatibility.status === "needs-data";
                  return (
                    <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={chart.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          borderColor:
                            chart.id === selectedType?.id
                              ? "primary.main"
                              : "divider",
                          borderWidth: chart.id === selectedType?.id ? 2 : 1,
                          height: "100%",
                        }}
                      >
                        <ButtonBase
                          disabled={disabled}
                          onClick={() =>
                            change((previous) => ({
                              ...previous,
                              visualization: {
                                ...previous.visualization,
                                typeId: chart.id,
                                mapping: defaultMappings(
                                  chart.chartInputs,
                                  chartDataset,
                                ),
                                params: {
                                  ...defaultParams,
                                  ...previous.visualization.params,
                                },
                              },
                            }))
                          }
                          aria-pressed={chart.id === selectedType?.id}
                          aria-label={`Select ${chart.name}`}
                          sx={{
                            p: 2,
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          {visualizationImages[chart.imageCode] && (
                            <Box
                              aria-hidden
                              sx={{ "& svg": { width: 48, height: 48 } }}
                              dangerouslySetInnerHTML={{
                                __html: visualizationImages[chart.imageCode],
                              }}
                            />
                          )}
                          <Typography align="center">{chart.name}</Typography>
                          <Chip
                            size="small"
                            label={
                              disabled ? "Needs additional data" : "Compatible"
                            }
                            color={disabled ? "default" : "success"}
                          />
                        </ButtonBase>
                        {disabled && (
                          <Typography
                            variant="caption"
                            component="p"
                            sx={{ px: 1, pb: 1 }}
                          >
                            {buildRequirementText(compatibility.conditions)}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              {!types.length && (
                <Alert severity="info">
                  No chart types are available in this library.
                </Alert>
              )}
            </SectionCard>
          )}
          {selectedType && (
            <>
              {!isMulti &&
                configuration.visualization.dataMode === "combined" &&
                (selectedType.chartInputs || []).filter(
                  (input) => input.type === "Text",
                ).length < 2 && (
                  <Alert severity="warning">
                    This chart has no separate series input. For comparing all
                    sources, choose a grouped chart with a series/group field.
                  </Alert>
                )}
              <ColumnMappings
                inputs={selectedType.chartInputs || []}
                dataset={chartDataset}
                mapping={configuration.visualization.mapping}
                onChange={(mapping) =>
                  change((previous) => ({
                    ...previous,
                    visualization: { ...previous.visualization, mapping },
                  }))
                }
                title="Configure chart"
                helper="Review the suggested columns. Mapping labels identify their source."
              />
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Customize chart</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <ChartCustomization
                    params={{
                      ...defaultParams,
                      ...configuration.visualization.params,
                    }}
                    onChange={(params) =>
                      change((previous) => ({
                        ...previous,
                        visualization: { ...previous.visualization, params },
                      }))
                    }
                    chartConfiguration={selectedType.chartConfiguration || {}}
                    categories={
                      datasetColumns(chartDataset).find(
                        (column) => column.configurationData.type === "Text",
                      )?.data || []
                    }
                  />
                </AccordionDetails>
              </Accordion>
            </>
          )}
          <Failure
            message={
              operationError.step === "visualization"
                ? operationError.message
                : ""
            }
            retry={
              operationError.step === "visualization" && !selectedType
                ? () => setCatalogRetry((value) => value + 1)
                : undefined
            }
          />
          <Button
            variant="outlined"
            disabled={
              !selectedType ||
              !mappingsReady(
                selectedType.chartInputs,
                configuration.visualization.mapping,
                chartDataset,
              ) ||
              Boolean(busy)
            }
            onClick={previewChart}
          >
            {busy === "visualization" ? (
              <CircularProgress size={20} />
            ) : (
              "Generate chart preview"
            )}
          </Button>
          {previewCurrent && (
            <SectionCard
              title="Chart preview"
              helper="This preview uses the current sources and configuration."
            >
              <ChartPreview previewData={preview} responsive />
            </SectionCard>
          )}
          <Alert severity={previewCurrent ? "success" : "info"}>
            {previewCurrent
              ? "Chart preview is ready. Review your indicator and save it."
              : "Generate a chart preview before saving. Changes to earlier steps require a new preview."}
          </Alert>
          <Button
            variant="contained"
            disabled={!previewCurrent || Boolean(busy)}
            onClick={() => setSaveOpen(true)}
          >
            {id ? "Review changes" : "Save indicator"}
          </Button>
        </>,
      )}
      <Dialog
        open={Boolean(sourcePreview)}
        onClose={() => setSourcePreview(null)}
        fullWidth
        maxWidth="lg"
        aria-labelledby="complex-source-preview-title"
      >
        <DialogTitle id="complex-source-preview-title">
          {sourcePreview?.name}
        </DialogTitle>
        <DialogContent>
          <ResultTable
            dataset={sourcePreview?.dataset}
            title="Source analysis output"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourcePreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(removeSource)}
        onClose={() => setRemoveSource(null)}
        aria-labelledby="complex-remove-title"
      >
        <DialogTitle id="complex-remove-title">Remove this source?</DialogTitle>
        <DialogContent>
          Removing {removeSource?.name} keeps the other selections, but combined
          data, analysis and chart previews will need to be generated again.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveSource(null)}>Keep source</Button>
          <Button color="error" onClick={confirmRemove}>
            Remove source
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={saveOpen}
        onClose={busy === "save" ? undefined : () => setSaveOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="complex-save-title"
      >
        <DialogTitle id="complex-save-title">
          {id ? "Update" : "Save"} {title.toLowerCase()}
        </DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              autoFocus
              required
              fullWidth
              label="Indicator name"
              value={configuration.name}
              onChange={(event) =>
                setConfiguration((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { maxLength: 300 } }}
              helperText="Choose a name that explains what this indicator shows."
            />
            <Divider />
            <Typography variant="subtitle2">Sources</Typography>
            {configuration.sources.map((source) => (
              <Typography variant="body2" key={source.id}>
                {source.label || source.name} · {source.analyticsMethod?.name}
              </Typography>
            ))}
            <Typography variant="body2">
              Combination:{" "}
              {isMulti
                ? "shared matching values only (intersection)"
                : "all matching values (union), absent measures filled with zero"}
            </Typography>
            {isMulti && (
              <Typography variant="body2">
                Additional analysis:{" "}
                {methods.find((method) => method.id === methodId)?.name}
              </Typography>
            )}
            <Typography variant="body2">
              Visualization:{" "}
              {libraries.find((library) => library.id === libraryId)?.name} ·{" "}
              {selectedType?.name}
            </Typography>
            <Alert severity="info">
              Saved indicators use live source references. Future source changes
              can change these results.
            </Alert>
            <Failure
              message={
                operationError.step === "save" ? operationError.message : ""
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy === "save"} onClick={() => setSaveOpen(false)}>
            Keep editing
          </Button>
          <Button
            variant="contained"
            disabled={
              !configuration.name.trim() || busy === "save" || !previewCurrent
            }
            onClick={save}
          >
            {busy === "save"
              ? "Saving…"
              : id
                ? "Update indicator"
                : "Save indicator"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(leaveTarget)}
        onClose={() => setLeaveTarget(null)}
        aria-labelledby="complex-leave-title"
      >
        <DialogTitle id="complex-leave-title">Leave this editor?</DialogTitle>
        <DialogContent>
          Your configuration can be kept in this tab. Computed previews will be
          refreshed when you return.{" "}
          {busy &&
            "A request is still running; leaving will discard its response."}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveTarget(null)}>Stay here</Button>
          <Button
            onClick={() => {
              sessionStorage.setItem(
                key,
                JSON.stringify(configurationRef.current),
              );
              navigate(leaveTarget);
            }}
          >
            Keep in this tab and leave
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

ComplexIndicator.propTypes = {
  type: PropTypes.oneOf(["COMPOSITE", "MULTI_LEVEL"]).isRequired,
};
