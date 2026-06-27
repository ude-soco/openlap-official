import PrototypeImage from "../../../assets/svg/prototype.svg";
import LRSLogo from "../../../assets/svg/learning_locker.svg";
import AddIcon from "@mui/icons-material/Add";
import RoleTypes from "../../account-manager/utils/enums/role-types";

// Stable, content-derived ids (used as React keys). Avoid runtime-generated
// uuids here: a new uuid each module load makes keys unstable across renders.
const homeData = [
  {
    id: "isc",
    label: "Indicator Specifications Cards",
    description:
      "Helps to prototype your analysis and create visualization in a few steps and with beginner friendly interface.",
    image: PrototypeImage,
    disabledRoles: [RoleTypes["data provider"], RoleTypes.admin],
    buttons: [
      {
        id: "isc-dashboard",
        label: "To dashboard",
        variant: "contained",
        icon: undefined,
        link: "/isc",
      },
      {
        id: "isc-create",
        label: "Create new",
        variant: undefined,
        icon: AddIcon,
        link: "/isc/creator",
      },
    ],
  },
  {
    id: "indicator-editor",
    label: "Indicator Editor",
    description:
      "Helps to analysis real data, create and share indicators with an intuitive interface.",
    image: PrototypeImage,
    disabledRoles: [
      RoleTypes.userWithoutLRS,
      RoleTypes["data provider"],
      RoleTypes.admin,
    ],
    buttons: [
      {
        id: "indicator-dashboard",
        label: "To dashboard",
        variant: "contained",
        icon: undefined,
        link: "/indicator",
      },
      {
        id: "indicator-create",
        label: "Create new",
        variant: undefined,
        icon: AddIcon,
        link: "/indicator/editor",
      },
    ],
  },
  {
    id: "lrs",
    label: "Learning Record Store",
    description: "Helps manage your source of data",
    image: LRSLogo,
    disabledRoles: [RoleTypes.admin],
    buttons: [
      {
        id: "lrs-manage",
        label: "Manage LRS",
        variant: "contained",
        icon: undefined,
        link: "/manage-lrs",
      },
    ],
  },
];

export default homeData;
