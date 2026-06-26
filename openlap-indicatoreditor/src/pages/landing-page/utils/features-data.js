import DesignServicesIcon from "@mui/icons-material/DesignServices";
import AddchartIcon from "@mui/icons-material/Addchart";
import ISC from "../../../assets/home/abstract-isc.png";
import Indicator from "../../../assets/home/abstract-indicators.png";

// Content + layout for each Feature row. `imageSide`/`imageWidth`/`pb` are
// presentation hints consumed by FeatureRow to reproduce the existing layout
// (image left vs right, column widths, and bottom spacing).
const featureItems = [
  {
    id: "isc-creator",
    title: "Indicator Specification Card Creator",
    description:
      "The ISC Creator is an intuitive learning analytics tool that supports the systematic and theoretically-sound (co-)design of personalized low-fidelity learning analytics indicators, using Indicator Specification Cards (ISCs).",
    image: ISC,
    imageAlt: "Indicator Specification Card (ISC) Creator interface",
    dialogLabel: "ISC Creator abstract",
    buttonLabel: "Design Indicators now!",
    buttonIcon: DesignServicesIcon,
    to: "/login",
    imageSide: "left",
    imageWidth: "55%",
    pb: { xs: 2, md: 10 },
  },
  {
    id: "indicator-editor",
    title: "Indicator Editor",
    description:
      "The Indicator Editor is an interactive learning analytics tool that enables stakeholders who have knowledge about data analysis and visualization to implement high-fidelity learning analytics indicators based on real xAPI-based learning activity data, by supporting them in selecting data, choosing analysis methods, and specifying visualization techniques.",
    image: Indicator,
    imageAlt: "Indicator Editor interface",
    dialogLabel: "Indicator Editor abstract",
    buttonLabel: "Implement indicators now!",
    buttonIcon: AddchartIcon,
    to: "/login",
    imageSide: "right",
    imageWidth: "60%",
    pb: { xs: 10, md: 10 },
  },
];

export { featureItems };
