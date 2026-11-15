import { useState } from "react";
import PropTypes from "prop-types";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";

const TYPE_NAMES = { BASIC: "basic", COMPOSITE: "composite", MULTI_LEVEL: "multilevel analysis" };
// eslint-disable-next-line react-refresh/only-export-components
export const defaultDraftName = (type) => `Untitled ${TYPE_NAMES[type] || ""} indicator`.replace(/ +/g, " ");
const timeOf = (value) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "";

export function DraftStatus({ draft }) {
  const text = draft.saving ? "Saving draft…"
    : draft.status === "saved" ? `Draft saved${timeOf(draft.updatedAt) ? ` · ${timeOf(draft.updatedAt)}` : ""}`
    : draft.status === "unsaved" ? "Unsaved changes"
    : draft.status === "error" ? (draft.localAvailable ? "Couldn’t save online · recovery kept on this device" : "Couldn’t save · browser recovery unavailable")
    : draft.status === "conflict" ? "A newer draft version needs your review"
    : draft.status === "recovery" ? "Browser recovery available"
    : draft.status === "pending" ? "Previous draft action needs confirmation"
    : draft.status === "completed" ? "Indicator saved"
    : draft.status === "discarded" ? "Draft discarded"
    : "Your draft will save when you start editing";
  return <Typography variant="caption" color="text.secondary" role="status" aria-live="polite">{text}</Typography>;
}
DraftStatus.propTypes = { draft: PropTypes.object.isRequired };

export default function DraftHeader({ name, onNameChange, indicatorType, draft, onSaveAndExit, onDiscard }) {
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const act = async (action) => {
    setActionBusy(true);
    setActionError("");
    try { await action(); }
    catch (error) { setActionError(error?.message || "Couldn’t finish this action. Your work is still here."); }
    finally { setActionBusy(false); }
  };
  const blocked = draft.finalizing || draft.saving || actionBusy || Boolean(draft.recovery || draft.conflict);
  return <Stack sx={{ gap: 1.5 }}>
    <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2, alignItems: { md: "flex-start" } }}>
      <Stack sx={{ flex: 1, minWidth: 0, gap: 0.75 }}>
        <TextField fullWidth disabled={draft.finalizing || actionBusy} label="Indicator name" value={name} onChange={(event) => onNameChange(event.target.value)}
          placeholder={defaultDraftName(indicatorType)} slotProps={{ htmlInput: { maxLength: 300 } }}
          helperText="A working name helps you find this draft in My Indicators." />
        <DraftStatus draft={draft} />
      </Stack>
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", pt: { md: 1 } }}>
        <Button variant="outlined" disabled={blocked || (!draft.draftId && !draft.dirty)} onClick={() => act(draft.flush)}>Save draft</Button>
        <Button variant="contained" disabled={blocked || (!draft.draftId && !draft.dirty)} onClick={() => act(onSaveAndExit)}>Save draft and exit</Button>
        {onDiscard && <Button color="error" disabled={blocked} onClick={onDiscard}>Discard draft</Button>}
      </Stack>
    </Stack>
    {draft.pendingTerminal && <Alert severity="warning">
      {draft.pendingTerminal.kind === "complete"
        ? "The previous save has not been confirmed. Your selections are locked while we check it, so retrying cannot create a second indicator."
        : "The previous discard has not been confirmed. Check its result before editing or starting another action."}
      {draft.error && <Typography variant="body2" sx={{ mt: 1 }}>{draft.error}</Typography>}
      <Button sx={{ mt: 1 }} variant="contained" disabled={draft.saving || actionBusy} onClick={() => act(draft.retry)}>
        {draft.pendingTerminal.kind === "complete" ? "Resume previous save" : "Check previous discard"}
      </Button>
    </Alert>}
    {(draft.error || actionError) && !draft.conflict && !draft.pendingTerminal && <Alert severity="error" action={<Button color="inherit" size="small" disabled={draft.saving || actionBusy} onClick={() => act(draft.retry)}>Retry save</Button>}>{draft.error || actionError}</Alert>}
    {!draft.localAvailable && draft.status !== "error" && <Alert severity="warning">Browser recovery is unavailable. Confirm “Draft saved” before leaving this page.</Alert>}
    {draft.recovery && !draft.pendingTerminal && !draft.closedReceipt && <Alert severity="info">
      Unsaved changes from this account and environment are available on this device. Review them before continuing.
      <Stack direction="row" sx={{ mt: 1, gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={draft.restoreRecovery}>Restore recovered changes</Button>
        <Button onClick={draft.dismissRecovery}>{draft.draftId ? "Use server draft" : "Start without recovery"}</Button>
      </Stack>
    </Alert>}
    {draft.conflict && <Alert severity="warning">
      {draft.conflict.message || "This draft was changed in another tab or device. Your changes have not overwritten that version."}
      <Stack direction="row" sx={{ mt: 1, gap: 1, flexWrap: "wrap" }}>
        {!draft.closedReceipt && <Button disabled={draft.saving || actionBusy} onClick={() => act(draft.reloadLatest)}>Reload latest draft</Button>}
        {draft.closedReceipt?.savedIndicatorId && <Button href={`/indicator/${encodeURIComponent(draft.closedReceipt.savedIndicatorId)}`} target="_blank" rel="noopener noreferrer">View saved indicator</Button>}
        <Button variant="contained" disabled={draft.saving || actionBusy} onClick={() => act(draft.saveAsSeparateDraft)}>Save as separate draft</Button>
      </Stack>
    </Alert>}
  </Stack>;
}
DraftHeader.propTypes = {
  name: PropTypes.string.isRequired, onNameChange: PropTypes.func.isRequired,
  indicatorType: PropTypes.string.isRequired, draft: PropTypes.object.isRequired,
  onSaveAndExit: PropTypes.func.isRequired, onDiscard: PropTypes.func,
};

export function DraftLeaveDialog({ open, busy, error, onStay, onSaveAndExit, onDiscardAndExit, discardOnly = false }) {
  return <Dialog open={Boolean(open)} onClose={busy ? undefined : onStay} aria-labelledby="indicator-draft-leave-title">
    <DialogTitle id="indicator-draft-leave-title">{discardOnly ? "Discard this draft?" : "Leave this editor?"}</DialogTitle>
    <DialogContent>
      <Typography>{discardOnly
        ? "This removes the private draft and its recovered changes. Previously saved indicators remain unchanged."
        : "Save your latest changes as a private draft to continue later. Discarding this draft leaves previously saved indicators unchanged."}</Typography>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
      <Button disabled={busy} onClick={onStay}>Stay here</Button>
      {onDiscardAndExit && <Button color="error" variant={discardOnly ? "contained" : "text"} disabled={busy} onClick={onDiscardAndExit}>{discardOnly ? (busy ? "Discarding…" : "Discard draft") : "Discard draft and leave"}</Button>}
      {!discardOnly && <Button variant="contained" disabled={busy} onClick={onSaveAndExit}>{busy ? "Saving…" : "Save draft and leave"}</Button>}
    </DialogActions>
  </Dialog>;
}
DraftLeaveDialog.propTypes = {
  open: PropTypes.bool, busy: PropTypes.bool, error: PropTypes.string,
  discardOnly: PropTypes.bool,
  onStay: PropTypes.func.isRequired, onSaveAndExit: PropTypes.func.isRequired,
  onDiscardAndExit: PropTypes.func,
};
