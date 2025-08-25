import Basic from "../../../../assets/images/vis-dashboard-cover/basic.png";
import Composite from "../../../../assets/images/vis-dashboard-cover/composite.png";
import Multi from "../../../../assets/images/vis-dashboard-cover/multi.png";

export const indicatorData = [
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
  // {
  //   image: Composite,
  //   imageCode: "COMPOSITE",
  //   name: "Composite indicator",
  //   description: "Combine two or more Basic Indicators.",
  //   condition: `Indicators must share a common Analysis Method.`,
  //   link: "/indicator/editor/composite",
  // },
  // {
  //   image: Multi,
  //   imageCode: "MULTI_LEVEL",
  //   name: "Multi-level analysis indicator",
  //   description: "Combine two or more Basic Indicators.",
  //   condition: "Indicators must share a common data column.",
  //   link: "/indicator/editor/multi-level-analysis",
  // },
];

export const Condition = {
  only_me: "ONLY_ME",
  exclude_me: "EXCLUDE_ME",
  all: "INCLUDE_ME",
};
