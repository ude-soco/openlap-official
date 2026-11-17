import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import PageHeader from "../../../../common/components/page-header/page-header.jsx";
import { createIndicatorDraftApi, draftErrorMessage } from "./indicator-draft-api.js";
import { removeDraftRecovery } from "./indicator-draft-storage.js";
import { closedRecoveryRequest } from "./closed-draft-recovery.js";

export default function ClosedDraftRecovery({ api, receipt, recovery, onOpen, onBack }) {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const alive = useRef(true);
  const action = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const copy = async () => {
    if (action.current) return;
    action.current = true;
    setBusy(true);
    setError("");
    try {
      const created = await createIndicatorDraftApi(api, { initialDraft: receipt }).create(closedRecoveryRequest(recovery));
      if (!created?.id || !Number.isSafeInteger(created.revision)
        || !["DRAFT", "COMPLETED"].includes(created.status)
        || (created.status === "COMPLETED" && !created.savedIndicatorId)) {
        throw new Error("The server has not confirmed a usable recovery draft. Your browser copy is still here.");
      }
      const removed = removeDraftRecovery(recovery);
      enqueueSnackbar(removed.ok ? "Recovered changes kept as a separate draft."
        : "Recovery saved. The older browser copy could not be cleared.", { variant: removed.ok ? "success" : "warning" });
      if (alive.current) onOpen(created);
    } catch (failure) { if (alive.current) setError(draftErrorMessage(failure)); }
    finally { action.current = false; if (alive.current) setBusy(false); }
  };
  const discard = () => {
    if (!removeDraftRecovery(recovery).ok) {
      setError("Could not remove this browser recovery. Your saved indicators are unchanged.");
      setConfirmDiscard(false);
      return;
    }
    onBack();
  };
  return <Stack sx={{ gap: 3 }}>
    <PageHeader title="Browser recovery available" breadcrumbs={[{ label: "My Indicators", to: "/indicator" }]} />
    <Alert severity="info">
      {receipt.status === "COMPLETED" ? "This draft has already been saved as an indicator." : "This draft has already been discarded."}
      {" "}A recovery copy for this account is still stored in this browser. Keep it as a separate private draft to review the changes. Previously saved indicators stay unchanged.
    </Alert>
    <Stack sx={{ gap: 1 }}>
      <Typography variant="h6">{recovery.name || "Untitled indicator"}</Typography>
      <Typography variant="body2" color="text.secondary">The browser copy is retained until the server confirms its new draft.</Typography>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
      <Button variant="contained" disabled={busy} onClick={copy}>{busy ? "Keeping recovery…" : "Keep as separate draft"}</Button>
      {receipt.savedIndicatorId && <Button variant="outlined" href={`/indicator/${encodeURIComponent(receipt.savedIndicatorId)}`} target="_blank" rel="noopener noreferrer">View saved indicator</Button>}
      <Button color="error" disabled={busy} onClick={() => setConfirmDiscard(true)}>Discard recovered changes</Button>
      <Button disabled={busy} onClick={onBack}>Back to My Indicators</Button>
    </Stack>
    <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} aria-labelledby="discard-closed-recovery-title">
      <DialogTitle id="discard-closed-recovery-title">Discard recovered changes?</DialogTitle>
      <DialogContent>This removes only this browser recovery copy. Saved indicators and other drafts stay unchanged.</DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmDiscard(false)}>Cancel</Button>
        <Button color="error" variant="contained" onClick={discard}>Discard recovered changes</Button>
      </DialogActions>
    </Dialog>
  </Stack>;
}
ClosedDraftRecovery.propTypes = {
  api: PropTypes.object.isRequired, receipt: PropTypes.object.isRequired,
  recovery: PropTypes.object.isRequired, onOpen: PropTypes.func.isRequired, onBack: PropTypes.func.isRequired,
};
