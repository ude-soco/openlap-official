import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, LinearProgress, List, ListItem,
  ListItemButton, ListItemText, Stack, Step, StepLabel, Stepper, Typography,
  TextField, MenuItem, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { useNavigationGuard } from "../../../setup/routes-manager/navigation-guard-context.js";
import { activatePlugin, configurePluginReplacement, getPluginUpload, inspectPlugin, listPluginUploads, retirePreviousPlugin, uploadPlugin } from "../utils/plugin-apis.js";

const labels = {
  UPLOADED: "Ready for inspection", INSPECTING: "Inspection in progress",
  INSPECTION_FAILED: "Inspection failed", INSPECTED: "Ready for review",
  ACTIVATING: "Activation needs completion", ACTIVE: "Installed",
};
const step = (review) => !review ? 0 : ["UPLOADED", "INSPECTING", "INSPECTION_FAILED"].includes(review.state) ? 1 : review.state === "ACTIVE" ? 3 : 2;
const errorMessage = (error) => error?.response?.data?.message || "The request could not finish. Refresh the review before retrying.";

/** One resumable workflow for both plugin kinds, with a separate consent step before code runs. */
const PluginUploadControl = ({ kind, onActivated, replacementTarget, disabled = false }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const guard = useNavigationGuard();
  const registerGuard = guard?.registerGuard;
  const unregisterGuard = guard?.unregisterGuard;
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [review, setReview] = useState(null);
  const [file, setFile] = useState(null);
  const [trusted, setTrusted] = useState(false);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [mappings, setMappings] = useState({});
  const [retireConfirmed, setRetireConfirmed] = useState(false);
  const heading = useRef(null);
  const analytics = kind === "ANALYTICS";
  const entryLabel = analytics ? "analytics methods" : "visualization library";
  const replacing = Boolean(review?.replacementTarget || replacementTarget);
  const applyReview = (next) => {
    if (next?.id !== review?.id) {
      const previous = next?.replacementSource?.entries || [];
      setMappings(next?.replacement?.mappings || Object.fromEntries(previous.map((row) => [row.id,
        next.classes?.includes(row.implementingClass) ? row.implementingClass : null])));
    }
    setRetireConfirmed(false); setReview(next);
  };

  const load = useCallback(async () => {
    try { setCatalog(await listPluginUploads(api, kind)); }
    catch (failure) { setError(errorMessage(failure)); }
  }, [api, kind]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    if (!busy) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    const prevent = () => {
      enqueueSnackbar("Wait for this plugin operation to finish before leaving.", { variant: "info" });
      return true;
    };
    registerGuard?.(prevent);
    return () => { window.removeEventListener("beforeunload", warn); unregisterGuard?.(prevent); };
  }, [busy, enqueueSnackbar, registerGuard, unregisterGuard]);

  const refresh = async () => {
    setBusy("Refreshing review…");
    setError("");
    try {
      if (review) {
        const next = await getPluginUpload(api, review.id); applyReview(next);
        if (next.state === "ACTIVE") await onActivated();
      }
      await load();
    }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(""); }
  };

  const run = async (action) => {
    setError("");
    setBusy(action === "upload" ? "Uploading and validating JAR…" : action === "inspect" ? "Inspecting plugin contracts…"
      : action === "mapping" ? "Saving replacement mapping…" : action === "retire" ? "Disabling the previous version…" : "Activating all entries…");
    try {
      let next;
      if (action === "upload") {
        next = await uploadPlugin(api, kind, file, (event) => setProgress(event.total ? Math.round(event.loaded / event.total * 100) : null), replacementTarget);
        setFile(null);
      } else if (action === "inspect") next = await inspectPlugin(api, review, trusted);
      else if (action === "mapping") {
        const source = review.replacementSource;
        const rows = [...source.entries, ...(source.library ? [source.library] : [])];
        next = await configurePluginReplacement(api, review, { mappings, expectedVersions: Object.fromEntries(rows.map((row) => [row.id, row.version])) });
      } else if (action === "retire") next = await retirePreviousPlugin(api, review);
      else next = await activatePlugin(api, review);
      applyReview(next);
      setTrusted(false);
      await load();
      if (next.state === "ACTIVE") {
        await onActivated();
        enqueueSnackbar(action === "retire" ? "The previous version is disabled. Saved indicators keep using it."
          : "Plugin installed. Its entries are now available in the catalog.", { variant: "success" });
      }
      // Announce and focus the next stage after its content is rendered.
      requestAnimationFrame(() => heading.current?.focus());
    } catch (failure) {
      setError(errorMessage(failure));
      // A timed-out mutation may have completed. Always recover server state before a retry.
      if (review) {
        try {
          const next = await getPluginUpload(api, review.id); applyReview(next);
          if (next.state === "ACTIVE") await onActivated();
        } catch { /* Keep the current review and offer Refresh. */ }
      }
      await load();
    } finally { setBusy(""); setProgress(null); }
  };

  const choose = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!/^[\w.-]+\.jar$/i.test(selected.name) || selected.name.includes("..") || selected.name.length > 255 || selected.size === 0 || selected.size > 100 * 1024 * 1024) {
      setError("Choose a nonempty .jar file up to 100 MiB. Use letters, numbers, dots, dashes or underscores in its filename.");
      return;
    }
    setFile(selected); setError("");
  };

  const resume = async (item) => {
    setBusy("Loading saved review…"); setError("");
    try { applyReview(await getPluginUpload(api, item.id)); setFile(null); setTrusted(false); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(""); }
  };

  const available = catalog?.available === true;
  const inspected = review?.inspection;
  const conflicts = review?.conflicts || [];
  const inspecting = ["UPLOADED", "INSPECTION_FAILED", "INSPECTING"].includes(review?.state);
  const inspectionRunning = review?.state === "INSPECTING"
    && Date.now() - new Date(review.inspectionStartedAt).getTime() < 10 * 60 * 1000;
  const mappingSaved = !replacing || (review?.replacement && JSON.stringify(review.replacement.mappings) === JSON.stringify(mappings));
  const previousEnabled = (review?.retirementTargets || []).filter((row) => row.enabled);
  const reviewedLibrary = review?.replacement?.library || inspected?.library;
  const recentUploads = (catalog?.uploads || []).filter((item) => !replacementTarget || item.replacementTarget?.targetId === replacementTarget.id);
  const reviewedEntries = (inspected?.entries || review?.classes?.map((name) => ({ name, implementingClass: name })) || []).map((entry) => {
    const old = review?.replacement?.entries.find((row) => review.replacement.mappings[row.id] === entry.implementingClass);
    return old ? { ...entry, name: old.name, description: old.description, enabled: old.enabled } : entry;
  });

  return <>
    <Button variant={replacementTarget ? "outlined" : "contained"} disabled={disabled} startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
      {replacementTarget ? "Upload new version" : analytics ? "Add methods" : "Add library"}
    </Button>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} disableEscapeKeyDown={Boolean(busy)} fullWidth fullScreen={fullScreen} maxWidth="md" aria-labelledby="plugin-upload-title">
      <DialogTitle id="plugin-upload-title">{replacing ? "New version of" : "Add"} {entryLabel}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2.5}>
          <Stepper activeStep={step(review)} alternativeLabel>
            {["Upload", "Inspect", "Review & activate"].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
          <Typography variant="body2" color="text.secondary">
            Upload a JAR, inspect its contracts, then review every discovered entry before activation. Existing plugins and indicators keep their current versions.
          </Typography>
          {error && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={refresh} disabled={Boolean(busy)}>Refresh</Button>}>{error}</Alert>}
          {!catalog && !error && <LinearProgress aria-label="Checking plugin storage" />}
          {catalog?.available === false && <Alert severity="info">Uploads will be available after the deployment maintainer configures plugin storage and completes the existing-artifact migration.</Alert>}
          {busy && <Box role="status" aria-live="polite">
            <Typography variant="body2" sx={{ mb: 1 }}>{busy}{progress === 100 ? " Transfer complete; validating on the server…" : ""}</Typography>
            <LinearProgress variant={progress !== null && progress < 100 ? "determinate" : "indeterminate"} value={progress || 0} aria-label={busy} />
          </Box>}
          {!review ? <Stack gap={1.5}>
            <Typography ref={heading} tabIndex={-1} variant="h6" component="h2">Choose a plugin JAR</Typography>
            <Typography variant="body2" color="text.secondary">Maximum 100 MiB. {analytics ? "The archive must contain public AnalyticsMethod implementations." : "The archive must contain one VisualizationLibraryInfo implementation and at least one chart type."} Upload validation does not execute plugin code.</Typography>
            <Box><Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />} disabled={!available || Boolean(busy)}>
              {file ? "Change file" : "Choose JAR"}<input type="file" accept=".jar" hidden onChange={choose} />
            </Button></Box>
            {file && <Typography variant="body2">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MiB</Typography>}
          </Stack> : <Stack gap={2}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography ref={heading} tabIndex={-1} variant="h6" component="h2" sx={{ overflowWrap: "anywhere" }}>{review.filename}</Typography>
              <Chip label={labels[review.state] || review.state} color={review.state === "ACTIVE" ? "success" : "default"} size="small" />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>SHA-256: {review.sha256}</Typography>
            {review.lastError && <Alert severity="error">{review.lastError}</Alert>}
            {review.state === "ACTIVE" && <Alert severity="success">Installation complete. All entries are available in the catalog. Re-uploading these bytes reopens this installation.</Alert>}
            {review.state === "ACTIVE" && previousEnabled.length > 0 && <Stack gap={1}>
              <Alert severity="info">The new version is installed. You can now disable the previous version for new selections. Saved indicators keep their original versions.</Alert>
              <Typography variant="body2">Previous entries: {previousEnabled.map((row) => row.name).join(", ")}</Typography>
              <FormControlLabel control={<Checkbox checked={retireConfirmed} onChange={(event) => setRetireConfirmed(event.target.checked)} disabled={Boolean(busy)} />} label="Disable the listed previous entries for new selections." />
              <Box><Button variant="outlined" disabled={Boolean(busy) || !retireConfirmed} onClick={() => run("retire")}>Disable previous version</Button></Box>
            </Stack>}
            {review.state === "ACTIVATING" && <Alert severity="warning">Activation was interrupted or is still finishing. Retry to complete this installation. Unfinished entries remain unavailable.</Alert>}
            {inspecting && <>
              <Alert severity="warning">Contract inspection runs plugin constructors and metadata methods with backend privileges. Only inspect code you trust.</Alert>
              {review.state === "INSPECTING" && <Alert severity="info">Inspection is in progress. Refresh to check its result. A stalled inspection can be retried after 10 minutes.</Alert>}
              <FormControlLabel control={<Checkbox checked={trusted} onChange={(event) => setTrusted(event.target.checked)} disabled={Boolean(busy)} />} label="I trust the source of this JAR and want to inspect its contracts." />
            </>}
            {conflicts.map((conflict) => <Alert severity="warning" key={conflict}>{conflict}</Alert>)}
            {replacing && review.state === "INSPECTED" && <Stack gap={1.5}>
              <Typography variant="subtitle1" component="h2" fontWeight={600}>Map the previous entries</Typography>
              <Typography variant="body2" color="text.secondary">Mapped entries keep their edited details and enabled or disabled state. New contracts come from this JAR. Unmapped new entries start enabled; an old entry with no replacement remains usable through its original ID.</Typography>
              {(review.replacementSource?.entries || []).map((row) => <TextField select key={row.id} label={row.name || row.implementingClass}
                value={mappings[row.id] || ""} disabled={Boolean(busy)} onChange={(event) => setMappings((current) => ({ ...current, [row.id]: event.target.value || null }))}
                helperText={`${row.enabled ? "Enabled" : "Disabled"} in the previous version`}>
                <MenuItem value="">No replacement in this JAR</MenuItem>
                {(inspected?.entries || []).map((entry) => <MenuItem key={entry.implementingClass} value={entry.implementingClass}>{entry.name} · {entry.implementingClass}</MenuItem>)}
              </TextField>)}
              <Box><Button variant="outlined" disabled={Boolean(busy) || !available} onClick={() => run("mapping")}>Save replacement mapping</Button></Box>
              {review.replacement && mappingSaved && <Alert severity="success">Replacement mapping saved. Review the resulting entries below before activation.</Alert>}
            </Stack>}
            {reviewedLibrary && <Box>
              <Typography variant="subtitle1" fontWeight={600}>{reviewedLibrary.name}</Typography>
              <Typography variant="body2" color="text.secondary">{reviewedLibrary.creator} · {reviewedLibrary.description}</Typography>
              {reviewedLibrary.enabled === false && <Alert severity="info">This library starts disabled, preserving its previous status.</Alert>}
            </Box>}
            <List disablePadding aria-label="Discovered plugin entries">
              {reviewedEntries.map((entry) => <ListItem key={entry.implementingClass} divider alignItems="flex-start" disableGutters>
                <ListItemText primary={entry.name} secondary={<>
                  <Typography component="span" variant="body2" sx={{ display: "block", overflowWrap: "anywhere" }}>{entry.implementingClass}</Typography>
                  {entry.description && <Typography component="span" variant="body2" sx={{ display: "block" }}>{entry.description}</Typography>}
                  {entry.enabled === false && <Typography component="span" variant="body2" sx={{ display: "block" }}>Starts disabled, preserving the previous entry’s status.</Typography>}
                  {inspected && <Typography component="span" variant="caption">{entry.inputs?.length || 0} inputs{analytics ? ` · ${entry.outputPorts?.length || 0} outputs · ${Object.keys(entry.parameters?.params || {}).length} parameters` : " · Chart configuration verified"}</Typography>}
                </>} />
              </ListItem>)}
            </List>
            {review.state === "INSPECTED" && conflicts.length === 0 && <Alert severity="info">{replacing ? "Activation installs the reviewed version and preserves the mapped statuses." : `Activation enables ${inspected?.entries?.length || 0} ${inspected?.entries?.length === 1 ? "entry" : "entries"}.`} You can disable entries later without affecting saved indicators.</Alert>}
          </Stack>}
          {recentUploads.length > 0 && <>
            <Divider />
            <Typography variant="subtitle2">Recent uploads · resume a saved review</Typography>
            <List dense disablePadding sx={{ maxHeight: 190, overflow: "auto" }}>
              {recentUploads.map((item) => <ListItemButton key={item.id} selected={review?.id === item.id} disabled={Boolean(busy)} onClick={() => resume(item)}>
                <ListItemText primary={item.filename} secondary={`${labels[item.state] || item.state} · ${new Date(item.createdAt).toLocaleString()}`} />
              </ListItemButton>)}
            </List>
          </>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: "wrap" }}>
        {review && <Button disabled={Boolean(busy)} onClick={() => { setReview(null); setFile(null); setTrusted(false); setError(""); }}>Choose another JAR</Button>}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={() => setOpen(false)} disabled={Boolean(busy)}>{review?.state === "ACTIVE" ? "Done" : "Close"}</Button>
        {review && review.state !== "ACTIVE" && <Button onClick={refresh} disabled={Boolean(busy)}>Refresh review</Button>}
        {!review && <Button variant="contained" onClick={() => run("upload")} disabled={!available || !file || Boolean(busy)}>Upload & validate</Button>}
        {inspecting && <Button variant="contained" onClick={() => run("inspect")} disabled={!available || !trusted || inspectionRunning || Boolean(busy)}>{review.state === "UPLOADED" ? "Inspect contracts" : "Retry inspection"}</Button>}
        {["INSPECTED", "ACTIVATING"].includes(review?.state) && <Button variant="contained" onClick={() => run("activate")} disabled={!available || conflicts.length > 0 || !mappingSaved || Boolean(busy)}>{review.state === "ACTIVATING" ? "Complete activation" : "Activate plugin"}</Button>}
      </DialogActions>
    </Dialog>
  </>;
};

PluginUploadControl.propTypes = {
  kind: PropTypes.oneOf(["ANALYTICS", "VISUALIZATION"]).isRequired,
  onActivated: PropTypes.func.isRequired,
  replacementTarget: PropTypes.shape({ kind: PropTypes.oneOf(["ANALYTICS_METHOD", "VISUALIZATION_LIBRARY"]).isRequired, id: PropTypes.string.isRequired, name: PropTypes.string }),
  disabled: PropTypes.bool,
};
export default PluginUploadControl;
