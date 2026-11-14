// Local draft persistence utilities for the ISC Creator.
//
// See docs/ISC_ARCHITECTURE.md, "Routes, autosave and recovery". These wrap
// storage I/O behind the serialization adapter. The creator's autosave loop
// currently writes its recovery envelope directly rather than using these helpers.
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
