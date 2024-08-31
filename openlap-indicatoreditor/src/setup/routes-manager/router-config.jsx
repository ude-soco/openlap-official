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
import RoleTypes from "../../pages/account-manager/utils/enums/role-types.js";
import UserProfile from "../../pages/account-manager/user-profile.jsx";
import ManageLrs from "../../pages/account-manager/manage-lrs.jsx";
import CsvXapiDashboard from "../../pages/csv-xapi-converter/csv-xapi-dashboard.jsx";
import GQIPool from "../../pages/gqi-editor/gqi-pool/gqi-pool.jsx";
import GQIEditor from "../../pages/gqi-editor/gqi-editor/gqi-editor.jsx";
import GQIDashboard from "../../pages/gqi-editor/dashboard/gqi-dashboard.jsx";
import IndicatorPool from "../../pages/indicator-editor/indicator-pool/indicator-pool.jsx";
import IndicatorEditor from "../../pages/indicator-editor/editor/indicator-editor.jsx";
import IndicatorEditorDashboard from "../../pages/indicator-editor/dashboard/indicator-editor-dashboard.jsx";
import MultiLevelAnalysisIndicator from "../../pages/indicator-editor/editor/multi-level-analysis-indicator/multi-level-analysis-indicator.jsx";
import CompositeIndicator from "../../pages/indicator-editor/editor/composite-indicator/composite-indicator.jsx";
import BasicIndicator from "../../pages/indicator-editor/editor/basic-indicator/basic-indicator.jsx";
import IndicatorPreview from "../../pages/indicator-editor/dashboard/components/indicator-preview.jsx";
import ISCPool from "../../pages/isc-creator/isc-pool/isc-pool.jsx";
import IndicatorSpecificationCard from "../../pages/indicator-specification-cards/creator/indicator-specification-card.jsx";
import IscDashboard from "../../pages/indicator-specification-cards/dashboard/isc-dashboard.jsx";

const menus = [
  {
    key: "isc",
    title: "Indicator Specification Cards (ISC)",
    icon: <StyleIcon />,
    allowedRoles: [RoleTypes.user, RoleTypes.userWithoutLRS],
    disabledRoles: [],
    items: [
      {
        primary: "ISC Dashboard",
        secondary: "List of my ISCs",
        navigate: "/isc",
        icon: <DashboardIcon />,
        component: <IscDashboard />,
      },
      {
        primary: "ISC Creator",
        secondary: "Create a ISC",
        navigate: "/isc/creator",
        icon: <AddchartIcon />,
        component: <IndicatorSpecificationCard />,
      },
      // {
      //   primary: "ISC Creator Old",
      //   secondary: "Create a ISC",
      //   navigate: "/isc/creator/old",
      //   icon: <AddchartIcon />,
      //   component: <ISCCreator />,
      // },
      {
        primary: "ISC Pool",
        secondary: "Search for ISCs",
        navigate: "/isc/pool",
        icon: <AddchartIcon />,
        component: <ISCPool />,
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
        primary: "Indicator Dashboard",
        secondary: "List of my Indicators",
        navigate: "/indicator",
        icon: <DashboardIcon />,
        component: <IndicatorEditorDashboard />,
        children: [
          {
            primary: "Basic Indicator",
            secondary: "Create a Basic Indicator",
            navigate: "/indicator/:id",
            icon: <AddchartIcon />,
            component: <IndicatorPreview />,
          },
        ],
      },
      {
        primary: "Indicator Editor",
        secondary: "Create an Indicator",
        navigate: "/indicator/editor",
        icon: <AddchartIcon />,
        component: <IndicatorEditor />,
        children: [
          {
            primary: "Basic Indicator",
            secondary: "Create a Basic Indicator",
            navigate: "/indicator/editor/basic",
            icon: <AddchartIcon />,
            component: <BasicIndicator />,
          },
          {
            primary: "Indicator Editor",
            secondary: "Create an Indicator",
            navigate: "/indicator/editor/composite",
            icon: <AddchartIcon />,
            component: <CompositeIndicator />,
          },
          {
            primary: "Indicator Editor",
            secondary: "Create an Indicator",
            navigate: "/indicator/editor/multi-level-analysis",
            icon: <AddchartIcon />,
            component: <MultiLevelAnalysisIndicator />,
          },
        ],
      },
      {
        primary: "Indicator Pool",
        secondary: "Search for indicators",
        navigate: "/indicator/pool",
        icon: <AddchartIcon />,
        component: <IndicatorPool />,
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
        component: <GQIDashboard />,
      },
      {
        primary: "GQI Editor",
        secondary: "Create a GQI",
        navigate: "/gqi/editor",
        icon: <ListAltIcon />,
        component: <GQIEditor />,
      },
      {
        primary: "GQI Pool",
        secondary: "Search for GQIs",
        navigate: "/gqi/pool",
        icon: <ListAltIcon />,
        component: <GQIPool />,
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
        component: <CsvXapiDashboard />,
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
        component: <ManageLrs />,
      },
      {
        primary: "Account Settings",
        secondary: "Update your profile",
        navigate: "/account-settings",
        icon: <PersonIcon />,
        component: <UserProfile />,
      },
    ],
  },
];

export default menus;
