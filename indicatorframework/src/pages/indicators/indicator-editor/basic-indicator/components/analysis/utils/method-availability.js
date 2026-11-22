import { buildStatementSelection } from "../../../utils/query-builder.js";
import { fieldsForInputRole } from "./analysis-data.js";

const { TIMESTAMP: timestamps, CATEGORY: categories, SCORE: scores, OUTCOME: outcomes } = fieldsForInputRole;
const fields = [...categories, ...timestamps, ...scores, ...outcomes].map(({ id }) => id);

const hasId = (item) => Boolean(item?.id);
const scopes = new Set(["ONLY_ME", "INCLUDE_ME", "EXCLUDE_ME"]);

export function buildMethodAvailabilityQuery(dataset, filters) {
  const stores = dataset?.selectedLRSList;
  const groups = filters?.selectedActivities;
  const from = Date.parse(filters?.selectedTime?.from);
  const until = Date.parse(filters?.selectedTime?.until);
  if (!stores?.length || !stores.every((store) => store?.lrsId && store.uniqueIdentifier) ||
      !scopes.has(filters?.selectedUserFilter) || !Number.isFinite(from) || !Number.isFinite(until) || from > until ||
      !groups?.length || !groups.every((group) => group.selectedActivityType?.id &&
        group.selectedActionList?.length && group.selectedActionList.every(hasId) &&
        group.selectedActivityList?.length && group.selectedActivityList.every((item) => item?.id && item.queryId))) {
    return null;
  }
  const selection = buildStatementSelection(dataset, filters);
  return {
    ...selection,
    lrsStores: stores.map(({ lrsId, uniqueIdentifier }) => ({ lrsId, uniqueIdentifier })),
    outputs: fields,
  };
}

const describeField = ({ id, name }) => `${name} (${id.replace(/^statement\./, "")})`;

const fieldRequirements = {
  CATEGORY: {
    inputs: categories,
    found: "category values",
    needed: "a category field",
  },
  TIMESTAMP: {
    inputs: timestamps,
    found: "usable timestamps",
    needed: "a timestamp field",
  },
  OUTCOME: {
    inputs: outcomes,
    found: "true or false values",
    needed: "a true or false outcome",
  },
  SCORE: {
    inputs: scores,
    found: "numeric values",
    needed: "a usable numeric score field",
  },
};

export function methodDataRecommendation(requirement, profile, requiredInputRoles = []) {
  if (profile && !requirement && requiredInputRoles.length) {
    const groupedScore = requiredInputRoles.includes("SCORE") && requiredInputRoles.includes("CATEGORY");
    const roles = groupedScore
      ? ["SCORE_AND_CATEGORY", ...requiredInputRoles.filter((role) => role !== "SCORE" && role !== "CATEGORY")]
      : requiredInputRoles;
    const checks = roles.map((role) => methodDataRecommendation(role, profile));
    if (checks.some((check) => !check)) return null;
    const missing = checks.find(({ label }) => label !== "Recommended for this data");
    return missing || {
      label: checks.length === 1 ? checks[0].label : "Required fields available",
      reason: checks.map(({ reason }) => reason).join(" "),
    };
  }
  const fieldRequirement = Object.hasOwn(fieldRequirements, requirement) && fieldRequirements[requirement];
  if (!profile || (!fieldRequirement && requirement !== "EVENTS" && requirement !== "SCORE_AND_CATEGORY")) {
    return null;
  }
  const recommended = (reason) => ({ label: "Recommended for this data", reason });
  const missing = (reason) => ({
    label: profile.complete ? "Missing required data" : "Input availability uncertain",
    reason: profile.complete ? reason : `${reason} The checked statements did not confirm this input.`,
  });

  if (!profile.checkedStatements) {
    return missing("No matching statements were found.");
  }
  if (requirement === "EVENTS") {
    return recommended("This method counts the statements that match your filters.");
  }

  const available = new Set(profile.availableFields);
  const invalid = new Set(profile.invalidFields);
  const usable = ({ id }) => available.has(id) && !invalid.has(id);
  if (requirement === "SCORE_AND_CATEGORY") {
    for (const score of scores.filter(usable)) {
      const category = categories.find((field) => usable(field) && profile.scoreCategoryPairs?.some(
        (pair) => pair.score === score.id && pair.category === field.id));
      if (category) {
        return recommended(`${describeField(score)} and ${describeField(category)} occur in the same statement, so scores can be grouped.`);
      }
    }
    return missing(`Needs a numeric score and a category in the same statement, such as ${describeField(scores[0])} and ${describeField(categories[0])}.`);
  }

  const candidate = fieldRequirement.inputs.find(usable);
  if (candidate) {
    return recommended(`The checked statements contain ${fieldRequirement.found} in ${describeField(candidate)}.`);
  }
  const invalidField = fieldRequirement.inputs.find(({ id }) => invalid.has(id));
  return missing(invalidField
    ? `${describeField(invalidField)} contains values this method cannot use. Needs ${fieldRequirement.needed}.`
    : `Needs ${fieldRequirement.needed} such as ${describeField(fieldRequirement.inputs[0])}.`);
}
