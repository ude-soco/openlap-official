import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Chip, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import {
  requestAnalyticsMethods,
  requestVisualizationLibraries,
  requestVisualizationTypes,
} from "./utils/manage-apis";

// Admin overview (PR2). Read-only: shows live counts for the catalog surfaces
// that already have list APIs (visualization libraries, visualization types,
// analytics methods) and keeps Users as a "Coming next" card until a list-users
// endpoint exists. No upload/delete/management actions are exposed here, and no
// new backend APIs are introduced — counts are just the length of existing list
// responses. Detail routes don't exist yet, so cards carry no "View details"
// action (added in later PRs alongside their pages).
const SECTIONS = [
  {
    key: "users",
    title: "Users",
    helper: "Browse OpenLAP user accounts and the roles assigned to them.",
    icon: PeopleAltOutlinedIcon,
    comingSoon: true,
  },
  {
    key: "libraries",
    title: "Visualization Libraries",
    helper: "Installed chart libraries and their source plugins.",
    icon: CategoryOutlinedIcon,
    unit: "libraries",
    loader: requestVisualizationLibraries,
  },
  {
    key: "types",
    title: "Visualization Types",
    helper: "Available chart types and their input requirements.",
    icon: BarChartOutlinedIcon,
    unit: "chart types",
    loader: requestVisualizationTypes,
  },
  {
    key: "methods",
    title: "Analytics Methods",
    helper: "Available analytics methods, their inputs, and parameters.",
    icon: AnalyticsOutlinedIcon,
    unit: "methods",
    loader: requestAnalyticsMethods,
  },
];

const LIVE_SECTIONS = SECTIONS.filter((section) => !section.comingSoon);

// Tinted icon badge matching the dashboard card aesthetic (theme tokens only).
const IconBadge = ({ icon: Icon }) => (
  <Box
    aria-hidden
    sx={(theme) => ({
      width: 40,
      height: 40,
      borderRadius: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "primary.main",
      backgroundColor: alpha(
        theme.palette.primary.main,
        theme.palette.mode === "dark" ? 0.24 : 0.1
      ),
    })}
  >
    <Icon fontSize="small" />
  </Box>
);

IconBadge.propTypes = {
  icon: PropTypes.elementType.isRequired,
};

// The value area of a live card: loading → skeleton, error → message + retry,
// ready → prominent count + unit (count of 0 is shown as-is, an explicit empty).
const StatValue = ({ state, unit, onRetry }) => {
  if (state.status === "loading") {
    return <Skeleton variant="rounded" width={72} height={44} />;
  }
  if (state.status === "error") {
    return (
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <ErrorOutlineRoundedIcon fontSize="small" color="warning" />
        <Typography variant="body2" color="text.secondary">
          Couldn&rsquo;t load
        </Typography>
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }
  return (
    <Stack direction="row" alignItems="baseline" gap={1}>
      <Typography variant="h3" component="p" fontWeight={600} lineHeight={1}>
        {state.count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {unit}
      </Typography>
    </Stack>
  );
};

StatValue.propTypes = {
  state: PropTypes.shape({
    status: PropTypes.oneOf(["loading", "ready", "error"]).isRequired,
    count: PropTypes.number,
  }).isRequired,
  unit: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

const ComingSoonValue = () => (
  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
    <Chip label="Coming next" size="small" />
    <Typography variant="body2" color="text.secondary">
      Needs a list-users API (planned).
    </Typography>
  </Stack>
);

const initialStats = () =>
  LIVE_SECTIONS.reduce(
    (acc, section) => ({
      ...acc,
      [section.key]: { status: "loading", count: null },
    }),
    {}
  );

const AdminOverview = () => {
  const { api } = useContext(AuthContext);
  const [stats, setStats] = useState(initialStats);

  const loadOne = useCallback(
    async (section) => {
      setStats((prev) => ({
        ...prev,
        [section.key]: { status: "loading", count: null },
      }));
      try {
        const result = await section.loader(api);
        const count = Array.isArray(result?.data) ? result.data.length : 0;
        setStats((prev) => ({
          ...prev,
          [section.key]: { status: "ready", count },
        }));
      } catch (error) {
        console.error(`Failed to load ${section.key} count`, error);
        setStats((prev) => ({
          ...prev,
          [section.key]: { status: "error", count: null },
        }));
      }
    },
    [api]
  );

  const loadAll = useCallback(() => {
    LIVE_SECTIONS.forEach((section) => loadOne(section));
  }, [loadOne]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const anyLoading = LIVE_SECTIONS.some(
    (section) => stats[section.key]?.status === "loading"
  );

  return (
    <Stack gap={2}>
      <PageHeader
        title="Admin Dashboard"
        breadcrumbs={[{ label: "Home", to: "/" }]}
        subtitle="Manage OpenLAP users, visualization libraries and types, and analytics methods."
        actions={
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadAll}
            disabled={anyLoading}
          >
            Refresh
          </Button>
        }
      />

      <Grid container spacing={3} alignItems="stretch">
        {SECTIONS.map((section) => (
          <Grid
            key={section.key}
            size={{ xs: 12, sm: 6, lg: 3 }}
            sx={{ display: "flex" }}
          >
            <SectionCard
              title={section.title}
              helper={section.helper}
              action={<IconBadge icon={section.icon} />}
            >
              {section.comingSoon ? (
                <ComingSoonValue />
              ) : (
                <StatValue
                  state={stats[section.key]}
                  unit={section.unit}
                  onRetry={() => loadOne(section)}
                />
              )}
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default AdminOverview;
