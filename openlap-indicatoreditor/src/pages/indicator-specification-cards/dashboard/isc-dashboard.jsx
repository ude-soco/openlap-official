import { useContext, useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import MyIscTable from "./components/my-isc-table.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { discardDraft } from "../creator/utils/isc-draft-api.js";

const formatDate = (time) =>
  time
    ? new Date(time).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const IscDashboard = () => {
  const { SESSION_ISC, api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  // Best-effort, READ-ONLY description of the in-progress draft (for the banner).
  const [draft, setDraft] = useState(null);
  // Real stats reported up from the list (no invented numbers).
  const [stats, setStats] = useState({ total: 0, latest: null });

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_ISC);
    if (!saved) {
      setDraft(null);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      const meta = parsed?.draftMeta;
      setDraft({
        draftId: meta?.draftId || null,
        isEdit: meta ? meta.mode === "EDIT_DRAFT" : Boolean(parsed?.id),
        name: parsed?.requirements?.indicatorName || "",
      });
    } catch {
      setDraft({ draftId: null, isEdit: false, name: "" });
    }
  }, [SESSION_ISC]);

  const handleDiscard = () => {
    // Remove the backend draft too (best-effort); the saved source ISC, if this
    // is an edit draft, is untouched by the draft delete.
    if (draft?.draftId) {
      discardDraft(api, draft.draftId).catch((error) =>
        console.warn("Could not discard backend draft", error)
      );
    }
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

  // Backend-backed drafts now appear as rows in My ISCs, so the banner is only
  // for LEGACY local-recovery drafts that have no backend draft id (e.g. a
  // pre-deploy session, or a brand-new draft before its first autosave landed).
  const showRecoveryBanner = Boolean(draft) && !draft.draftId;
  const draftTitle = !draft
    ? ""
    : draft.name
      ? `Local recovery draft: “${draft.name}”`
      : "You have a local recovery draft";

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

      {/* Compact summary row — real data only */}
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <Chip
          icon={<InsightsOutlinedIcon />}
          variant="outlined"
          label={`${stats.total} ISC${stats.total === 1 ? "" : "s"}`}
        />
        {showRecoveryBanner && (
          <Chip
            icon={<HistoryEduOutlinedIcon />}
            color="info"
            variant="outlined"
            label="Local recovery draft"
          />
        )}
        {stats.latest && (
          <Chip
            icon={<ScheduleRoundedIcon />}
            variant="outlined"
            label={`Last updated ${formatDate(stats.latest)}`}
          />
        )}
      </Stack>

      <Divider />

      {/* Local-recovery banner (legacy drafts without a backend id only). */}
      {showRecoveryBanner && (
        <Paper
          variant="outlined"
          sx={(t) => ({
            p: 2,
            borderRadius: `${t.custom?.radii?.card ?? 8}px`,
            borderColor: alpha(t.palette.info.main, 0.4),
            backgroundColor: alpha(t.palette.info.main, 0.06),
          })}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" gap={1.5} alignItems="center">
              <HistoryEduOutlinedIcon color="info" />
              <Box>
                <Typography fontWeight={600}>{draftTitle}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Continue where you left off, or discard it to start fresh.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={1} sx={{ flexShrink: 0 }}>
              <Button variant="outlined" onClick={handleDiscard}>
                Discard
              </Button>
              <Button variant="contained" color="primary" onClick={handleContinue}>
                Continue
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <MyIscTable onStats={setStats} />
    </Stack>
  );
};

export default IscDashboard;
