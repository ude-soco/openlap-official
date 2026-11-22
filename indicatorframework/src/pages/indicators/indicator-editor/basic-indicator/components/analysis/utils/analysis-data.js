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
    id: "statement.verb.id",
    type: "Text",
    required: true,
    name: "Action identifier",
    description: "The action's exact xAPI identifier. Use this field to count or group actions independently of their translated display labels.",
  },
  {
    id: "statement.verb.display.en-US",
    type: "Text",
    required: true,
    name: "Action label (English)",
    description: "The English action label, when your statements record one. Use Action identifier when English labels are unavailable or inconsistent.",
  },
  {
    id: "statement.object.id",
    type: "Text",
    required: true,
    name: "Activity identifier",
    description: "The activity's exact xAPI identifier. Use it when activity names may be shared by different activities.",
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

const agentFields = new Set(["account", "name", "mbox", "mbox_sha1sum", "openid", "member"]);
const contextAgentFields = new Set(["instructor", "team", "contextagents", "contextgroups"]);

export function isIdentityAnalysisField(path) {
  if (typeof path !== "string") return false;
  const segments = path.trim().toLowerCase().split(".");
  if (segments.some((segment) => segment.startsWith("$"))) return true;
  const start = segments[0] === "statement" ? 1 : 0;
  // An object can be an Agent, Group or SubStatement. Follow nested objects
  // while keeping Activity fields such as object.definition.name available.
  let index = start;
  while (segments[index] === "object") index++;
  const parent = segments[index];
  const child = segments[index + 1];
  return (!parent && index > 0) || parent === "actor" || parent === "authority" ||
    (index > start && agentFields.has(parent)) ||
    (parent === "context" && (!child || contextAgentFields.has(child)));
}

const selectedEvents = {
  id: "statement.id",
  type: "Text",
  required: true,
  name: "Selected events",
  description: "Every event matching the selected dataset and filters contributes one row, including events with no recorded xAPI statement identifier.",
};

const timestamps = new Set(["statement.timestamp", "statement.stored"]);
export const fieldsForInputRole = {
  EVENTS: [selectedEvents],
  CATEGORY: analyticsInputMenuList.filter(({ id, type }) =>
    type === "Text" && !timestamps.has(id) && id !== "statement.verb.display"),
  TIMESTAMP: analyticsInputMenuList.filter(({ id }) => timestamps.has(id)),
  SCORE: analyticsInputMenuList.filter(({ type }) => type === "Numeric"),
  OUTCOME: analyticsInputMenuList.filter(({ type }) => type === "TrueFalse"),
};

export function isEventInput(method, input) {
  return method?.metadata?.inputRoles?.[input.id] === "EVENTS" && input.type === "Text";
}

export function withAnalysisInputDefaults(analysis) {
  const { method, mapping } = analysis.selectedAnalyticsMethod;
  return analysis.inputs.reduce((current, input) =>
    isEventInput(method, input) && input.required && !input.selectedInput?.id &&
      !mapping.mapping.some((entry) => entry.inputPort.id === input.id)
      ? withAnalysisInput(current, input, selectedEvents) : current, analysis);
}

export function currentAnalysisSource(input, saved) {
  // An existing event-marker mapping remains valid after switching the catalog
  // to a manifest-free build of the same plugin.
  if (input.type === "Text" && saved?.id === selectedEvents.id && saved?.type === "Text")
    return selectedEvents;
  return analyticsInputMenuList.find((column) => column.id === saved?.id && column.type === input.type);
}

// Raw xAPI values are converted by the backend for the declared mapped input type.
export function compatibleAnalysisInputs(input, selected, method) {
  const role = method?.metadata?.inputRoles?.[input.id];
  const fields = Object.hasOwn(fieldsForInputRole, role) ? fieldsForInputRole[role] : analyticsInputMenuList;
  const options = fields.filter((column) => column.type === input.type);
  // A previously saved custom field remains reviewable without adding arbitrary
  // fields to the catalog or silently replacing the user's mapping.
  if (selected?.id && !isIdentityAnalysisField(selected.id) && selected.type === input.type &&
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
  if (isIdentityAnalysisField(output?.id)) return analysis;
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
