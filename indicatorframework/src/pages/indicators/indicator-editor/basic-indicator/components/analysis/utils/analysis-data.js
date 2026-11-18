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
  {
    id: "statement.actor.mbox",
    type: "Text",
    required: true,
    name: "Users (email identifier)",
    description: "The xAPI email identifier of each actor. Choose the identity field your Learning Record Store actually records.",
  },
  {
    id: "statement.actor.openid",
    type: "Text",
    required: true,
    name: "Users (OpenID)",
    description: "The OpenID identifier of each actor, when present in your xAPI statements.",
  },
  {
    id: "statement.timestamp",
    type: "Text",
    required: true,
    name: "Event timestamp",
    description: "When the learning event occurred, as an ISO 8601 timestamp. This is not a measurement of time spent learning.",
  },
  {
    id: "statement.stored",
    type: "Text",
    required: true,
    name: "Stored timestamp",
    description: "When the Learning Record Store received the statement. This may differ from the event timestamp.",
  },
  ...[
    ["raw", "Raw score", "The reported score in the activity's own scoring scale."],
    ["scaled", "Scaled score", "The xAPI scaled score, usually between -1 and 1. Different activities still need comparable scoring definitions."],
    ["min", "Minimum possible score", "The lower bound of the activity's score scale, when recorded."],
    ["max", "Maximum possible score", "The upper bound of the activity's score scale, when recorded."],
  ].map(([field, name, description]) => ({
    id: `statement.result.score.${field}`,
    type: "Numeric",
    required: true,
    name,
    description,
  })),
  ...[
    ["success", "Success", "Whether the actor succeeded in the activity, when recorded."],
    ["completion", "Completion", "Whether the actor completed the activity, when recorded."],
  ].map(([field, name, description]) => ({
    id: `statement.result.${field}`,
    type: "TrueFalse",
    required: true,
    name,
    description,
  })),
];

// Raw xAPI values are converted by the backend only for the declared mapped
// input type. Do not offer a categorical label as a numerical measurement.
export function compatibleAnalysisInputs(input, selected) {
  const options = analyticsInputMenuList.filter((column) => column.type === input.type);
  // A previously saved custom field remains reviewable without adding arbitrary
  // fields to the catalog or silently replacing the user's mapping.
  if (selected?.id && selected.type === input.type &&
      !options.some((column) => column.id === selected.id)) {
    return [...options, {
      ...selected,
      name: selected.name || selected.title || selected.id,
      description: selected.description || "Previously saved field. Check that your statements provide values of the required type.",
    }];
  }
  return options;
}

export function withAnalysisInput(analysis, input, output) {
  return {
    ...analysis,
    inputs: analysis.inputs.map((item) => item.id === input.id
      ? { ...item, selectedInput: output } : item),
    selectedAnalyticsMethod: {
      ...analysis.selectedAnalyticsMethod,
      mapping: {
        ...analysis.selectedAnalyticsMethod.mapping,
        mapping: [
          ...analysis.selectedAnalyticsMethod.mapping.mapping.filter(
            (entry) => entry.inputPort.id !== input.id,
          ),
          ...(output ? [{ inputPort: input, outputPort: output }] : []),
        ],
      },
    },
    analyzedData: {},
  };
}
