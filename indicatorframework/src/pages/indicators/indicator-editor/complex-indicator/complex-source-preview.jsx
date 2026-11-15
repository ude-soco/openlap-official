import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert, Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress,
  Stack, Tab, Tabs, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import SectionCard from "../../../../common/components/section-card/section-card";
import ChartPreview from "../components/chart-preview";
import { canSelectSource, sourceFilterSummary } from "./complex-model";
import { Failure, ResultTable } from "./complex-controls";
import chartPreviewData from "./complex-preview-data";

const messageOf = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const emptyResult = { id: "", loading: false, value: null, error: "" };

export default function SourceIndicatorPreview({ source, type, selectedSources, onSelect, onRemove, onClose, onExited }) {
  const { api } = useContext(AuthContext);
  const [tab, setTab] = useState("chart");
  const [chart, setChart] = useState(emptyResult);
  const [data, setData] = useState(emptyResult);
  const [chartRetry, setChartRetry] = useState(0);
  const [dataRetry, setDataRetry] = useState(0);
  const loadedData = useRef(null);
  const sourceId = source?.id;
  const selected = selectedSources.some((entry) => entry.id === sourceId);
  const eligibility = source ? canSelectSource(type, selectedSources, source) : { allowed: false };
  const activeChart = chart.id === sourceId ? chart : emptyResult;
  const activeData = data.id === sourceId ? data : emptyResult;
  const detail = activeChart.value?.detail;

  useEffect(() => {
    setTab("chart");
    setData(emptyResult);
    loadedData.current = null;
  }, [sourceId]);

  useEffect(() => {
    if (!sourceId) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    setChart({ id: sourceId, loading: true, value: null, error: "" });
    const load = async () => {
      try {
        const response = await api.get(`v1/indicators/sources/${encodeURIComponent(sourceId)}/preview`, { signal: controller.signal });
        const result = response.data.data;
        if (!result?.indicatorCode) throw new Error("This indicator has no chart to preview.");
        const preview = chartPreviewData(result.indicatorCode);
        if (!cancelled) setChart({ id: sourceId, loading: false, value: { detail: result, preview }, error: "" });
      } catch (error) {
        if (!cancelled) setChart({ id: sourceId, loading: false, value: null,
          error: messageOf(error, "Could not load this indicator's chart. You can still review its details.") });
      }
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [api, sourceId, chartRetry]);

  useEffect(() => {
    if (!sourceId || tab !== "data") return undefined;
    if (loadedData.current?.id === sourceId && loadedData.current.retry === dataRetry) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    setData({ id: sourceId, loading: true, value: null, error: "" });
    const load = async () => {
      try {
        const response = await api.post("v1/indicators/analyze", { indicators: [{ indicatorId: sourceId }] }, { signal: controller.signal });
        const result = response.data.data?.indicators?.[0]?.analyzedDataset;
        if (!result) throw new Error("No analysis output was returned for this indicator.");
        if (!cancelled) {
          loadedData.current = { id: sourceId, retry: dataRetry };
          setData({ id: sourceId, loading: false, value: result, error: "" });
        }
      } catch (error) {
        if (!cancelled) setData({ id: sourceId, loading: false, value: null,
          error: messageOf(error, "Could not load this indicator's analysis output.") });
      }
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [api, sourceId, tab, dataRetry]);

  return (
    <Drawer
      anchor="right"
      open={Boolean(source)}
      onClose={onClose}
      slotProps={{
        paper: { role: "dialog", "aria-modal": true, "aria-labelledby": "source-preview-title", "aria-describedby": "source-preview-name",
          sx: { width: { xs: "100%", md: 680 }, maxWidth: "100vw" } },
        transition: { onExited },
      }}
    >
      <Stack sx={{ height: "100%", minWidth: 0 }}>
        <Stack direction="row" sx={{ gap: 1, p: 2, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" variant="h6" id="source-preview-title">Preview indicator</Typography>
            <Typography component="h3" variant="subtitle1" id="source-preview-name" sx={{ fontWeight: 600, overflowWrap: "anywhere", mt: 1 }}>{source?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{source?.analyticsMethod?.name}</Typography>
          </Box>
          <IconButton aria-label="Close indicator preview" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth" aria-label="Indicator preview views">
          {["chart", "data", "details"].map((value) => (
            <Tab key={value} value={value} label={value[0].toUpperCase() + value.slice(1)}
              id={`source-preview-tab-${value}`} aria-controls={`source-preview-panel-${value}`} />
          ))}
        </Tabs>
        <Divider />
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}>
          <Box role="tabpanel" id={`source-preview-panel-${tab}`} aria-labelledby={`source-preview-tab-${tab}`}>
            {tab === "chart" && (
              <Stack sx={{ gap: 2 }}>
                <Typography variant="body2" color="text.secondary">Review this Basic indicator before adding it to your selection.</Typography>
                {activeChart.loading && <LinearProgress aria-label="Loading indicator preview" />}
                <Failure message={activeChart.error} />
                {activeChart.error && <Button variant="contained" onClick={() => setChartRetry((value) => value + 1)}>Retry chart preview</Button>}
                {activeChart.value && <ChartPreview previewData={activeChart.value.preview} responsive />}
              </Stack>
            )}
            {tab === "data" && (
              <SectionCard title="Analyzed data" helper="Current output of this Basic indicator's analytics method.">
                {activeData.loading && <LinearProgress aria-label="Loading source data" />}
                <Failure message={activeData.error} />
                {activeData.error && <Button variant="contained" onClick={() => setDataRetry((value) => value + 1)}>Retry source data</Button>}
                {activeData.value && <ResultTable dataset={activeData.value} title="Indicator data preview" framed={false} />}
              </SectionCard>
            )}
            {tab === "details" && (
              <Stack sx={{ gap: 2 }}>
                <SectionCard title="Indicator details">
                  <Typography variant="body2"><strong>Analytics method:</strong> {source?.analyticsMethod?.name || "Unavailable"}</Typography>
                  {source?.analyticsMethod?.id && <Typography variant="caption" color="text.secondary">Method ID: {source.analyticsMethod.id}</Typography>}
                  <Typography variant="body2"><strong>Last saved:</strong> {(detail?.createdOn || source?.createdOn) ? new Date(detail?.createdOn || source.createdOn).toLocaleString() : "Not available"}</Typography>
                  <Typography variant="body2"><strong>Data filters:</strong> {(typeof source?.filterSummary === "string" ? source.filterSummary : sourceFilterSummary(source?.indicatorQuery)) || "No filter summary available"}</Typography>
                  {detail?.visualizationType && <Typography variant="body2"><strong>Chart:</strong> {detail.visualizationType} · {detail.visualizationLibrary}</Typography>}
                </SectionCard>
                <SectionCard title="Output columns">
                  <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                    {(source?.outputs || []).map((column) => <Chip key={column.id} label={`${column.title || column.id} (${column.type === "Text" ? "Categorical" : column.type === "Numeric" ? "Numerical" : column.type})`} />)}
                    {!source?.outputs?.length && <Typography variant="body2">Output information is unavailable.</Typography>}
                  </Stack>
                </SectionCard>
                {detail?.analyticsTechniqueParams?.length > 0 && (
                  <SectionCard title="Method parameters">
                    {detail.analyticsTechniqueParams.map((param) => <Typography key={param.id} variant="body2"><strong>{param.title || param.id}:</strong> {String(param.value ?? param.defaultValue ?? "—")}</Typography>)}
                  </SectionCard>
                )}
              </Stack>
            )}
          </Box>
        </Box>
        <Divider />
        <Stack sx={{ p: 2, gap: 1 }}>
          <Chip icon={selected ? <CheckCircleOutlineIcon /> : undefined} color={selected ? "primary" : "default"}
            role="status" aria-live="polite"
            label={`${selected ? "Selected · " : ""}${selectedSources.length} of 10 selected`}
            sx={{ alignSelf: "flex-start" }} />
          {!selected && !eligibility.allowed && <Alert severity="info">{eligibility.reason}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={onClose}>Back to indicators</Button>
            <Button variant={selected ? "outlined" : "contained"} color={selected ? "error" : "primary"}
              disabled={!selected && !eligibility.allowed} onClick={() => selected ? onRemove(source) : onSelect(source)}>
              {selected ? "Remove from selection" : "Select indicator"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
}

SourceIndicatorPreview.propTypes = {
  source: PropTypes.object,
  type: PropTypes.string.isRequired,
  selectedSources: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onExited: PropTypes.func.isRequired,
};
