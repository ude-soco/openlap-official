export const DRAFT_SCHEMA_VERSION = 1;
export const DRAFT_RECOVERY_PREFIX = "openlap:indicator-draft:v1:";
const TYPES = new Set(["BASIC", "COMPOSITE", "MULTI_LEVEL"]);
const LIMIT = 1048576;
const encode = (value) => encodeURIComponent(value);
const storageOf = (provided) => provided ?? globalThis.localStorage;
const scopedPrefix = ({ owner, environment, indicatorType }) =>
  `${DRAFT_RECOVERY_PREFIX}${encode(environment)}:${encode(owner)}:${encode(indicatorType)}:`;

export function recoveryStorageKey(scope) {
  if (!scope?.owner || !scope.environment || !TYPES.has(scope.indicatorType)) return null;
  // A draft can be open in several tabs. Keep each writer's fallback separate,
  // so one tab acknowledging its save cannot erase another tab's unsaved work.
  return `${scopedPrefix(scope)}${scope.draftId ? `draft-${encode(scope.draftId)}:` : "new:"}${encode(scope.clientRequestId)}`;
}

export function validateDraftRecovery(value, scope) {
  try {
    if (typeof value !== "string" || value.length > LIMIT) return null;
    const record = JSON.parse(value);
    if (record.schemaVersion !== DRAFT_SCHEMA_VERSION || record.owner !== scope.owner ||
        record.environment !== scope.environment || record.indicatorType !== scope.indicatorType ||
        (record.draftId || null) !== (scope.draftId || null) ||
        typeof record.clientRequestId !== "string" || !record.clientRequestId ||
        typeof record.name !== "string" || !record.configuration ||
        typeof record.configuration !== "object" || Array.isArray(record.configuration) ||
        !Number.isFinite(Date.parse(record.updatedAt)) ||
        (record.revision !== null && (!Number.isSafeInteger(record.revision) || record.revision < 0))) return null;
    return record;
  } catch { return null; }
}

export function readDraftRecovery(scope, providedStorage) {
  if (!scope?.owner || !scope.environment || !TYPES.has(scope.indicatorType)) return { record: null, available: false };
  try {
    const storage = storageOf(providedStorage);
    if (!storage) return { record: null, available: false };
    const prefix = scopedPrefix(scope);
    const records = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const record = validateDraftRecovery(storage.getItem(key), scope);
      if (record) records.push(record);
    }
    records.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    return { record: records[0] || null, available: true };
  } catch { return { record: null, available: false }; }
}

export function writeDraftRecovery(scope, value, providedStorage) {
  const key = recoveryStorageKey(scope);
  if (!key) return { ok: false };
  try {
    const serialized = JSON.stringify({ ...value, ...scope, schemaVersion: DRAFT_SCHEMA_VERSION });
    if (serialized.length > LIMIT) return { ok: false };
    storageOf(providedStorage).setItem(key, serialized);
    return { ok: true };
  } catch { return { ok: false }; }
}

export function removeDraftRecovery(scope, providedStorage) {
  const key = recoveryStorageKey(scope);
  if (!key) return { ok: false };
  try { storageOf(providedStorage).removeItem(key); return { ok: true }; }
  catch { return { ok: false }; }
}

export function clearAccountDraftRecovery({ owner, environment }, providedStorage) {
  if (!owner || !environment) return { ok: false };
  try {
    const storage = storageOf(providedStorage);
    const prefix = `${DRAFT_RECOVERY_PREFIX}${encode(environment)}:${encode(owner)}:`;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    keys.filter((key) => key?.startsWith(prefix)).forEach((key) => storage.removeItem(key));
    return { ok: true };
  } catch { return { ok: false }; }
}
