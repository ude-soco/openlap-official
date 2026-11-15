export const analyticsInputMenuList = [
  {
    id: "statement.object.definition.name.en-US",
    type: "Text",
    required: true,
    name: "Activities",
    description:
      "Selected list of all the Activities specified in Activity Filter. " +
      'E.g. courses that are selected in Activity name section are "Learning Analytics", "Data Mining" etc.',
    options: [],
  },
  {
    id: "statement.object.definition.type",
    type: "Text",
    required: true,
    name: "Activity Types",
    description: "Types of activities",
  },
  {
    // id: "statement.verb.id",
    id: "statement.verb.display",
    type: "Text",
    required: true,
    name: "Actions",
    description:
      "Selected list of actions performed on the activity(ies). E.g. a list of actions that were " +
      'performed on a course such as "viewed", "enrolled" etc.',
    options: [],
  },
  {
    id: "statement.context.platform",
    type: "Text",
    required: true,
    name: "Platforms",
    description:
      'Selected list of sources specified in Dataset such as "Moodle" etc.',
  },
  {
    id: "statement.actor.account.name",
    type: "Text",
    required: true,
    name: "Users (account name)",
    description: "Account names of the users included by the User Filter. Use this optional input for methods that count distinct users per activity.",
  },
];
