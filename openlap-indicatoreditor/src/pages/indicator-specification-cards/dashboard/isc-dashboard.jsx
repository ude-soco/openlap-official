import { useContext, useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import MyIscTable from "./components/my-isc-table.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const IscDashboard = () => {
  const { SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  // `draft` is null when there is no in-progress ISC. When present it carries a
  // best-effort, READ-ONLY description of the draft (name, and whether it is an
  // edit of an existing ISC) — purely for the banner. The draft architecture
  // itself is unchanged (Phase A).
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_ISC);
    if (!saved) {
      setDraft(null);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setDraft({
        isEdit: Boolean(parsed?.id),
        name: parsed?.requirements?.indicatorName || "",
      });
    } catch {
      // Unparseable draft — still show the generic banner.
      setDraft({ isEdit: false, name: "" });
    }
  }, [SESSION_ISC]);

  const handleDiscard = () => {
    sessionStorage.removeItem(SESSION_ISC);
    setDraft(null);
  };

  const handleContinue = () => {
    navigate("/isc/creator");
    enqueueSnackbar("Indicator progress restored", {
      variant: "info",
      autoHideDuration: 2000,
    });
  };

  const draftMessage = !draft
    ? ""
    : draft.isEdit
      ? `You have an unfinished ISC${
          draft.name ? `: editing “${draft.name}”` : " (editing an existing ISC)"
        }.`
      : `You have an unfinished ISC${draft.name ? `: “${draft.name}”` : ""}.`;

  return (
    <Stack gap={2}>
      <Breadcrumbs>
        <Link component={RouterLink} underline="hover" color="inherit" to="/">
          Home
        </Link>
        <Typography sx={{ color: "text.primary" }}>My ISCs</Typography>
      </Breadcrumbs>

      <Stack gap={0.5}>
        <Typography variant="h5" component="h1" fontWeight={600}>
          My ISCs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create, review, and manage your indicator prototypes.
        </Typography>
      </Stack>

      <Divider />

      {draft && (
        <Alert
          severity="info"
          variant="outlined"
          action={
            <Stack direction="row" gap={1}>
              <Button size="small" variant="outlined" onClick={handleDiscard}>
                Discard
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </Stack>
          }
        >
          <AlertTitle>{draftMessage}</AlertTitle>
          Continue where you left off, or discard it to start fresh.
        </Alert>
      )}

      <MyIscTable />
    </Stack>
  );
};

export default IscDashboard;
