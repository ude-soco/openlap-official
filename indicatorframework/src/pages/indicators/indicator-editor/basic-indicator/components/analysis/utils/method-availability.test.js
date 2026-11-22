import test from "node:test";
import assert from "node:assert/strict";
import { buildMethodAvailabilityQuery, methodDataRecommendation } from "./method-availability.js";

const score = "statement.result.score.raw";
const activity = "statement.object.definition.name.en-US";
const profile = (availableFields, overrides = {}) => ({
  checkedStatements: 4, complete: true, availableFields, invalidFields: [], scoreCategoryPairs: [], ...overrides,
});

const selectedFilters = () => ({
  selectedUserFilter: "ONLY_ME",
  selectedTime: { from: "2020-01-01", until: "2021-01-01" },
  selectedActivities: [{
    selectedActivityType: { id: "material" },
    selectedActionList: [{ id: "read" }],
    selectedActivityList: [{ id: "Activity 1", queryId: activity }],
  }],
});

const dataset = {
  selectedLRSList: [{ id: "fixture", lrsId: "fixture-source", uniqueIdentifier: "fixture-user", lrsTitle: "Fixture source" }],
};

test("the input-availability query uses the same active filters and only fixed, identity-free outputs", () => {
  const query = buildMethodAvailabilityQuery(dataset, selectedFilters());
  assert.deepEqual(query.lrsStores, [{ lrsId: "fixture-source", uniqueIdentifier: "fixture-user" }]);
  assert.deepEqual(query.duration, { from: "2020-01-01", until: "2021-01-01" });
  assert.deepEqual(query.activityTypes, ["material"]);
  assert.deepEqual(query.actionOnActivities, ["read"]);
  assert.deepEqual(query.activities, { [activity]: ["Activity 1"] });
  assert.equal(query.userQueryCondition, "ONLY_ME");
  assert.ok(query.outputs.includes(score));
  assert.ok(query.outputs.includes("statement.result.success"));
  assert.ok(query.outputs.includes("statement.stored"));
  assert.equal(query.outputs.some((field) => field.startsWith("statement.actor") || field === "statement.verb.display"), false);
});

test("recommendations wait for complete selectors independently of analysis readiness", () => {
  for (const makeIncomplete of [
    (filters) => { filters.selectedTime.until = ""; },
    (filters) => { filters.selectedActivities[0].selectedActionList = []; },
    (filters) => { filters.selectedActivities[0].selectedActivityList[0].queryId = ""; },
    (filters) => { filters.selectedUserFilter = ""; },
  ]) {
    const filters = selectedFilters();
    makeIncomplete(filters);
    assert.equal(buildMethodAvailabilityQuery(dataset, filters), null);
  }
  assert.equal(buildMethodAvailabilityQuery({ selectedLRSList: [] }, selectedFilters()), null);
});

test("a data recommendation names a usable score field and distinguishes invalid and missing values", () => {
  assert.deepEqual(methodDataRecommendation("SCORE", profile([score])), {
    label: "Recommended for this data",
    reason: "The checked statements contain numeric values in Raw score (result.score.raw).",
  });
  assert.equal(methodDataRecommendation("SCORE", profile([])).label, "Missing required data");
  const invalid = methodDataRecommendation("SCORE", profile([score], { invalidFields: [score] }));
  assert.equal(invalid.label, "Missing required data");
  assert.match(invalid.reason, /Raw score \(result\.score\.raw\) contains values this method cannot use/);
  const scaled = "statement.result.score.scaled";
  const fallback = methodDataRecommendation("SCORE", profile([score, scaled], { invalidFields: [score] }));
  assert.equal(fallback.label, "Recommended for this data");
  assert.match(fallback.reason, /Scaled score \(result\.score\.scaled\)/);
  assert.equal(methodDataRecommendation("UNCLASSIFIED", profile([score])), null);
});

test("grouped score recommendations require usable values in the same statement", () => {
  const requirement = "SCORE_AND_CATEGORY";
  const result = methodDataRecommendation(requirement, profile([score, activity]));
  assert.equal(result.label, "Missing required data");
  assert.match(result.reason, /in the same statement/);
  const scoreCategoryPairs = [{ score, category: activity }];
  assert.equal(methodDataRecommendation(requirement, profile([score, activity], { scoreCategoryPairs })).label, "Recommended for this data");
  assert.equal(methodDataRecommendation(requirement, profile([score, activity], {
    scoreCategoryPairs, invalidFields: [activity],
  })).label, "Missing required data");
});

test("events, times, categories and outcomes use their own evidence", () => {
  assert.equal(methodDataRecommendation("EVENTS", profile([])).label, "Recommended for this data");
  assert.equal(methodDataRecommendation("EVENTS", profile([], { checkedStatements: 0 })).label, "Missing required data");
  assert.equal(methodDataRecommendation("CATEGORY", profile(["statement.verb.display"])).label, "Missing required data");
  assert.match(methodDataRecommendation("TIMESTAMP", profile(["statement.stored"])).reason, /Stored timestamp \(stored\)/);
  assert.match(methodDataRecommendation("OUTCOME", profile(["statement.result.success"])).reason, /Success \(result\.success\)/);
  assert.equal(methodDataRecommendation("OUTCOME", profile(["statement.verb.id"])).label, "Missing required data");
});

test("a partial scan can establish evidence but cannot declare unchecked data absent", () => {
  const scoresMissingFromSample = methodDataRecommendation("SCORE", profile([], { complete: false }));
  assert.equal(scoresMissingFromSample.label, "Input availability uncertain");
  assert.match(scoresMissingFromSample.reason, /checked statements did not confirm/);
  assert.equal(methodDataRecommendation("SCORE", profile([score], { complete: false })).label, "Recommended for this data");
});

test("a plugin can recommend a new combination of supported roles", () => {
  const timestamp = "statement.stored";
  const outcome = "statement.result.success";
  const roles = ["OUTCOME", "TIMESTAMP"];
  assert.equal(methodDataRecommendation(null, profile([timestamp]), roles).label, "Missing required data");
  const available = methodDataRecommendation(null, profile([timestamp, outcome]), roles);
  assert.equal(available.label, "Required fields available");
  assert.match(available.reason, /Success.*Stored timestamp/);
  assert.equal(methodDataRecommendation(null, profile([timestamp, outcome, score, activity]),
    [...roles, "SCORE", "CATEGORY"]).label, "Missing required data");
});
