import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, List, ListItem, ListItemText, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { disablePlugin, removePlugin, restoreRemovedPlugin, resumePluginRemoval, reviewPluginRemoval } from "../utils/plugin-apis.js";
import { usePluginOperationGuard } from "../utils/use-plugin-operation-guard.js";

const dependencyLabels = { savedIndicators: "Saved indicators", indicatorDrafts: "Indicator drafts", savedCards: "Saved specification cards", cardDrafts: "Specification card drafts", pendingInstallations: "Pending installations", unreadableConfigurations: "Unreadable configurations" };
const message = (error) => error?.response?.data?.message || "The operation could not finish. Refresh the review before retrying.";

const PluginRemovalControl = ({ kind, id, disabled, removed, onChanged }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  usePluginOperationGuard(busy);
  const load = async () => {
    setBusy(true); setError(""); setConfirmed(false);
    try { setPreview(await reviewPluginRemoval(api, kind, id)); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };
  const run = async (action) => {
    setBusy(true); setError("");
    try {
      if (action === "remove") await removePlugin(api, preview);
      else if (action === "restore") await restoreRemovedPlugin(api, preview.removalOperation);
      else if (action === "resume") await resumePluginRemoval(api, preview.removalOperation);
      else await disablePlugin(api, kind, id);
      enqueueSnackbar(action === "restore" ? "Entries restored disabled. Enable them explicitly when ready." : action === "disable" ? "Plugin disabled. Saved indicators remain usable." : "Entries removed. Their recovery records and JARs are retained.", { variant: "success" });
      setOpen(false); await onChanged();
    } catch (failure) {
      setError(message(failure)); setConfirmed(false);
      try { setPreview(await reviewPluginRemoval(api, kind, id)); } catch { /* Keep the last complete review. */ }
    } finally { setBusy(false); }
  };
  const pending = preview?.operation && ["PREPARING", "COMMITTING"].includes(preview.operation.state);
  const restoring = preview?.operation?.state === "RESTORING";
  return <>
    <Button color="error" disabled={disabled} onClick={() => { setOpen(true); load(); }}>{removed ? "Review recovery" : "Review removal"}</Button>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} disableEscapeKeyDown={busy} fullWidth fullScreen={fullScreen} maxWidth="sm" aria-labelledby="plugin-removal-title">
      <DialogTitle id="plugin-removal-title">{preview?.removed || restoring ? "Recover removed entries" : "Review plugin removal"}</DialogTitle>
      <DialogContent dividers><Stack sx={{ gap: 2 }}>
        {busy && <LinearProgress aria-label="Checking plugin references and updating catalog" />}
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {preview && <>
          {!preview.available && <Alert severity="info">Logical removal and recovery are disabled for this deployment until the deployment maintainer completes the guarded rollout.</Alert>}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{preview.name}</Typography>
          <Typography variant="body2">The following entries are affected:</Typography>
          <List dense disablePadding>{((preview.removed || restoring || pending) ? preview.operation.affected : preview.affected).map((entry) => <ListItem key={entry.key} disableGutters><ListItemText primary={entry.name} secondary={entry.kind.replaceAll("_", " ").toLowerCase()} /></ListItem>)}</List>
          {Object.entries(preview.dependencies || {}).filter(([, count]) => count > 0).map(([key, count]) => <Alert severity="warning" key={key}>{dependencyLabels[key] || key}: {count}</Alert>)}
          {preview.inFlightWrites > 0 && <Alert severity="warning">{preview.inFlightWrites} save reservations are unfinished. Removal stays blocked until they are resolved.</Alert>}
          {!preview.removed && !pending && !restoring && !preview.canRemove && <Typography variant="body2" color="text.secondary">Use Disable to retire an entry while preserving saved work. Drafts and pending operations are checked separately from dashboard usage counts.</Typography>}
          {preview.sharedArtifactEntries > 0 && <Alert severity="info">{preview.sharedArtifactEntries} other catalog entries share this JAR. Removing these entries never deletes their shared binary.</Alert>}
          {preview.removed || restoring ? <Alert severity="info">The recovery window ends {new Date(preview.operation.recoverableUntil).toLocaleString()}. Restored entries start disabled.</Alert> : <Typography variant="body2" color="text.secondary">Recovery records and JARs are retained for at least {preview.retentionDays} days. Physical artifact cleanup requires separate approval and another reference check.</Typography>}
          {preview.canRemove && <FormControlLabel control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />} label="Remove the listed entries from the catalog." />}
        </>}
      </Stack></DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
        <Button disabled={busy} onClick={load}>Refresh review</Button><Box sx={{ flexGrow: 1 }} />
        <Button disabled={busy} onClick={() => setOpen(false)}>Close</Button>
        {preview && !preview.removed && !pending && !restoring && <Button disabled={busy} onClick={() => run("disable")}>Disable instead</Button>}
        {preview?.canRemove && <Button color="error" variant="contained" disabled={busy || !confirmed} onClick={() => run("remove")}>Remove entries</Button>}
        {pending && <Button variant="contained" disabled={busy || !preview.available} onClick={() => run("resume")}>Resume removal</Button>}
        {(preview?.removed || restoring) && <Button variant="contained" disabled={busy || !preview.available} onClick={() => run("restore")}>{restoring ? "Resume recovery" : "Restore disabled"}</Button>}
      </DialogActions>
    </Dialog>
  </>;
};
PluginRemovalControl.propTypes = { kind: PropTypes.string.isRequired, id: PropTypes.string.isRequired, disabled: PropTypes.bool, removed: PropTypes.bool, onChanged: PropTypes.func.isRequired };
export default PluginRemovalControl;
