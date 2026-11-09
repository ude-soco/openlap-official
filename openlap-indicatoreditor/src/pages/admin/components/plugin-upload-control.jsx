import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, LinearProgress, List, ListItem,
  ListItemButton, ListItemText, Stack, Step, StepLabel, Stepper, Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { useNavigationGuard } from "../../../setup/routes-manager/navigation-guard-context.js";
import { activatePlugin, getPluginUpload, inspectPlugin, listPluginUploads, uploadPlugin } from "../utils/plugin-apis.js";

const labels = {
  UPLOADED: "Ready for inspection", INSPECTING: "Inspection in progress",
  INSPECTION_FAILED: "Inspection failed", INSPECTED: "Ready for review",
  ACTIVATING: "Activation needs completion", ACTIVE: "Installed",
};
const step = (review) => !review ? 0 : ["UPLOADED", "INSPECTING", "INSPECTION_FAILED"].includes(review.state) ? 1 : review.state === "ACTIVE" ? 3 : 2;
const errorMessage = (error) => error?.response?.data?.message || "The request could not finish. Refresh the review before retrying.";

/** One resumable workflow for both plugin kinds, with a separate consent step before code runs. */
const PluginUploadControl = ({ kind, onActivated }) => {
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
  const heading = useRef(null);
  const analytics = kind === "ANALYTICS";
  const entryLabel = analytics ? "analytics methods" : "visualization library";

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
    try { if (review) setReview(await getPluginUpload(api, review.id)); await load(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(""); }
  };

  const run = async (action) => {
    setError("");
    setBusy(action === "upload" ? "Uploading and validating JAR…" : action === "inspect" ? "Inspecting plugin contracts…" : "Activating all entries…");
    try {
      let next;
      if (action === "upload") {
        next = await uploadPlugin(api, kind, file, (event) => setProgress(event.total ? Math.round(event.loaded / event.total * 100) : null));
        setFile(null);
      } else if (action === "inspect") next = await inspectPlugin(api, review, trusted);
      else next = await activatePlugin(api, review);
      setReview(next);
      setTrusted(false);
      await load();
      if (next.state === "ACTIVE") {
        await onActivated();
        enqueueSnackbar("Plugin installed. Its entries are now available in the catalog.", { variant: "success" });
      }
      // Announce and focus the next stage after its content is rendered.
      requestAnimationFrame(() => heading.current?.focus());
    } catch (failure) {
      setError(errorMessage(failure));
      // A timed-out mutation may have completed. Always recover server state before a retry.
      if (review) {
        try { setReview(await getPluginUpload(api, review.id)); } catch { /* Keep the current review and offer Refresh. */ }
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
    try { setReview(await getPluginUpload(api, item.id)); setFile(null); setTrusted(false); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(""); }
  };

  const available = catalog?.available === true;
  const inspected = review?.inspection;
  const conflicts = review?.conflicts || [];
  const inspecting = ["UPLOADED", "INSPECTION_FAILED", "INSPECTING"].includes(review?.state);
  const inspectionRunning = review?.state === "INSPECTING"
    && Date.now() - new Date(review.inspectionStartedAt).getTime() < 10 * 60 * 1000;

  return <>
    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
      {analytics ? "Add methods" : "Add library"}
    </Button>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} disableEscapeKeyDown={Boolean(busy)} fullWidth fullScreen={fullScreen} maxWidth="md" aria-labelledby="plugin-upload-title">
      <DialogTitle id="plugin-upload-title">Add {entryLabel}</DialogTitle>
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
            {review.state === "ACTIVATING" && <Alert severity="warning">Activation was interrupted or is still finishing. Retry to complete this installation. Unfinished entries remain unavailable.</Alert>}
            {inspecting && <>
              <Alert severity="warning">Contract inspection runs plugin constructors and metadata methods with backend privileges. Only inspect code you trust.</Alert>
              {review.state === "INSPECTING" && <Alert severity="info">Inspection is in progress. Refresh to check its result. A stalled inspection can be retried after 10 minutes.</Alert>}
              <FormControlLabel control={<Checkbox checked={trusted} onChange={(event) => setTrusted(event.target.checked)} disabled={Boolean(busy)} />} label="I trust the source of this JAR and want to inspect its contracts." />
            </>}
            {conflicts.map((conflict) => <Alert severity="warning" key={conflict}>{conflict}</Alert>)}
            {inspected?.library && <Box>
              <Typography variant="subtitle1" fontWeight={600}>{inspected.library.name}</Typography>
              <Typography variant="body2" color="text.secondary">{inspected.library.creator} · {inspected.library.description}</Typography>
            </Box>}
            <List disablePadding aria-label="Discovered plugin entries">
              {(inspected?.entries || review.classes?.map((name) => ({ name, implementingClass: name })) || []).map((entry) => <ListItem key={entry.implementingClass} divider alignItems="flex-start" disableGutters>
                <ListItemText primary={entry.name} secondary={<>
                  <Typography component="span" variant="body2" sx={{ display: "block", overflowWrap: "anywhere" }}>{entry.implementingClass}</Typography>
                  {entry.description && <Typography component="span" variant="body2" sx={{ display: "block" }}>{entry.description}</Typography>}
                  {inspected && <Typography component="span" variant="caption">{entry.inputs?.length || 0} inputs{analytics ? ` · ${entry.outputPorts?.length || 0} outputs · ${Object.keys(entry.parameters?.params || {}).length} parameters` : " · Chart configuration verified"}</Typography>}
                </>} />
              </ListItem>)}
            </List>
            {review.state === "INSPECTED" && conflicts.length === 0 && <Alert severity="info">Activation enables {inspected?.entries?.length || 0} {inspected?.entries?.length === 1 ? "entry" : "entries"}. You can disable them later without affecting saved indicators.</Alert>}
          </Stack>}
          {(catalog?.uploads?.length || 0) > 0 && <>
            <Divider />
            <Typography variant="subtitle2">Recent uploads · resume a saved review</Typography>
            <List dense disablePadding sx={{ maxHeight: 190, overflow: "auto" }}>
              {catalog.uploads.map((item) => <ListItemButton key={item.id} selected={review?.id === item.id} disabled={Boolean(busy)} onClick={() => resume(item)}>
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
        {["INSPECTED", "ACTIVATING"].includes(review?.state) && <Button variant="contained" onClick={() => run("activate")} disabled={!available || conflicts.length > 0 || Boolean(busy)}>{review.state === "ACTIVATING" ? "Complete activation" : "Activate plugin"}</Button>}
      </DialogActions>
    </Dialog>
  </>;
};

PluginUploadControl.propTypes = {
  kind: PropTypes.oneOf(["ANALYTICS", "VISUALIZATION"]).isRequired,
  onActivated: PropTypes.func.isRequired,
};
export default PluginUploadControl;
