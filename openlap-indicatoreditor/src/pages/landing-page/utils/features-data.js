import { v4 as uuidv4 } from "uuid";
import StyleIcon from "@mui/icons-material/Style";
import BarChartIcon from "@mui/icons-material/BarChart";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import Achitecture from "../../../assets/home/abstract-architecture.png";
import ISC from "../../../assets/home/abstract-isc.png";
import Indicator from "../../../assets/home/abstract-indicators.png";

const featureItems = [
  {
    id: uuidv4(),
    icon: ArchitectureIcon,
    title: "OpenLAP Architecture",
    description:
      "The three main components of OpenLAP are Indicator Engine, Analytics Framework, and Data Collection and Management.",
    image: Achitecture,
  },
  {
    id: uuidv4(),
    icon: StyleIcon,
    title: "Indicator Specification Card (ISC) Creator",
    description:
      "Indicator Specification Cards (ISC)  represent a theory-informed method that helps different LA stakeholders systematically co-design LA indicators.",
    image: ISC,
  },
  {
    id: uuidv4(),
    icon: BarChartIcon,
    title: "Indicator Editor",
    description:
      "The Indicator Editor is responsible for providing users with an intuitive and interactive UI that guides them throughout the entire indicator development process, following a Goal-Question-Indicator (GQI) approach. The Indicator Editor supports three different types of indicators, namely Basic, Composite, and Multi-level Analysis.",
    image: Indicator,
  },
];

export { featureItems };
