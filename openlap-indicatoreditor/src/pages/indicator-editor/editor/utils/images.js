import Basic from "../../../../assets/images/vis-dashboard-cover/basic.png";
import Composite from "../../../../assets/images/vis-dashboard-cover/composite.png";
import Multi from "../../../../assets/images/vis-dashboard-cover/multi.png";

const images = [
  {
    image: Basic,
    imageCode: "BASIC",
    name: "Basic indicator",
    description:
      "Create a simple indicator with four simple steps: Dataset, Filters, Analysis, and Visualization.",
    // condition:
    //   "Four simple steps: Dataset, Filters, Analysis, and Visualization.",
    link: "/indicator/editor/basic",
  },
  {
    image: Composite,
    imageCode: "COMPOSITE",
    name: "Composite indicator",
    description: "Combine two or more basic indicators.",
    condition: `Indicators must share a common analysis method.`,
    link: "/indicator/editor/composite",
  },
  {
    image: Multi,
    imageCode: "MULTI_LEVEL",
    name: "Multi-level analysis indicator",
    description: "Combine two or more basic indicators.",
    condition: "Indicators must share a common data column.",
    link: "/indicator/editor/multi-level-analysis",
  },
];

export default images;
