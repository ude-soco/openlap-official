import { v5 as uuidv5 } from "uuid";

const COPY_NAMESPACE = "e140f8b2-cc75-5b91-a516-1ab5dfc26bf7";
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;

// The exact same scoped recovery must resolve to the same private copy even
// when its first POST committed but the browser never received the response.
export function closedRecoveryRequest(record) {
  const identity = canonical({ owner: record.owner, environment: record.environment,
    indicatorType: record.indicatorType, draftId: record.draftId,
    writer: record.clientRequestId, name: record.name, configuration: record.configuration });
  return {
    clientRequestId: uuidv5(JSON.stringify(identity), COPY_NAMESPACE),
    indicatorType: record.indicatorType, schemaVersion: 1,
    name: record.name, configuration: record.configuration,
  };
}
