import { draftErrorMessage } from "./indicator-draft-api.js";
import { readDraftRecovery, removeDraftRecovery, writeDraftRecovery } from "./indicator-draft-storage.js";

const copy = (value) => JSON.parse(JSON.stringify(value));
const normalizedName = (value) => String(value || "").trim() || "Untitled indicator";
const fingerprint = (value) => JSON.stringify({ name: normalizedName(value.name), configuration: value.configuration });
const newRequestId = () => globalThis.crypto.randomUUID();
const blocked = (message) => Object.assign(new Error(message), { draftActionBlocked: true });

// A framework-independent queue makes ordering, recovery and revision semantics
// testable without coupling persistence to any editor's preview state.
export function createIndicatorDraftSession({
  transport, owner, environment, indicatorType, initialDraft = null,
  initialValue, meaningful = false, debounceMs = 800, maxWaitMs = 5000,
  storage, onState = () => {}, onCreated = () => {}, onApply = () => {},
  onCompleted = () => {}, requestId = newRequestId,
  timers = { set: (callback, delay) => setTimeout(callback, delay), clear: (id) => clearTimeout(id) },
}) {
  let draft = initialDraft;
  let current = copy(initialValue);
  let acknowledged = draft ? fingerprint({ name: draft.name, configuration: draft.configuration }) : null;
  let clientRequestId = requestId();
  let meaningfulValue = meaningful;
  let status = draft ? "saved" : "idle";
  let error = "";
  let conflict = null;
  let disposed = false;
  let terminal = false;
  let running = null;
  let debounceTimer = null;
  let maximumTimer = null;
  let actionBusy = false;
  let localAvailable = true;
  let creationAttempted = false;
  let pendingMutation = null;
  const scope = () => ({ owner, environment, indicatorType, draftId: draft?.id || null, clientRequestId });
  const recovered = readDraftRecovery(scope(), storage);
  localAvailable = recovered.available;
  let recovery = recovered.record;
  if (recovery && fingerprint(recovery) === acknowledged) {
    removeDraftRecovery({ ...scope(), clientRequestId: recovery.clientRequestId }, storage);
    recovery = null;
  }
  if (recovery) status = "recovery";

  const isDirty = () => !terminal && Boolean(pendingMutation || (Boolean(draft || meaningfulValue) && fingerprint(current) !== acknowledged));
  const snapshot = () => ({
    draftId: draft?.id || null, revision: draft?.revision ?? null, status, error,
    updatedAt: draft?.updatedAt || null, conflict, recovery, localAvailable,
    dirty: isDirty(), saving: Boolean(running || actionBusy), finalizing: actionBusy, draft,
    sourceIndicatorId: draft?.sourceIndicatorId || null,
  });
  const emit = () => { if (!disposed) onState(snapshot()); };
  const clearTimers = () => {
    if (debounceTimer !== null) timers.clear(debounceTimer);
    if (maximumTimer !== null) timers.clear(maximumTimer);
    debounceTimer = maximumTimer = null;
  };
  const retain = () => {
    if (disposed || !owner || !environment || (!draft && !meaningfulValue)) return;
    const result = writeDraftRecovery(scope(), {
      ...current, revision: draft?.revision ?? null, updatedAt: new Date().toISOString(),
    }, storage);
    localAvailable = result.ok;
  };
  const fail = (failure) => {
    error = draftErrorMessage(failure);
    if (failure?.response?.status === 409) {
      conflict = { message: error };
      status = "conflict";
    } else status = "error";
    retain();
    emit();
  };

  const persist = () => {
    if (running) return running;
    if (disposed || terminal) return Promise.reject(blocked("This editor is no longer active."));
    if (recovery) return Promise.reject(blocked("Choose whether to restore the browser recovery before saving."));
    if (conflict) return Promise.reject(blocked("Resolve the newer draft version before saving."));
    if (!owner) return Promise.reject(blocked("Sign in before saving a draft."));
    if (!isDirty()) return Promise.resolve(draft);
    clearTimers();
    status = "saving";
    error = "";
    // Assign the promise before invoking callbacks; synchronous editor changes
    // cannot start a second POST/PUT while the first request is in flight.
    running = Promise.resolve().then(async () => {
      let created = false;
      try {
        while (!disposed && !terminal && isDirty()) {
          const mutation = pendingMutation || {
            value: copy(current), id: draft?.id || null, revision: draft?.revision,
            requestId: draft ? requestId() : clientRequestId,
          };
          pendingMutation = mutation;
          const value = mutation.value;
          const oldScope = scope();
          const wasNew = !mutation.id;
          const body = { ...value, name: normalizedName(value.name), schemaVersion: 1 };
          if (wasNew) creationAttempted = true;
          const result = wasNew
            ? await transport.create({ ...body, indicatorType, clientRequestId: mutation.requestId })
            : await transport.update(mutation.id, { ...body, revision: mutation.revision, clientRequestId: mutation.requestId });
          if (!result?.id || !Number.isSafeInteger(result.revision)) throw new Error("The server returned an invalid draft acknowledgment.");
          draft = result;
          // Idempotent retries may return the existing draft's latest state.
          // Compare the actual acknowledgment, then persist intervening edits.
          acknowledged = fingerprint(result);
          pendingMutation = null;
          created ||= wasNew;
          // Move fallback to the canonical ID before cleaning the pre-create key.
          // Cleanup failures never turn a successful server save into a failure.
          if (isDirty()) retain();
          else removeDraftRecovery(scope(), storage);
          if (wasNew) removeDraftRecovery(oldScope, storage);
          emit();
        }
        clearTimers();
        status = "saved";
        error = "";
        if (created && !disposed) onCreated(draft);
        return draft;
      } catch (failure) {
        if (failure?.response?.status >= 400 && failure.response.status < 500) pendingMutation = null;
        fail(failure);
        throw failure;
      } finally {
        running = null;
        emit();
      }
    });
    emit();
    return running;
  };
  const schedule = () => {
    if (disposed || terminal || recovery || conflict || !isDirty() || !owner) return;
    status = "unsaved";
    if (debounceTimer !== null) timers.clear(debounceTimer);
    const start = () => { persist().catch(() => {}); };
    debounceTimer = timers.set(start, debounceMs);
    if (maximumTimer === null) maximumTimer = timers.set(start, maxWaitMs);
  };
  const update = (value, isMeaningful = true) => {
    if (disposed || terminal || actionBusy) return;
    const next = copy(value);
    meaningfulValue = isMeaningful;
    if (fingerprint(next) === fingerprint(current)) return;
    current = next;
    retain();
    if (isDirty()) schedule();
    else { clearTimers(); status = draft ? "saved" : "idle"; }
    emit();
  };
  const flush = async () => {
    clearTimers();
    if (running) await running;
    return persist();
  };
  const retry = () => { error = ""; return flush(); };
  const reloadLatest = async () => {
    if (!draft?.id) throw blocked("There is no server draft to reload.");
    if (running) await running.catch(() => {});
    actionBusy = true;
    clearTimers();
    emit();
    try {
      const latest = await transport.get(draft.id);
      if (latest.status === "COMPLETED") throw blocked("This draft has already been saved as an indicator. Return to My Indicators.");
      draft = latest;
      current = { name: latest.name, configuration: copy(latest.configuration) };
      acknowledged = fingerprint(current);
      recovery = null;
      conflict = null;
      error = "";
      status = "saved";
      removeDraftRecovery(scope(), storage);
      if (!disposed) onApply(copy(current));
      return latest;
    } catch (failure) { fail(failure); throw failure; }
    finally { actionBusy = false; emit(); }
  };
  const restoreRecovery = () => {
    if (!recovery) return;
    const candidate = recovery;
    current = { name: candidate.name, configuration: copy(candidate.configuration) };
    meaningfulValue = true;
    recovery = null;
    clientRequestId = candidate.clientRequestId;
    if (draft && candidate.revision !== draft.revision) {
      conflict = { message: "This recovery was based on an older draft version. Reload the saved draft or keep your recovered work as a separate draft." };
      status = "conflict";
    } else { error = ""; schedule(); }
    onApply(copy(current));
    emit();
  };
  const dismissRecovery = () => {
    if (recovery) removeDraftRecovery({ ...scope(), clientRequestId: recovery.clientRequestId }, storage);
    recovery = null;
    status = draft ? "saved" : "idle";
    emit();
  };
  const saveAsSeparateDraft = async () => {
    clearTimers();
    if (running) await running.catch(() => {});
    const oldScope = recovery ? { ...scope(), clientRequestId: recovery.clientRequestId } : scope();
    if (recovery) {
      current = { name: recovery.name, configuration: copy(recovery.configuration) };
      clientRequestId = recovery.clientRequestId;
      onApply(copy(current));
    }
    draft = null;
    pendingMutation = null;
    creationAttempted = false;
    acknowledged = null;
    meaningfulValue = true;
    recovery = null;
    conflict = null;
    error = "";
    clientRequestId = requestId();
    retain();
    emit();
    const created = await flush();
    removeDraftRecovery(oldScope, storage);
    return created;
  };
  const complete = async (indicator) => {
    const started = fingerprint(current);
    await flush();
    if (!draft) throw blocked("Add an indicator configuration before saving.");
    if (typeof indicator !== "function" && fingerprint(current) !== started) throw blocked("Your configuration changed while saving. Review the latest preview and save again.");
    actionBusy = true;
    clearTimers();
    emit();
    try {
      const result = await transport.complete(draft.id, {
        revision: draft.revision,
        indicator: typeof indicator === "function" ? indicator(copy(current)) : indicator,
      });
      terminal = true;
      status = "completed";
      error = "";
      removeDraftRecovery(scope(), storage);
      if (!disposed) onCompleted(result);
      return result;
    } catch (failure) { fail(failure); throw failure; }
    finally { actionBusy = false; emit(); }
  };
  const discard = async () => {
    clearTimers();
    const originalScope = scope();
    const candidateScope = recovery ? { ...scope(), clientRequestId: recovery.clientRequestId } : null;
    actionBusy = true;
    emit();
    try {
      if (running) await running.catch(() => {});
      if (pendingMutation) {
        const mutation = pendingMutation;
        const body = { ...mutation.value, name: normalizedName(mutation.value.name), schemaVersion: 1, clientRequestId: mutation.requestId };
        draft = mutation.id
          ? await transport.update(mutation.id, { ...body, revision: mutation.revision })
          : await transport.create({ ...body, indicatorType });
        pendingMutation = null;
      } else if (!draft && creationAttempted) {
        // A lost create response is ambiguous. Resolve its stable idempotency
        // key before deleting, rather than abandoning a possible server draft.
        draft = await transport.create({ ...copy(current), name: normalizedName(current.name), schemaVersion: 1, indicatorType, clientRequestId });
      }
      if (draft) await transport.discard(draft.id, draft.revision);
      terminal = true;
      status = "discarded";
      error = "";
      removeDraftRecovery(scope(), storage);
      removeDraftRecovery(originalScope, storage);
      if (candidateScope) removeDraftRecovery(candidateScope, storage);
    } catch (failure) { fail(failure); throw failure; }
    finally { actionBusy = false; emit(); }
  };
  return {
    getState: snapshot, update, flush, retry, complete, discard, reloadLatest,
    saveAsSeparateDraft, restoreRecovery, dismissRecovery,
    activate: () => { disposed = false; if (status !== "error") schedule(); emit(); },
    dispose: () => { disposed = true; clearTimers(); },
  };
}
