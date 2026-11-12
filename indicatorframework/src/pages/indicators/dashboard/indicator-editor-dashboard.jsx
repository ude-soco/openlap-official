import { useContext, useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MyIndicatorsTable from "./components/my-indicators-table.jsx";
import PageHeader from "../../../common/components/page-header/page-header.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const IndicatorEditorDashboard = () => {
  const { SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [indicatorInProgress, setIndicatorInProgress] = useState(false);
  // Real total reported up from the list (no invented numbers).
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    setIndicatorInProgress(Boolean(savedState));
  }, [SESSION_INDICATOR]);

  const handleContinueEditing = () => {
    const indicatorDraft = JSON.parse(
      sessionStorage.getItem(SESSION_INDICATOR)
    );
    const { type: indicatorType, id: indicatorExist } =
      indicatorDraft.indicator;

    const baseRoutes = {
      BASIC: "/indicator/editor/basic",
      COMPOSITE: "/indicator/editor/composite",
      MULTI_LEVEL: "/indicator/editor/multi-level-analysis",
    };

    const baseRoute = baseRoutes[indicatorType];

    const route = indicatorExist
      ? `${baseRoute}/edit/${indicatorExist}`
      : baseRoute;

    navigate(route);

    enqueueSnackbar("Indicator data restored", {
      variant: "info",
      autoHideDuration: 2000,
    });
  };

  const handleClearSession = () => {
    sessionStorage.removeItem(SESSION_INDICATOR);
    setIndicatorInProgress(false);
  };

  return (
    <Stack gap={2}>
      <PageHeader
        title="My Indicators"
        breadcrumbs={[{ label: "Home", to: "/" }]}
        subtitle="Create, review, and manage your indicators."
        actions={
          <Chip
            icon={<InsightsOutlinedIcon />}
            variant="outlined"
            label={`${stats.total} indicator${stats.total === 1 ? "" : "s"}`}
          />
        }
      />

      {/* In-progress draft banner (session-restore). Behaviour unchanged; only
          restyled from a stock Alert to the shared alpha-tinted banner. */}
      {indicatorInProgress && (
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
                <Typography fontWeight={600}>
                  You have an indicator in progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Continue where you left off, or discard it to start fresh.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={1} sx={{ flexShrink: 0 }}>
              <Button variant="outlined" onClick={handleClearSession}>
                Discard
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleContinueEditing}
              >
                Continue
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <MyIndicatorsTable onStats={setStats} />
    </Stack>
  );
};

export default IndicatorEditorDashboard;
