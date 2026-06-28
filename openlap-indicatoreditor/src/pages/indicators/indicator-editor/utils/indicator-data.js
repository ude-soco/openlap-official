import Basic from "../../../../assets/images/vis-dashboard-cover/basic.png";
import Composite from "../../../../assets/images/vis-dashboard-cover/composite.png";
import Multi from "../../../../assets/images/vis-dashboard-cover/multi.png";

// Indicator types shown on the "Create an indicator" page.
//
// `available: true`  → an enabled card that starts the corresponding flow.
// `available: false` → a non-interactive "Coming soon" card (no link, not
//   focusable). Composite and Multi-level are intentionally not buildable yet:
//   the Composite route exists but its flow is not finalised, and the
//   Multi-level route is not even registered — so neither card navigates
//   anywhere. The images/copy are safe to show as a roadmap preview.
export const indicatorData = [
  {
    image: Basic,
    imageCode: "BASIC",
    name: "Basic indicator",
    description:
      "Turn a learning dataset into a single chart through four guided steps. The quickest way to get an indicator you can preview and reuse.",
    steps: ["Dataset", "Filters", "Analysis", "Visualization"],
    link: "/indicator/editor/basic",
    available: true,
  },
  {
    image: Composite,
    imageCode: "COMPOSITE",
    name: "Composite indicator",
    description:
      "Combine two or more basic indicators that share a common analysis method into a single, richer view.",
    link: "/indicator/editor/composite",
    available: false,
  },
  {
    image: Multi,
    imageCode: "MULTI_LEVEL",
    name: "Multi-level analysis indicator",
    description:
      "Layer multiple basic indicators that share a common data column for deeper, multi-level analysis.",
    link: "/indicator/editor/multi-level-analysis",
    available: false,
  },
];

export const Condition = {
  only_me: "ONLY_ME",
  exclude_me: "EXCLUDE_ME",
  all: "INCLUDE_ME",
};
