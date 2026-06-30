import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import {
  requestAdminAnalyticsMethods,
  requestAdminVisualizationLibraries,
  requestAdminVisualizationTypes,
  requestUsers,
} from "./utils/manage-apis";

// Admin overview (read-only). Each card shows a live count from an existing list
// API and, where a detail page exists, a "View" link to it. No
// upload/delete/management actions are exposed here, and no new backend APIs are
// introduced — counts come from existing list responses (array length, or the
// Spring Page `totalElements` for the paginated users endpoint).
//
// Cards without a `to` (visualization libraries/types, analytics methods) get
// their detail pages — and links — in later PRs.
const SECTIONS = [
  {
    key: "users",
    title: "Users",
    helper: "OpenLAP user accounts and the roles assigned to them.",
    icon: PeopleAltOutlinedIcon,
    unit: "users",
    // size=1 keeps the payload tiny; we only need totalElements for the count.
    loader: (api) => requestUsers(api, 0, 1),
    to: "/admin/users",
    actionLabel: "View users",
  },
  {
    key: "libraries",
    title: "Visualization Libraries",
    helper: "Installed chart libraries and their source plugins.",
    icon: CategoryOutlinedIcon,
    unit: "libraries",
    loader: requestAdminVisualizationLibraries,
    to: "/admin/visualizations/libraries",
    actionLabel: "View details",
  },
  {
    key: "types",
    title: "Visualization Types",
    helper: "Available chart types and their input requirements.",
    icon: BarChartOutlinedIcon,
    unit: "chart types",
    loader: requestAdminVisualizationTypes,
    to: "/admin/visualizations/types",
    actionLabel: "View details",
  },
  {
    key: "methods",
    title: "Analytics Methods",
    helper: "Available analytics methods, their inputs, and parameters.",
    icon: AnalyticsOutlinedIcon,
    unit: "methods",
    loader: requestAdminAnalyticsMethods,
    to: "/admin/analytics-methods",
    actionLabel: "View details",
  },
];

// List endpoints return an array; the users endpoint returns a Spring Page.
const extractCount = (data) => {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data.totalElements === "number") return data.totalElements;
  return 0;
};

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

// The value area of a card: loading → skeleton, error → message + retry, ready →
// prominent count + unit (a count of 0 is shown as-is, an explicit empty).
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

const initialStats = () =>
  SECTIONS.reduce(
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
        setStats((prev) => ({
          ...prev,
          [section.key]: { status: "ready", count: extractCount(result?.data) },
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
    SECTIONS.forEach((section) => loadOne(section));
  }, [loadOne]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const anyLoading = SECTIONS.some(
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
              <Stack gap={1.5} alignItems="flex-start">
                <StatValue
                  state={stats[section.key]}
                  unit={section.unit}
                  onRetry={() => loadOne(section)}
                />
                {section.to && (
                  <Button
                    component={RouterLink}
                    to={section.to}
                    size="small"
                    endIcon={<ArrowForwardRoundedIcon />}
                  >
                    {section.actionLabel}
                  </Button>
                )}
              </Stack>
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default AdminOverview;
