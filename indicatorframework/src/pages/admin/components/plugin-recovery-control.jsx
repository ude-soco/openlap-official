import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, LinearProgress, List, ListItem, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { cleanupPluginArtifacts, listRemovedPlugins, restoreRemovedPlugin, resumePluginRemoval, reviewArtifactCleanup } from "../utils/plugin-apis.js";
import { usePluginOperationGuard } from "../utils/use-plugin-operation-guard.js";

const message = (error) => error?.response?.data?.message || "Could not complete this request. Refresh before retrying.";
const PluginRecoveryControl = ({ kind, onChanged }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cleanup, setCleanup] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  usePluginOperationGuard(busy);
  const load = async () => { setBusy(true); setError(""); try { setData(await listRemovedPlugins(api, kind)); } catch (failure) { setError(message(failure)); } finally { setBusy(false); } };
  const recover = async (entry) => {
    setBusy(true); setError("");
    try {
      if (["PREPARING", "COMMITTING"].includes(entry.state)) await resumePluginRemoval(api, entry.id); else await restoreRemovedPlugin(api, entry.id);
      await onChanged(); setData(await listRemovedPlugins(api, kind));
      enqueueSnackbar(entry.state === "REMOVED" || entry.state === "RESTORING" ? "Entries restored disabled." : "Removal completed.", { variant: "success" });
    } catch (failure) { setError(message(failure)); } finally { setBusy(false); }
  };
  const reviewCleanup = async () => { setBusy(true); setError(""); setConfirmed(false); try { setCleanup(await reviewArtifactCleanup(api)); } catch (failure) { setError(message(failure)); } finally { setBusy(false); } };
  const purge = async () => {
    setBusy(true); setError("");
    try {
      const result = await cleanupPluginArtifacts(api, cleanup.artifacts.filter((item) => item.eligible).map((item) => item.id));
      enqueueSnackbar(`${result.purged} artifacts cleaned; ${result.failedArtifactIds.length} need a retry.`, { variant: result.failedArtifactIds.length ? "warning" : "success" });
      setConfirmed(false); setCleanup(await reviewArtifactCleanup(api));
    } catch (failure) { setError(message(failure)); } finally { setConfirmed(false); setBusy(false); }
  };
  const eligible = cleanup?.artifacts?.filter((item) => item.eligible) || [];
  return <>
    <Button variant="outlined" onClick={() => { setOpen(true); load(); }}>Removed entries</Button>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} disableEscapeKeyDown={busy} fullScreen={fullScreen} fullWidth maxWidth="md" aria-labelledby="removed-plugins-title">
      <DialogTitle id="removed-plugins-title">Removed entries & recovery</DialogTitle>
      <DialogContent dividers><Stack sx={{ gap: 2 }}>
        {busy && <LinearProgress aria-label="Loading recovery records" />}
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {data?.available === false && <Alert severity="info">Logical removal and recovery are disabled until the deployment maintainer completes the guarded rollout.</Alert>}
        {data?.cleanupAvailable === false && <Alert severity="info">Physical artifact deletion is disabled. Removed entries can still be recovered when recovery is enabled; their stored JARs are retained.</Alert>}
        {data?.entries?.length === 0 && <Typography color="text.secondary">No removed entries found.</Typography>}
        <List disablePadding>{(data?.entries || []).map((entry) => <ListItem key={entry.id} divider disableGutters sx={{ display: "block" }}>
          <Typography sx={{ fontWeight: 600 }}>{entry.name}</Typography>
          <Typography variant="body2">{entry.affected.map((row) => row.name).join(", ")}</Typography>
          <Typography variant="body2" color="text.secondary">{entry.affected.length} entries · {entry.state.toLowerCase()} · Recoverable until {new Date(entry.recoverableUntil).toLocaleString()}</Typography>
          <Button disabled={busy || !data.available || (entry.state === "REMOVED" && new Date(entry.recoverableUntil).getTime() < Date.now())} onClick={() => recover(entry)}>
            {["PREPARING", "COMMITTING"].includes(entry.state) ? "Resume removal" : entry.state === "RESTORING" ? "Resume recovery" : "Restore disabled"}
          </Button>
        </ListItem>)}</List>
        <Divider />
        <Box><Button disabled={busy} onClick={reviewCleanup}>Review artifact retention cleanup</Button></Box>
        {cleanup && <>
          {cleanup.available === false && data?.cleanupAvailable !== false && <Alert severity="info">Physical artifact deletion is disabled for this deployment.</Alert>}
          <Alert severity="info">Only artifacts older than {cleanup.retentionDays} days with no protected catalog entries, saves or pending installations can be cleaned. Removed catalog records and version history are retained.</Alert>
          <Typography>{eligible.length} {eligible.length === 1 ? "artifact is" : "artifacts are"} currently eligible.</Typography>
          <List dense disablePadding sx={{ maxHeight: 250, overflow: "auto" }}>{cleanup.artifacts.map((item) => <ListItem key={item.id} disableGutters sx={{ display: "block" }}>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{item.id}</Typography>
            <Typography variant="caption" color="text.secondary">{item.eligible ? "Eligible for cleanup" : item.reason} · {(item.sizeBytes / 1024 / 1024).toFixed(2)} MiB</Typography>
          </ListItem>)}</List>
          {eligible.length > 0 && <>
            <FormControlLabel control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy || !cleanup.available} />} label="Permanently delete eligible stored JARs. This cannot be undone." />
            <Box><Button variant="contained" color="error" disabled={busy || !confirmed || !cleanup.available} onClick={purge}>Clean expired artifacts</Button></Box>
          </>}
        </>}
      </Stack></DialogContent>
      <DialogActions sx={{ p: 2 }}><Button disabled={busy} onClick={load}>Refresh</Button><Button disabled={busy} onClick={() => setOpen(false)}>Close</Button></DialogActions>
    </Dialog>
  </>;
};
PluginRecoveryControl.propTypes = { kind: PropTypes.string.isRequired, onChanged: PropTypes.func.isRequired };
export default PluginRecoveryControl;
