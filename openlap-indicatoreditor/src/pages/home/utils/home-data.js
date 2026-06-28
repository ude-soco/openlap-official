import StyleIcon from "@mui/icons-material/Style";
import BarChartIcon from "@mui/icons-material/BarChart";
import StorageIcon from "@mui/icons-material/Storage";
import AddIcon from "@mui/icons-material/Add";
import RoleTypes from "../../account-manager/utils/enums/role-types";

// Dashboard "start here" cards. Each entry is self-describing data consumed by
// <DashboardCard>; the page renders this list, so adding/editing a card means
// editing one object here (no JSX changes). Stable string ids are used as keys.
const homeData = [
  {
    id: "isc",
    title: "Indicator Specification Cards",
    description:
      "Prototype your analysis and create visualizations in a few guided steps with a beginner-friendly interface.",
    icon: StyleIcon,
    disabledRoles: [RoleTypes["data provider"], RoleTypes.admin],
    primaryAction: { label: "To dashboard", to: "/isc" },
    secondaryAction: { label: "Create new", to: "/isc/creator", icon: AddIcon },
  },
  {
    id: "indicator-editor",
    title: "Indicator Editor",
    description:
      "Analyze real data, then create and share indicators with an intuitive editor.",
    icon: BarChartIcon,
    disabledRoles: [
      RoleTypes.userWithoutLRS,
      RoleTypes["data provider"],
      RoleTypes.admin,
    ],
    primaryAction: { label: "To dashboard", to: "/indicator" },
    secondaryAction: {
      label: "Create new",
      to: "/indicator/editor",
      icon: AddIcon,
    },
  },
  {
    id: "lrs",
    title: "Learning Record Store",
    description: "Connect and manage the data sources that power your analytics.",
    icon: StorageIcon,
    disabledRoles: [RoleTypes.admin],
    primaryAction: { label: "Manage LRS", to: "/manage-lrs" },
  },
];

export default homeData;
