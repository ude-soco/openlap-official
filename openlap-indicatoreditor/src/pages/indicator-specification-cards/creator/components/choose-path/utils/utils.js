const pathChoices = {
  vis: "Visualization",
  data: "Dataset",
  task: "Task",
};

// Pedagogical copy for each path, keyed by the persisted `selectedPath` value.
// Shared by the path selector cards and the collapsed Step 2 summary so the
// wording stays in one place. `consequence` describes what opens next and is
// written to match the existing ordering (vis/task → Visualization first;
// data → Dataset first).
export const PATH_META = {
  [pathChoices.vis]: {
    explanation: "I already know the chart or visualization I want.",
    recommendedWhen: "you know how the final indicator should look.",
    consequence:
      "Next, you'll choose your visualization — then build a dataset that matches it.",
    summary: "Starting from the visualization you have in mind.",
  },
  [pathChoices.data]: {
    explanation: "I already have the data I want to use.",
    recommendedWhen:
      "you want to start from available columns or imported data.",
    consequence:
      "Next, you'll build or import your dataset — then choose a visualization for it.",
    summary: "Starting from the data you already have.",
  },
  [pathChoices.task]: {
    explanation: "I know the learning-analysis task I want to answer.",
    recommendedWhen: "you know the analytical intent but not the chart yet.",
    consequence:
      "Next, you'll pick your analysis task and a compatible visualization — then build a matching dataset.",
    summary: "Starting from your analysis task.",
  },
};

export default pathChoices;
