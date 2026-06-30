import { Grid, Stack } from "@mui/material";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import PageHeader from "../../common/components/page-header/page-header";
import DashboardCard from "../../common/components/dashboard-card/dashboard-card";

// PR1 of the Admin Dashboard: the protected shell only.
//
// These cards are intentionally placeholders ("Coming next") — the actual
// management surfaces land in later PRs (Users, Visualization libraries/types,
// Analytics methods). No backend calls are made here yet. Each card is rendered
// `locked` so its action is disabled; later PRs flip `locked` off and point
// `primaryAction.to` at the real sub-route (e.g. /admin/users).
const ADMIN_SECTIONS = [
  {
    key: "users",
    title: "Users",
    description:
      "Browse OpenLAP user accounts and the roles assigned to them.",
    icon: PeopleAltOutlinedIcon,
  },
  {
    key: "visualization-libraries",
    title: "Visualization Libraries",
    description:
      "Review the installed visualization libraries and their source plugins.",
    icon: CategoryOutlinedIcon,
  },
  {
    key: "visualization-types",
    title: "Visualization Types",
    description:
      "Inspect the available chart types and their input requirements.",
    icon: BarChartOutlinedIcon,
  },
  {
    key: "analytics-methods",
    title: "Analytics Methods",
    description:
      "Inspect the available analytics methods, their inputs, and parameters.",
    icon: AnalyticsOutlinedIcon,
  },
];

const AdminOverview = () => {
  return (
    <Stack gap={2}>
      <PageHeader
        title="Admin Dashboard"
        breadcrumbs={[{ label: "Home", to: "/" }]}
        subtitle="Manage OpenLAP users, visualization libraries and types, and analytics methods."
      />

      <Grid container spacing={3} alignItems="stretch">
        {ADMIN_SECTIONS.map((section) => (
          <Grid
            key={section.key}
            size={{ xs: 12, sm: 6, lg: 3 }}
            sx={{ display: "flex" }}
          >
            <DashboardCard
              title={section.title}
              description={section.description}
              icon={section.icon}
              badge="Coming next"
              locked
              primaryAction={{ label: "Coming soon", to: "/admin" }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default AdminOverview;
