import { v4 as uuidv4 } from "uuid";
import StyleIcon from "@mui/icons-material/Style";
import BarChartIcon from "@mui/icons-material/BarChart";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import Achitecture from "../../../assets/home/abstract-architecture.svg";
import ISC from "../../../assets/home/abstract-isc.svg";
import Indicator from "../../../assets/home/abstract-indicators.svg";

const featureItems = [
  {
    id: uuidv4(),
    icon: ArchitectureIcon,
    title: "OpenLAP Architecture",
    description:
      "The three main components of OpenLAP are Indicator Engine, Analytics Framework, and Data Collection and Management. The Indicator Engine is responsible for providing an intuitive and interactive User Interface (UI) to help users develop their indicators. The Analytics Framework has various core modules that allow the generation, execution, and management of indicators. The Data Collection and Management component is responsible for xAPI-based data collection from various learning sources as well as maintaining data privacy policies.",
    imageLight: `url(${Achitecture})`,
    imageDark: `url(${Achitecture})`,
  },
  {
    id: uuidv4(),
    icon: StyleIcon,
    title: "Indicator Specification Card (ISC) Creator",
    description:
      "Indicator Specification Cards (ISC)  represent a theory-informed method that helps different LA stakeholders systematically co-design LA indicators. It follows the Goal-Question-Indicator (GQI) approach to design LA indicators that meet users’ goals and applies information visualization guidelines from Munzner’s What-Why-How visualization framework. Concretely, it describes a systematic workflow to get from the Why? (i.e., user goal/question) to the How? (i.e., visualization). The ISC Creator module in OpenLAP provides an intuitive user interface (UI) that allows the low cost design of low-fidellity LA indicators using ISCs.",
    imageLight: `url(${ISC})`,
    imageDark: `url(${ISC})`,
  },
  {
    id: uuidv4(),
    icon: BarChartIcon,
    title: "Indicator Editor",
    description:
      "The Indicator Editor is one of the main components of the Indicator Engine. It is responsible for providing users with an intuitive and interactive UI that guides them throughout the entire indicator development process, following a Goal-Question-Indicator (GQI) approach. The Indicator Editor supports three different types of indicators, namely Basic, Composite, and Multi-level Analysis.",
    imageLight: `url(${Indicator})`,
    imageDark: `url(${Indicator})`,
  },
];

export { featureItems };
