import Basic from "../../../../assets/images/vis-dashboard-cover/basic.png";
import Composite from "../../../../assets/images/vis-dashboard-cover/composite.png";
import Multi from "../../../../assets/images/vis-dashboard-cover/multi.png";

const images = [
  {
    image: Basic,
    imageCode: "Basic",
    name: "Basic indicator",
    description: "Create a simple indicator from scratch.",
    link: "/indicator/editor/basic",
  },
  {
    image: Composite,
    imageCode: "Composite",
    name: "Composite indicator",
    description:
      "Combine two or more basic indicators with the same analysis method.",
    link: "/indicator/editor/composite",
  },
  {
    image: Multi,
    imageCode: "Multi",
    name: "Multi-level analysis indicator",
    description:
      "Combine two or more basic indicators based on one shared data.",
    link: "/indicator/editor/multi-level-analysis",
  },
];

export default images;
