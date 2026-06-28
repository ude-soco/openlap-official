// Local draft persistence utilities for the ISC Creator.
//
// Phase A foundation (see docs/ISC_CREATOR_ARCHITECTURE.md §12). These wrap the
// raw storage I/O behind the serialization adapter. They are NOT yet wired into
// the orchestrator's autosave loop — extracting the I/O now keeps the eventual
// autosave-UX change (debounced status, recovery) a small, isolated step and
// leaves current behavior untouched.
//
// The storage object and key are passed in (the key is `SESSION_ISC` from
// AuthContext today) so these stay pure and testable, and so a future phase can
// switch sessionStorage → localStorage without touching callers.

import { serializeIscDraft, toIscDomainState } from "./isc-serialization.js";

/** Read + parse a draft into domain state, or null when absent/invalid. */
export const readIscDraft = (storage, key) => {
  const raw = storage?.getItem?.(key);
  if (!raw) return null;
  return toIscDomainState(raw, { sourceType: "draft" });
};

/** Whether a draft currently exists in storage. */
export const hasIscDraft = (storage, key) => Boolean(storage?.getItem?.(key));

/** Serialize + persist domain state as a draft. */
export const writeIscDraft = (storage, key, domainState) => {
  storage?.setItem?.(key, JSON.stringify(serializeIscDraft(domainState)));
};

/** Remove the current draft. */
export const clearIscDraft = (storage, key) => {
  storage?.removeItem?.(key);
};
