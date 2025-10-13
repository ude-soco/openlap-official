import StyleIcon from "@mui/icons-material/Style";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddchartIcon from "@mui/icons-material/Addchart";
import BarChartIcon from "@mui/icons-material/BarChart";
import QuizIcon from "@mui/icons-material/Quiz";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PieChartIcon from '@mui/icons-material/PieChart';
import RoleTypes from "../../pages/account-manager/utils/enums/role-types.js";

const menus = [
  {
    key: "isc",
    title: "Indicator Specification Cards (ISC)",
    icon: <StyleIcon />,
    allowedRoles: [RoleTypes.user, RoleTypes.userWithoutLRS],
    disabledRoles: [],
    items: [
      {
        primary: "My ISCs",
        secondary: "List of my ISCs",
        navigate: "/isc",
        icon: <DashboardIcon />,
      },
      {
        primary: "ISC Creator",
        secondary: "Create a ISC",
        navigate: "/isc/creator",
        icon: <AddchartIcon />,
      },
      {
        primary: "ISC Pool",
        secondary: "Search for ISCs",
        navigate: "/isc/pool",
        icon: <AddchartIcon />,
      },
    ],
  },
  {
    key: "indicator",
    title: "Indicators",
    icon: <BarChartIcon />,
    allowedRoles: [RoleTypes.user, RoleTypes.userWithoutLRS],
    disabledRoles: [RoleTypes.userWithoutLRS],
    items: [
      {
        primary: "My Indicators",
        secondary: "List of my Indicators",
        navigate: "/indicator",
        icon: <DashboardIcon />,
        children: [
          {
            primary: "Basic Indicator",
            secondary: "Create a Basic Indicator",
            navigate: "/indicator/:id",
            icon: <AddchartIcon />,
          },
        ],
      },
      {
        primary: "Indicator Editor",
        secondary: "Create an Indicator",
        navigate: "/indicator/editor",
        icon: <AddchartIcon />,
        children: [
          {
            primary: "Basic Indicator",
            secondary: "Create a Basic Indicator",
            navigate: "/indicator/editor/basic",
            icon: <AddchartIcon />,
          },
          {
            primary: "Indicator Editor",
            secondary: "Create an Indicator",
            navigate: "/indicator/editor/composite",
            icon: <AddchartIcon />,
          },
          {
            primary: "Indicator Editor",
            secondary: "Create an Indicator",
            navigate: "/indicator/editor/multi-level-analysis",
            icon: <AddchartIcon />,
          },
        ],
      },
      {
        primary: "Indicator Pool",
        secondary: "Search for indicators",
        navigate: "/indicator/pool",
        icon: <AddchartIcon />,
      },
    ],
  },
  {
    key: "gqi",
    title: "Goal-Question-Indicator",
    icon: <QuizIcon />,
    allowedRoles: [RoleTypes.user, RoleTypes.userWithoutLRS],
    disabledRoles: [RoleTypes.userWithoutLRS],
    items: [
      {
        primary: "GQI Dashboard",
        secondary: "List of my GQIs",
        navigate: "/gqi",
        icon: <DashboardIcon />,
      },
      {
        primary: "GQI Editor",
        secondary: "Create a GQI",
        navigate: "/gqi/editor",
        icon: <ListAltIcon />,
      },
      {
        primary: "GQI Pool",
        secondary: "Search for GQIs",
        navigate: "/gqi/pool",
        icon: <ListAltIcon />,
      },
    ],
  },
  {
    key: "tools",
    title: "Tools",
    icon: <ArchitectureIcon />,
    allowedRoles: [RoleTypes.user, RoleTypes.userWithoutLRS],
    disabledRoles: [RoleTypes.userWithoutLRS],
    items: [
      {
        primary: "CSV-xAPI Converter",
        secondary: "Convert CSV to xAPI and vice versa",
        navigate: "/csv-xapi",
        icon: <ChangeCircleIcon />,
      },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    icon: <SettingsIcon />,
    allowedRoles: [
      RoleTypes.user,
      RoleTypes.userWithoutLRS,
      RoleTypes["data provider"],
    ],
    disabledRoles: [],
    items: [
      {
        primary: "Manage LRS",
        secondary: "Add or remove LRS",
        navigate: "/manage-lrs",
        icon: <SchoolIcon />,
      },
      {
        primary: "Account Settings",
        secondary: "Update your profile",
        navigate: "/account-settings",
        icon: <PersonIcon />,
      },
    ],
  },
  {
    key: "upload-admin",
    title: "Manage JARs",
    icon: <ArchitectureIcon />,
    allowedRoles: [RoleTypes.admin],
    disabledRoles: [
      RoleTypes.user,
      RoleTypes.userWithoutLRS,
      RoleTypes["data provider"],
    ],
    items: [
      {
        primary: "Analytics Methods",
        secondary: "Manage analytics methods",
        navigate: "/manage-analytics",
        icon: <AnalyticsIcon />,
      },
      {
        primary: "Visualization Methods",
        secondary: "Manage visualization methods",
        navigate: "/manage-visualization",
        icon: <PieChartIcon />,
      },
    ],
  },
  {
    key: "settings-admin",
    title: "Settings",
    icon: <SettingsIcon />,
    allowedRoles: [RoleTypes.admin],
    disabledRoles: [
      RoleTypes.user,
      RoleTypes.userWithoutLRS,
      RoleTypes["data provider"],
    ],
    items: [
      {
        primary: "Account Settings",
        secondary: "Update your profile",
        navigate: "/account-settings",
        icon: <PersonIcon />,
      },
    ],
  },
];

export default menus;
