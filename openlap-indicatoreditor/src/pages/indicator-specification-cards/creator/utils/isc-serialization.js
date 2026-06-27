// Serialization adapter for ISC Creator state.
//
// Phase A foundation (see docs/ISC_CREATOR_ARCHITECTURE.md §9). This is the seam
// that decouples the in-memory model from how ISCs are persisted, so the future
// reducer/workspace can evolve the internal shape WITHOUT breaking saved ISCs.
//
// Two persistence contexts exist today and BOTH must keep working:
//   1. Server payload (POST /v1/isc/create, PUT /v1/isc/{id}; GET /v1/isc/{id}):
//      an object whose `requirements`, `dataset`, `visRef`, `lockedStep` fields
//      are each a JSON STRING. `lockedStep` is mandatory (@NotBlank) on the
//      backend, so it must always be emitted.
//   2. Local draft (sessionStorage[SESSION_ISC]): a single JSON object whose
//      slices are OBJECTS, plus an `id`.
//
// The adapter tolerates both encodings on the way in and reproduces the exact
// expected shape on the way out — round-trips are intentionally lossless.

import { ISC_SCHEMA_VERSION } from "./isc-constants.js";

/**
 * Parse a value that may be a JSON string (server payload) or already an object
 * (draft / in-memory). Returns `fallback` on null/invalid JSON.
 */
export const parseMaybeJSON = (value, fallback = undefined) => {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Normalize any persisted ISC source — a server "details" object OR a draft
 * object OR a JSON string of either — into parsed slices + raw meta. Tolerant of
 * both string- and object-encoded slices.
 */
export const parseIscPayload = (raw) => {
  const source = parseMaybeJSON(raw, raw) || {};
  return {
    id: source.id ?? null,
    requirements: parseMaybeJSON(source.requirements, undefined),
    dataset: parseMaybeJSON(source.dataset, undefined),
    visRef: parseMaybeJSON(source.visRef, undefined),
    lockedStep: parseMaybeJSON(source.lockedStep, undefined),
    meta: {
      createdBy: source.createdBy ?? source.meta?.createdBy ?? null,
      createdOn: source.createdOn ?? source.meta?.createdOn ?? null,
      schemaVersion: source.schemaVersion ?? source.meta?.schemaVersion ?? null,
      savedAt: source.savedAt ?? source.meta?.savedAt ?? null,
    },
  };
};

/**
 * Normalize/upgrade a parsed payload into the internal domain-state envelope.
 * Non-destructive: missing slices stay null (callers/the orchestrator supply
 * fresh defaults for a brand-new card). Stamps the current schema version when
 * the source did not carry one.
 */
export const migrateLegacyIscPayload = (parsed, { sourceType = "unknown" } = {}) => ({
  meta: {
    id: parsed.id ?? null,
    schemaVersion: parsed.meta?.schemaVersion ?? ISC_SCHEMA_VERSION,
    savedAt: parsed.meta?.savedAt ?? null,
    createdBy: parsed.meta?.createdBy ?? null,
    createdOn: parsed.meta?.createdOn ?? null,
    source: sourceType,
  },
  // Phase A keeps the canonical slice names (incl. `visRef`) so round-trips are
  // byte-identical. The physical domain/wizard split described in the blueprint
  // happens in a later phase behind these same adapter functions.
  requirements: parsed.requirements ?? null,
  dataset: parsed.dataset ?? null,
  visRef: parsed.visRef ?? null,
  lockedStep: parsed.lockedStep ?? null,
});

/**
 * Convenience: parse + migrate in one call.
 * @param {object|string} source server details, draft object, or JSON string
 * @param {{sourceType?: 'server'|'draft'|'unknown'}} [options]
 */
export const toIscDomainState = (source, { sourceType = "unknown" } = {}) =>
  migrateLegacyIscPayload(parseIscPayload(source), { sourceType });

/**
 * Produce the SERVER payload for create/update. Matches the exact shape the
 * existing finalize-api sends today: four JSON-string fields. `lockedStep` is
 * always emitted (backend requires it).
 *
 * NOTE: `schemaVersion` is intentionally NOT added to the server payload in
 * Phase A — the goal is zero change to saved-ISC behavior. (The backend's
 * `IscRequest` DTO has no such field; Spring would ignore an extra one, so a
 * future phase can add it once intended.) Versioning is tracked client-side.
 */
export const serializeIscDomainState = (domainState) => ({
  requirements: JSON.stringify(domainState.requirements),
  dataset: JSON.stringify(domainState.dataset),
  visRef: JSON.stringify(domainState.visRef),
  lockedStep: JSON.stringify(domainState.lockedStep),
});

/**
 * Produce the LOCAL DRAFT object (for sessionStorage). Slices stay as objects,
 * matching what the creator orchestrator reads today (`JSON.parse(saved).<slice>`).
 * Adds a `meta` block (additive — ignored by current readers).
 */
export const serializeIscDraft = (domainState) => ({
  id: domainState.meta?.id ?? null,
  requirements: domainState.requirements,
  dataset: domainState.dataset,
  visRef: domainState.visRef,
  lockedStep: domainState.lockedStep,
  meta: {
    schemaVersion: domainState.meta?.schemaVersion ?? ISC_SCHEMA_VERSION,
    savedAt: domainState.meta?.savedAt ?? null,
  },
});

/** Parse a local draft (string or object) back into domain state. */
export const parseIscDraft = (raw) => toIscDomainState(raw, { sourceType: "draft" });
