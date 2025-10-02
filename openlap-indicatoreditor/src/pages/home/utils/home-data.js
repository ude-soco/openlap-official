import { v4 as uuidv4 } from "uuid";
import PrototypeImage from "../../../assets/svg/prototype.svg";
import LRSLogo from "../../../assets/svg/learning_locker.svg";
import AddIcon from "@mui/icons-material/Add";
import RoleTypes from "../../account-manager/utils/enums/role-types";

const homeData = [
  {
    id: uuidv4(),
    label: "Indicator Specifications Cards",
    description:
      "Helps to prototype your analysis and create visualization in a few steps and with beginner friendly interface.",
    image: PrototypeImage,
    disabledRoles: [RoleTypes["data provider"], RoleTypes.admin],
    buttons: [
      {
        id: uuidv4(),
        label: "To dashboard",
        variant: "contained",
        icon: undefined,
        link: "/isc",
      },
      {
        id: uuidv4(),
        label: "Create new",
        variant: undefined,
        icon: AddIcon,
        link: "/isc/creator",
      },
    ],
  },
  {
    id: uuidv4(),
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
        id: uuidv4(),
        label: "To dashboard",
        variant: "contained",
        icon: undefined,
        link: "/indicator",
      },
      {
        id: uuidv4(),
        label: "Create new",
        variant: undefined,
        icon: AddIcon,
        link: "/indicator/editor",
      },
    ],
  },
  {
    id: uuidv4(),
    label: "Learning Record Store",
    description: "Helps manage your source of data",
    image: LRSLogo,
    disabledRoles: [RoleTypes.admin],
    buttons: [
      {
        id: uuidv4(),
        label: "Manage LRS",
        variant: "contained",
        icon: undefined,
        link: "/manage-lrs",
      },
    ],
  },
];

export default homeData;
