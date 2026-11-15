import { useContext, useEffect, useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from "@mui/material";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../../common/components/page-header/page-header.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import MyIscTable from "./components/my-isc-table.jsx";

export default function IscDashboard() {
  const { SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const draftsOnly = params.get("view") === "drafts";
  const [stats, setStats] = useState({ total: 0 });
  const [recovery, setRecovery] = useState(null);
  const [recoveryAction, setRecoveryAction] = useState(null);
  const [recoveryError, setRecoveryError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_ISC);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed?.draftMeta?.draftId) setRecovery({ name: parsed?.requirements?.indicatorName || "" });
      } catch { setRecovery({ name: "" }); }
    } catch { setRecoveryError("Browser recovery could not be checked on this device."); }
  }, [SESSION_ISC]);

  const startNew = () => {
    try {
      sessionStorage.removeItem(SESSION_ISC);
      navigate("/isc/new");
    } catch { setRecoveryError("Could not clear this browser's working copy. Please try again."); }
  };
  const continueRecovery = () => navigate("/isc/creator");
  const createNew = () => { if (recovery) setRecoveryAction("new"); else startNew(); };
  const confirmRecoveryRemoval = () => {
    try {
      sessionStorage.removeItem(SESSION_ISC);
      setRecovery(null); setRecoveryError(""); setRecoveryAction(null);
      if (recoveryAction === "new") navigate("/isc/new");
    } catch { setRecoveryError("Could not discard this browser recovery. Your work is still here."); }
  };

  return <Stack sx={{ gap: 2 }}>
    <PageHeader title="My ISCs" breadcrumbs={[{ label: "Home", to: "/" }]}
      subtitle="Create, review, and manage your indicator prototypes."
      actions={<Chip icon={<InsightsOutlinedIcon />} variant="outlined"
        label={`${stats.total} ${draftsOnly ? "draft" : "ISC"}${stats.total === 1 ? "" : "s"}`} />} />
    {recovery && <Alert severity="info" variant="outlined" sx={{ "& .MuiAlert-message": { minWidth: 0, width: "100%", overflowWrap: "anywhere" } }}>
      <Stack sx={{ gap: 1 }}>
        <Typography variant="body2">{recovery.name ? `Local recovery available for “${recovery.name}”.` : "A local recovery copy is available in this browser."}</Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
          <Button size="small" color="inherit" sx={{ whiteSpace: "nowrap" }} onClick={() => setRecoveryAction("discard")}>Discard recovery</Button>
          <Button size="small" color="inherit" sx={{ whiteSpace: "nowrap" }} onClick={continueRecovery}>Continue recovery</Button>
        </Stack>
      </Stack>
    </Alert>}
    {recoveryError && <Alert severity="warning">{recoveryError}</Alert>}
    <MyIscTable onStats={setStats} onCreate={createNew} draftsOnly={draftsOnly} onDraftsOnlyChange={(checked) => setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (checked) next.set("view", "drafts");
      else next.delete("view");
      return next;
    })} />
    <Dialog open={Boolean(recoveryAction)} onClose={() => setRecoveryAction(null)} fullWidth maxWidth="sm"
      aria-labelledby="isc-recovery-action-title" aria-describedby="isc-recovery-action-description">
      <DialogTitle id="isc-recovery-action-title">{recoveryAction === "new" ? "Start a new ISC?" : "Discard local recovery?"}</DialogTitle>
      <DialogContent><DialogContentText id="isc-recovery-action-description">
        {recoveryAction === "new" ? "A working copy is still stored in this browser. Continue it, or discard that copy before starting a new ISC. Saved ISCs and server drafts remain available."
          : "This removes only the local recovery copy in this browser. Saved ISCs and server drafts remain available."}
      </DialogContentText></DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={() => setRecoveryAction(null)}>Cancel</Button>
        {recoveryAction === "new" && <Button onClick={continueRecovery}>Continue recovery</Button>}
        <Button variant="contained" color="error" onClick={confirmRecoveryRemoval}>
          {recoveryAction === "new" ? "Discard recovery and create" : "Discard recovery"}
        </Button>
      </DialogActions>
    </Dialog>
  </Stack>;
}
