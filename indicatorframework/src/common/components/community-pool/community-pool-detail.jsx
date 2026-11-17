import { useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, LinearProgress, MenuItem, Paper, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReplayIcon from "@mui/icons-material/Replay";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import ChartPreview from "../../../pages/indicators/indicator-editor/components/chart-preview.jsx";
import parseChartCode from "../../../pages/indicators/indicator-editor/components/utils/parse-chart-code.jsx";
import CommunityIscPreview from "./community-isc-preview.jsx";
import { canSaveCommunityPreview, communityError, communityTypeName, requestCommunityCopy,
  requestCommunityDetail, requestCommunityExample, requestCommunityPreview, requestCommunityAdaptation } from "./community-pool-api.js";
import CommunityCopyBadge from "./community-copy-badge.jsx";

const previewMessages = {
  NO_CONNECTION: "Connect your LRS in Manage LRS before previewing this indicator.",
  MISSING_LRS: "Your account does not have every LRS connection this indicator needs.",
  NO_DATA: "No matching data was found for your user and these filters.",
  PLUGIN_UNAVAILABLE: "An analytics method or chart required by this indicator is unavailable.",
  INCOMPATIBLE: "Your data does not meet all of this indicator’s requirements.",
  CHOOSE_CONNECTION: "Choose which of your connected identities to use. The preview updates automatically.",
};
const textOf = (value) => typeof value === "string" || typeof value === "number" ? String(value) : "";

function Field({ label, children }) {
  return <Stack sx={{ gap: 0.25, minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{children || "—"}</Typography></Stack>;
}
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

function Columns({ title, columns }) {
  if (!Array.isArray(columns) || !columns.length) return null;
  return <Stack sx={{ gap: 1 }}><Typography variant="subtitle2">{title}</Typography>
    {columns.map((column, index) => <Typography key={index} variant="body2" sx={{ overflowWrap: "anywhere" }}>
      {typeof column === "string" ? column : [column.name || column.headerName || column.label, column.type?.value || column.type?.type || textOf(column.type)].filter(Boolean).join(" · ")}
    </Typography>)}
  </Stack>;
}
Columns.propTypes = { title: PropTypes.string.isRequired, columns: PropTypes.array };

function DataFilters({ filters }) {
  if (!filters) return null;
  const labels = (values) => Array.isArray(values) ? values.filter((value) => typeof value === "string").join(", ") : "";
  const timeframe = [textOf(filters.timeframe?.from), textOf(filters.timeframe?.until)].filter(Boolean).join(" – ");
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
    {labels(filters.activityTypes) && <Field label="Activity types">{labels(filters.activityTypes)}</Field>}
    {labels(filters.actions) && <Field label="Actions">{labels(filters.actions)}</Field>}
    {timeframe && <Field label="Timeframe">{timeframe}</Field>}
  </Box>;
}
DataFilters.propTypes = { filters: PropTypes.object };

export default function CommunityPoolDetail({ kind, row, onClose, onSaved }) {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const isc = kind === "isc";
  const detailsId = useId();
  const personalSection = useRef(null);
  const adaptationRequestId = useRef(crypto.randomUUID());
  const adaptationBusy = useRef(false);
  const personalGeneration = useRef(0);
  const [adapting, setAdapting] = useState(false);
  const [adaptError, setAdaptError] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadRun, setLoadRun] = useState(0);
  const [example, setExample] = useState(null);
  const [exampleChecking, setExampleChecking] = useState(true);
  const [exampleRun, setExampleRun] = useState(0);
  const [preview, setPreview] = useState(null);
  const [personalRequested, setPersonalRequested] = useState(false);
  const [checking, setChecking] = useState(false);
  const [previewRun, setPreviewRun] = useState(0);
  const [connections, setConnections] = useState({});
  const [chartReady, setChartReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copiedId, setCopiedId] = useState(row.copiedId || "");

  useEffect(() => { adaptationRequestId.current = crypto.randomUUID(); setAdaptError(""); }, [row.id]);

  useEffect(() => {
    let current = true; const controller = new AbortController();
    setLoading(true); setLoadError(""); setSaveError(""); setDetail(null); setPreview(null); setChartReady(false);
    personalGeneration.current += 1;
    setExample(null); setExampleChecking(true); setPersonalRequested(false); setChecking(false); setConnections({});
    requestCommunityDetail(api, kind, row.id, controller.signal).then((result) => {
      if (!current) return;
      setDetail(result); setCopiedId(result.copiedId || row.copiedId || "");
    }).catch((failure) => { if (current) setLoadError(communityError(failure, "This community indicator is unavailable. Please try again.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [api, kind, row.id, row.copiedId, loadRun]);

  const version = detail?.version;
  useEffect(() => {
    if (isc || !version) return undefined;
    let current = true; const controller = new AbortController();
    setExampleChecking(true); setExample(null);
    requestCommunityExample(api, row.id, controller.signal).then((result) => {
      if (current) setExample(result);
    }).catch((failure) => {
      if (current) setExample({ status: "ERROR", message: communityError(failure, "Could not load the sample preview. Please try again.") });
    }).finally(() => { if (current) setExampleChecking(false); });
    return () => { current = false; controller.abort(); };
  }, [api, isc, row.id, version, exampleRun]);

  // The sample has no save capability. Only an explicit attempt runs the
  // viewer-bound pipeline and can obtain a personal preview receipt.
  useEffect(() => {
    if (isc || !version || !personalRequested) return undefined;
    let current = true; const controller = new AbortController();
    const run = ++personalGeneration.current;
    const isCurrent = () => current && run === personalGeneration.current;
    setChecking(true); setPreview(null); setChartReady(false); setSaveError("");
    requestCommunityPreview(api, row.id, connections, controller.signal).then((result) => {
      if (!isCurrent()) return;
      setPreview(result.status === "READY" && result.version !== version
        ? { status: "CHANGED", message: "This indicator changed while the preview was running. Reload its details before saving." }
        : result);
    }).catch((failure) => {
      if (isCurrent()) setPreview({ status: "ERROR", message: communityError(failure, "Could not preview your data. Please try again.") });
    }).finally(() => { if (isCurrent()) setChecking(false); });
    return () => { current = false; controller.abort(); };
  }, [api, isc, row.id, version, personalRequested, previewRun, connections]);

  useEffect(() => {
    if (!personalRequested) return;
    personalSection.current?.focus({ preventScroll: true });
    personalSection.current?.scrollIntoView({ block: "nearest" });
  }, [personalRequested]);
  useEffect(() => {
    if (personalRequested && !checking) personalSection.current?.scrollIntoView({ block: "start" });
  }, [personalRequested, checking, chartReady]);
  const invalidatePersonalPreview = () => {
    personalGeneration.current += 1; setPreview(null); setChartReady(false); setChecking(true); setSaveError("");
  };
  const tryPersonalPreview = () => { invalidatePersonalPreview(); setPersonalRequested(true); setPreviewRun((value) => value + 1); };
  const chooseConnection = (id, value) => {
    invalidatePersonalPreview(); setConnections((previous) => ({ ...previous, [id]: value }));
  };

  const parsed = useMemo(() => {
    if (preview?.status !== "READY" || !preview.previewCode) return {};
    try { return { data: parseChartCode(preview.previewCode, preview.visualizationTypeId || detail?.visualizationTypeId) }; }
    catch { return { error: "The preview returned an unreadable chart. Run the preview again." }; }
  }, [preview, detail?.visualizationTypeId]);
  const parsedExample = useMemo(() => {
    if (example?.status !== "READY" || !example.previewCode) return {};
    try { return { data: parseChartCode(example.previewCode, example.visualizationTypeId || detail?.visualizationTypeId) }; }
    catch { return { error: "The sample preview could not be displayed. Please try again." }; }
  }, [example, detail?.visualizationTypeId]);
  const allowed = !loading && !loadError && Boolean(detail) && (isc || personalRequested && !checking && canSaveCommunityPreview(preview, chartReady));
  const save = async () => {
    if (saving || copiedId || !allowed) return;
    setSaving(true); setSaveError("");
    try {
      const result = await requestCommunityCopy(api, kind, row.id, preview?.receiptId, detail.version);
      if (!result?.id) throw new Error("Missing saved copy.");
      setCopiedId(result.id); onSaved(result.id);
    } catch (failure) {
      setSaveError(communityError(failure, "Could not save this community copy. Please try again."));
      // A rejected receipt is never reused. A new preview verifies any changed
      // template, connections, plugins or expiry before another save attempt.
      if (!isc) { setPreview(null); setChartReady(false); }
    } finally { setSaving(false); }
  };
  const adapt = async () => {
    if (adaptationBusy.current) return;
    adaptationBusy.current = true; setAdapting(true); setAdaptError("");
    try {
      const draft = await requestCommunityAdaptation(api, row.id, adaptationRequestId.current);
      if (!draft?.id) throw new Error("The server did not confirm a draft.");
      navigate(`/indicator/editor/drafts/${encodeURIComponent(draft.id)}`);
    } catch (failure) { setAdaptError(communityError(failure, "Could not start your adaptation. Please try again.")); }
    finally { adaptationBusy.current = false; setAdapting(false); }
  };
  const chartType = preview?.visualizationTypeId || detail?.visualizationTypeId;
  const requirements = detail?.requirements || {};
  const columns = detail?.columns || detail?.dataset?.columns || detail?.inputs || [];
  const requirementsContent = detail && <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            {isc ? <><Field label="Goal">{textOf(requirements.goal) || detail.goal}</Field>
              <Field label="Question">{textOf(requirements.question)}</Field></> : <>
              <Field label="Analytics method">{detail.method || row.method}</Field>
            </>}
            <Columns title={isc ? "Data requirements" : "Method inputs"} columns={columns} />
            {!isc && <Columns title="Output columns" columns={detail.outputs} />}
          </Box>
          {!isc && detail.filters && <Box sx={{ mt: 2 }}><DataFilters filters={detail.filters} /></Box>}
          {!isc && Array.isArray(detail.parameters) && detail.parameters.length > 0 && <Stack sx={{ gap: 1, mt: 2 }}>
            <Typography variant="subtitle2">Method parameters</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
              {detail.parameters.map((parameter, index) => <Field key={index} label={textOf(parameter.name) || "Parameter"}>{textOf(parameter.value)}</Field>)}
            </Box>
          </Stack>}
          {!isc && Array.isArray(detail.sources) && detail.sources.length > 0 && <Stack sx={{ gap: 1, mt: 2 }}>
            <Typography variant="subtitle2">Source indicators</Typography>
            {detail.sources.map((source, index) => <Accordion key={index} disableGutters variant="outlined" sx={{ minWidth: 0, boxShadow: "none", "&::before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`community-source-${index}`} id={`community-source-heading-${index}`}>
                <Stack sx={{ gap: 0.25, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{source.label || `Source ${index + 1}`}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{source.method || "Basic indicator"}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails><Stack sx={{ gap: 2 }}><DataFilters filters={source.filters} />
                <Columns title="Input columns" columns={source.inputs} /><Columns title="Output columns" columns={source.outputs} />
              </Stack></AccordionDetails>
            </Accordion>)}
          </Stack>}
  </>;
  const statusMessage = preview?.message || previewMessages[preview?.status] || "This indicator cannot currently be generated with your data.";
  const suggestAdaptation = personalRequested && !checking && preview && !["READY", "ERROR", "CHANGED", "CHOOSE_CONNECTION"].includes(preview.status);

  return <Dialog open fullWidth maxWidth="lg" fullScreen={fullScreen} onClose={saving || adapting ? undefined : onClose}
    aria-labelledby="community-detail-title" scroll="paper">
    <DialogTitle component="div" sx={{ display: "flex", alignItems: "flex-start", gap: 2, pr: 1 }}>
      <Box component="h2" id="community-detail-title" sx={{ flex: 1, minWidth: 0, m: 0, font: "inherit", overflowWrap: "anywhere" }}>{detail?.name || row.name || "Community indicator"}</Box>
      <IconButton disabled={saving || adapting} aria-label="Close community indicator" onClick={onClose} sx={{ mt: -0.5 }}><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ minWidth: 0, overflowX: "hidden", px: { xs: 2, sm: 3 } }}>
      {loading && <Stack role="status" sx={{ gap: 2 }}><LinearProgress /><Typography>Loading community indicator…</Typography></Stack>}
      {loadError && <Alert severity="error" action={<Button color="inherit" onClick={() => setLoadRun((value) => value + 1)}>Retry</Button>}>{loadError}</Alert>}
      {detail && !loading && <Stack sx={{ gap: 2, minWidth: 0 }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
          <Chip size="small" label={communityTypeName(detail.type || row.type)} />
          {(detail.chart || row.chart) && <Chip size="small" variant="outlined" label={detail.chart || row.chart} />}
          {copiedId && <CommunityCopyBadge />}
        </Stack>
        {!isc && <Paper component="section" aria-label="Community indicator preview" variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap", mb: 1 }}>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>Community preview</Typography>
            <Chip size="small" label="Sample data" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Example of this indicator, shown with sample data.</Typography>
          {exampleChecking && <Stack role="status" sx={{ gap: 1.5 }}><LinearProgress /><Typography variant="body2">Loading sample preview…</Typography></Stack>}
          {!exampleChecking && example?.status === "READY" && parsedExample.data && <ChartPreview previewData={parsedExample.data}
            visualizationTypeId={example.visualizationTypeId || detail.visualizationTypeId} responsive />}
          {!exampleChecking && (example?.status !== "READY" || parsedExample.error || !parsedExample.data) && <Alert
            severity={example?.status === "ERROR" || parsedExample.error ? "error" : "info"}
            action={<Button color="inherit" onClick={() => setExampleRun((value) => value + 1)}>Retry sample preview</Button>}>
            {parsedExample.error || example?.message || "A sample preview is unavailable. You can still try this indicator with your data or adapt it."}
          </Alert>}
        </Paper>}
        {isc ? <Paper component="section" aria-label="ISC specification" variant="outlined" sx={{ p: 2 }}>{requirementsContent}</Paper>
          : <Accordion disableGutters variant="outlined" sx={{ minWidth: 0, boxShadow: "none", "&::before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} id={`${detailsId}-heading`} aria-controls={`${detailsId}-content`}>
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>Indicator details</Typography>
            </AccordionSummary>
            <AccordionDetails>{requirementsContent}</AccordionDetails>
          </Accordion>}
        {(isc || personalRequested) && <Paper ref={personalSection} tabIndex={isc ? undefined : -1} component="section" aria-label={isc ? "Illustrative ISC preview" : "Preview with my data"}
          variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1.5, mb: 2 }}>
            <Box><Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>{isc ? "Illustrative preview" : "Preview with my data"}</Typography>
              <Typography variant="body2" color="text.secondary">{isc ? "Example data shows the specification; it is not the creator’s dataset." : "Uses your registered LRS connections and user identifiers."}</Typography></Box>
            {!isc && <Button variant="contained" size="small" startIcon={<ReplayIcon />} disabled={checking || saving}
              onClick={tryPersonalPreview}>Run preview again</Button>}
          </Stack>
          {isc ? detail.visRef?.chart?.code && detail.visRef?.data?.options && Array.isArray(detail.visRef?.data?.series)
            ? <CommunityIscPreview visRef={detail.visRef} />
            : <Alert severity="info">A chart preview is unavailable. You can still save and edit this specification.</Alert>
            : <>
              {checking && <Stack role="status" sx={{ gap: 1.5 }}><LinearProgress /><Typography variant="body2">Checking every source and generating your preview…</Typography></Stack>}
              {!checking && preview?.status === "READY" && <>
                {parsed.error && <Alert severity="error">{parsed.error}</Alert>}
                {parsed.data && <ChartPreview previewData={parsed.data} visualizationTypeId={chartType} responsive onStatusChange={setChartReady} />}
                {chartReady && <Alert severity="success" sx={{ mt: 2 }}>Your data is compatible. Ready to save.</Alert>}
              </>}
              {!checking && preview && preview.status !== "READY" && <Alert severity={preview.status === "ERROR" ? "error" : "info"}
                action={preview.status === "CHANGED" ? <Button color="inherit" onClick={() => setLoadRun((value) => value + 1)}>Reload details</Button>
                  : (["NO_CONNECTION", "MISSING_LRS"].includes(preview.status) || preview.status === "CHOOSE_CONNECTION" && !preview.choices?.length)
                    && <Button color="inherit" onClick={() => navigate("/manage-lrs")}>Manage LRS</Button>}>
                  <Stack sx={{ gap: 0.5 }}><Typography variant="body2">{statusMessage}</Typography>
                    {suggestAdaptation && <Typography variant="body2">Adapt this indicator to choose selections that match your data.</Typography>}
                  </Stack>
                </Alert>}
              {!checking && Array.isArray(preview?.choices) && preview.choices.length > 0 && <Stack sx={{ gap: 2, mt: 2 }}>
                {preview.choices.map((choice, index) => <TextField key={choice.lrsId || index} select fullWidth size="small" label={choice.lrsTitle || `Your LRS connection ${index + 1}`}
                  value={connections[choice.lrsId] || ""} onChange={(event) => chooseConnection(choice.lrsId, event.target.value)}>
                  {(choice.options || []).map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
                </TextField>)}
              </Stack>}
            </>}
        </Paper>}
        {copiedId && <Alert severity="success">Saved to {isc ? "My ISCs" : "My Indicators"} as a community copy.</Alert>}
        {saveError && <Alert severity="error" action={isc && <Button color="inherit" onClick={() => setLoadRun((value) => value + 1)}>Reload details</Button>}>{saveError}</Alert>}
      </Stack>}
      {adaptError && <Alert severity="error" sx={{ mt: 2 }}>{adaptError}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1, flexWrap: "wrap" }}>
      <Button disabled={saving || adapting} onClick={onClose}>Close</Button>
      {!isc && <Button variant={suggestAdaptation ? "contained" : "outlined"}
        disabled={adapting || saving} startIcon={adapting ? <CircularProgress size={18} color="inherit" /> : <EditOutlinedIcon />} onClick={adapt}>
        {adapting ? "Opening adaptation…" : "Adapt to my data"}
      </Button>}
      {!isc && !personalRequested && <Button variant={copiedId ? "outlined" : "contained"} disabled={loading || Boolean(loadError) || !detail || saving || adapting}
        onClick={tryPersonalPreview}>Try with my data</Button>}
      {copiedId ? <Button variant="contained" disabled={adapting || saving} startIcon={<OpenInNewIcon />} onClick={() => navigate(`${isc ? "/isc" : "/indicator"}/${encodeURIComponent(copiedId)}`)}>
        Open in {isc ? "My ISCs" : "My Indicators"}</Button> : (isc || personalRequested) && <Button variant="contained" disabled={!allowed || saving || adapting}
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveAltIcon />} onClick={save}>
        {saving ? "Saving…" : `Save to ${isc ? "My ISCs" : "My Indicators"}`}
      </Button>}
    </DialogActions>
  </Dialog>;
}
CommunityPoolDetail.propTypes = { kind: PropTypes.oneOf(["indicators", "isc"]).isRequired,
  row: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired };
