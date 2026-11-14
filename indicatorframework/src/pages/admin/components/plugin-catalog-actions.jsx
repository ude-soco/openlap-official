import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, LinearProgress, List, ListItem, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { useNavigationGuard } from "../../../setup/routes-manager/navigation-guard-context.js";
import { getPluginDetails, getPluginHistory, savePluginDetails } from "../utils/plugin-apis.js";
import PluginUploadControl from "./plugin-upload-control";
import PluginRemovalControl from "./plugin-removal-control";

const fields = (details) => Object.fromEntries((details?.editableFields || []).map((field) => [field, details[field] || ""]));
const message = (error) => error?.response?.data?.message || "Could not load plugin details. Retry when the service is available.";

const PluginCatalogActions = ({ kind, entry, onSaved }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const guard = useNavigationGuard();
  const registerGuard = guard?.registerGuard;
  const unregisterGuard = guard?.unregisterGuard;
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(entry.id);
  const [details, setDetails] = useState(null);
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(fields(details));

  const load = useCallback(async (id = selectedId) => {
    setBusy(true); setError("");
    try {
      const [next, versions] = await Promise.all([getPluginDetails(api, kind, id), getPluginHistory(api, kind, id)]);
      setDetails(next); setHistory(versions); setForm(fields(next)); setSelectedId(id);
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }, [api, kind, selectedId]);

  useEffect(() => {
    if (!open || (!dirty && !busy)) return undefined;
    const beforeUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    const prevent = (to) => { if (!busy) setDiscard({ action: "navigate", to }); return true; };
    registerGuard?.(prevent);
    return () => { window.removeEventListener("beforeunload", beforeUnload); unregisterGuard?.(prevent); };
  }, [open, dirty, busy, registerGuard, unregisterGuard]);

  const close = () => { if (!busy) { if (dirty) setDiscard({ action: "close" }); else setOpen(false); } };
  const reload = () => { if (dirty) setDiscard({ action: "reload" }); else load(); };
  const view = (id) => { if (dirty) setDiscard({ action: "view", id }); else load(id); };
  const save = async () => {
    setBusy(true); setError("");
    try {
      const next = await savePluginDetails(api, kind, selectedId, { version: details.version, ...form });
      setDetails(next); setForm(fields(next));
      await onSaved(); enqueueSnackbar("Plugin details saved.", { variant: "success" });
      try { setHistory(await getPluginHistory(api, kind, selectedId)); }
      catch { setError("Details were saved, but version history could not refresh. Reload latest to try again."); }
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };
  const activated = async () => {
    await onSaved();
    try { setHistory(await getPluginHistory(api, kind, selectedId)); } catch (failure) { setError(message(failure)); }
  };

  return <>
    <Button size="small" onClick={() => { setOpen(true); load(entry.id); }}>Details & versions</Button>
    <Dialog open={open} onClose={close} disableEscapeKeyDown={busy} fullWidth fullScreen={fullScreen} maxWidth="md" aria-labelledby="plugin-details-title">
      <DialogTitle id="plugin-details-title">Plugin details & versions</DialogTitle>
      <DialogContent dividers>
        <Stack sx={{ gap: 2 }}>
          {busy && <LinearProgress aria-label="Loading or saving plugin details" />}
          {error && <Alert severity="error" role="alert" action={<Button color="inherit" disabled={busy} onClick={reload}>Reload latest</Button>}>{error}{dirty ? " Your unsaved edits are preserved." : ""}</Alert>}
          {details && <>
            {details.removed && <Alert severity="info">This entry is removed. Restore it to edit or enable it, or create a new version with new catalog IDs.</Alert>}
            <Typography variant="body2" color="text.secondary">Edit display details. Saved indicators keep the same plugin ID, binary and input/output contracts.</Typography>
            {details.editableFields.map((field) => <TextField key={field} label={field === "creator" ? "Creator / attribution" : field === "name" ? "Name" : "Description"}
              value={form[field] || ""} required={field === "name"} multiline={field === "description"} minRows={field === "description" ? 3 : undefined}
              disabled={busy} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: field === "description" ? 10000 : 300 } }}
              helperText={`${(form[field] || "").length}/${field === "description" ? 10000 : 300} characters`} />)}
            {details.library && <Typography variant="body2">Library: {details.library}{details.creator ? ` · ${details.creator}` : ""}</Typography>}
            {details.implementingClass && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>Implementation: {details.implementingClass}</Typography>}
            <Divider />
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, justifyContent: "space-between", alignItems: { sm: "center" } }}>
              <Typography variant="h6" component="h2">Version history</Typography>
              {kind !== "VISUALIZATION_TYPE" && <PluginUploadControl kind={kind === "ANALYTICS_METHOD" ? "ANALYTICS" : "VISUALIZATION"}
                replacementTarget={{ kind, id: selectedId, name: details.name }} disabled={dirty || busy || history?.latest === false} onActivated={activated} />}
            </Stack>
            {dirty && <Typography variant="body2" color="text.secondary">Save or discard your edits before uploading a new version.</Typography>}
            {history?.latest === false && <Alert severity="info">A newer version exists. Open its details below to upload another version.</Alert>}
            {kind === "VISUALIZATION_TYPE" && <Typography variant="body2" color="text.secondary">Chart versions are managed together through their visualization library.</Typography>}
            <List disablePadding aria-label="Plugin version history">
              {(history?.versions || []).map((version, index) => <ListItem key={version.artifactId || version.entries[0]?.id} divider disableGutters sx={{ display: "block" }}>
                <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Chip size="small" label={`Version ${version.ordinal || index + 1}`} title={version.artifactId || "Local version"} />
                  {version.artifactId && <Typography variant="caption" color="text.secondary">{version.artifactId.slice(-64, -52)}</Typography>}
                  {version.selected && <Chip size="small" variant="outlined" label="Viewing this version" />}
                  <Typography variant="caption" color="text.secondary">{version.activatedAt ? new Date(version.activatedAt).toLocaleString() : "Existing installation"}</Typography>
                </Stack>
                {version.entries.map((item) => <Stack key={item.id} direction="row" sx={{ gap: 1, justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                  <Typography variant="body2">{item.name} · {item.removed ? "Removed" : item.enabled ? "Enabled" : "Disabled"}</Typography>
                  {(kind !== "VISUALIZATION_TYPE") && item.id !== selectedId && <Button size="small" disabled={busy} onClick={() => view(item.id)}>View details</Button>}
                </Stack>)}
              </ListItem>)}
            </List>
          </>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <PluginRemovalControl kind={kind} id={selectedId} removed={Boolean(details?.removed)} disabled={busy || dirty || !details}
          onChanged={async () => { setOpen(false); await onSaved(); }} />
        <Button disabled={busy} onClick={reload}>Reload latest</Button><Box sx={{ flexGrow: 1 }} />
        <Button disabled={busy} onClick={close}>Close</Button>
        <Button variant="contained" disabled={busy || !details || !dirty || !form.name?.trim()} onClick={save}>Save details</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={Boolean(discard)} onClose={() => setDiscard(null)} aria-labelledby="discard-plugin-details-title">
      <DialogTitle id="discard-plugin-details-title">Discard unsaved edits?</DialogTitle>
      <DialogContent>Your changes have not been saved. Continue only if you want to discard them.</DialogContent>
      <DialogActions><Button autoFocus onClick={() => setDiscard(null)}>Keep editing</Button><Button color="error" onClick={() => {
        const pending = discard; setDiscard(null); setForm(fields(details));
        if (pending.action === "close") setOpen(false);
        else if (pending.action === "navigate") { setOpen(false); navigate(pending.to); }
        else load(pending.action === "view" ? pending.id : selectedId);
      }}>Discard changes</Button></DialogActions>
    </Dialog>
  </>;
};
PluginCatalogActions.propTypes = { kind: PropTypes.oneOf(["ANALYTICS_METHOD", "VISUALIZATION_LIBRARY", "VISUALIZATION_TYPE"]).isRequired,
  entry: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired, onSaved: PropTypes.func.isRequired };
export default PluginCatalogActions;
