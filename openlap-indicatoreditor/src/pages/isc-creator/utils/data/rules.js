export const attributes = [
  {
    id: "statement.object.definition.name.de",
    type: "Text",
    required: true,
    name: "Activities",
    description:
      "Selected list of all the Activities specified in Activity Filter. " +
      'E.g. courses that are selected in Activity name section are "Learning Analytics", "Data Mining" etc.',
  },
  {
    id: "statement.actor.account.name",
    type: "Text",
    required: true,
    name: "User list",
    description: "Selected list of the User(s) specified in User Filter",
  },
  {
    id: "statement.context.platform",
    type: "Text",
    required: true,
    name: "Sources",
    description:
      'Selected list of sources specified in CreateData such as "Moodle" etc.',
  },
  {
    id: "statement.verb.display.en",
    type: "Text",
    required: true,
    name: "Actions",
    description:
      "Selected list of actions performed on the activity(ies). E.g. a list of actions that were " +
      'performed on a course such as "viewed", "enrolled" etc.',
  },
  {
    id: "statement.stored",
    type: "Numeric",
    required: true,
    name: "Selected Timeframe",
    description:
      "Selected List of timestamps selected specified in Timeframe Filter",
  },
  {
    id: "statement.result.score.raw",
    type: "Numeric",
    required: true,
    name: "Raw outcomes",
    description: "List of obtained scores by the users",
  },
  {
    id: "statement.result.score.max",
    type: "Numeric",
    required: true,
    name: "Maximum scores",
    description: "List of the maximum scores from the activities",
  },
  {
    id: "statement.result.score.scaled",
    type: "Numeric",
    required: true,
    name: "Scaled outcomes",
    description: "List of the scaled scores from the activities",
  },
];
