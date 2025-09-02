import { v4 as uuidv4 } from "uuid";
import StyleIcon from "@mui/icons-material/Style";
import BarChartIcon from "@mui/icons-material/BarChart";
import ISC from "../../../assets/home/abstract-isc.png";
import Indicator from "../../../assets/home/abstract-indicators.png";

const featureItems = [
  {
    id: uuidv4(),
    icon: StyleIcon,
    title: "Indicator Specification Card (ISC) Creator",
    description:
      "The ISC Creator is an intuitive learning analytics tool that supports the systematic and theoretically-sound (co-)design of personalized low-fidelity learning analytics indicators, using Indicator Specification Cards (ISCs).",
    image: ISC,
  },
  {
    id: uuidv4(),
    icon: BarChartIcon,
    title: "Indicator Editor",
    description:
      "The Indicator Editor is an interactive learning analytics tool that enables stakeholders who have knowledge about data analysis and visualization to implement high-fidelity learning analytics indicators based on real xAPI-based learning activity data, by supporting them in selecting data, choosing analysis methods, and specifying visualization techniques.",
    image: Indicator,
  },
];

export { featureItems };
