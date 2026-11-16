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
  let finalization = null;
  let pendingTerminal = initialDraft?.completionPending
    ? { kind: "complete", id: initialDraft.id, revision: initialDraft.revision, value: copy(current), request: null }
    : null;
  let closedReceipt = null;
  const scope = () => ({ owner, environment, indicatorType, draftId: draft?.id || null, clientRequestId });
  const recovered = readDraftRecovery(scope(), storage);
  localAvailable = recovered.available;
  let recovery = recovered.record;
  if (recovery && fingerprint(recovery) === acknowledged) {
    removeDraftRecovery({ ...scope(), clientRequestId: recovery.clientRequestId }, storage);
    recovery = null;
  }
  if (recovery) status = "recovery";
  if (pendingTerminal) status = "pending";

  const isDirty = () => !terminal && Boolean(pendingTerminal || pendingMutation || (Boolean(draft || meaningfulValue) && fingerprint(current) !== acknowledged));
  const snapshot = () => ({
    draftId: draft?.id || null, revision: draft?.revision ?? null, status, error,
    updatedAt: draft?.updatedAt || null, conflict, recovery, localAvailable,
    dirty: isDirty(), saving: Boolean(running || actionBusy), finalizing: Boolean(actionBusy || pendingTerminal || terminal), draft,
    pendingTerminal: pendingTerminal ? { kind: pendingTerminal.kind } : null, closedReceipt,
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
    if (pendingTerminal) {
      conflict = null;
      status = "pending";
    } else if (failure?.response?.status === 409) {
      conflict = { message: error };
      status = "conflict";
    } else status = "error";
    retain();
    emit();
  };

  const persist = () => {
    if (running) return running;
    if (disposed || terminal) return Promise.reject(blocked("This editor is no longer active."));
    if (pendingTerminal) return Promise.reject(blocked("Resolve the previous save or discard before editing this draft."));
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
    if (disposed || terminal || pendingTerminal || recovery || conflict || !isDirty() || !owner) return;
    status = "unsaved";
    if (debounceTimer !== null) timers.clear(debounceTimer);
    const start = () => { persist().catch(() => {}); };
    debounceTimer = timers.set(start, debounceMs);
    if (maximumTimer === null) maximumTimer = timers.set(start, maxWaitMs);
  };
  const update = (value, isMeaningful = true) => {
    if (disposed || terminal || pendingTerminal || actionBusy) return;
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
  const retry = () => { error = ""; return pendingTerminal ? resumeTerminal() : flush(); };
  const reloadLatest = async () => {
    if (pendingTerminal) return resumeTerminal();
    if (!draft?.id) throw blocked("There is no server draft to reload.");
    if (running) await running.catch(() => {});
    actionBusy = true;
    clearTimers();
    emit();
    try {
      const latest = await transport.get(draft.id);
      if (latest.status === "COMPLETED" || latest.status === "DISCARDED") return finishReceipt(latest);
      if (latest.completionPending) {
        draft = latest;
        pendingTerminal = { kind: "complete", id: latest.id, revision: latest.revision, value: copy(current), request: null,
          preserveLocal: fingerprint(current) !== fingerprint(latest) };
        status = "pending";
        conflict = null;
        error = "";
        retain();
        return latest;
      }
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
    if (pendingTerminal || closedReceipt) return;
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
    if (pendingTerminal || closedReceipt) return;
    if (recovery) removeDraftRecovery({ ...scope(), clientRequestId: recovery.clientRequestId }, storage);
    recovery = null;
    status = draft ? "saved" : "idle";
    emit();
  };
  const saveAsSeparateDraft = async () => {
    if (pendingTerminal || actionBusy) throw blocked("Resolve the previous save or discard before creating a separate draft.");
    clearTimers();
    if (running) await running.catch(() => {});
    const oldScope = recovery ? { ...scope(), clientRequestId: recovery.clientRequestId } : scope();
    if (recovery) {
      current = { name: recovery.name, configuration: copy(recovery.configuration) };
      clientRequestId = recovery.clientRequestId;
      onApply(copy(current));
    }
    draft = null;
    terminal = false;
    closedReceipt = null;
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
  const finishReceipt = (receipt) => {
    if (!["COMPLETED", "DISCARDED"].includes(receipt?.status)) throw new Error("The server did not confirm the previous draft action.");
    const previous = pendingTerminal;
    const originalScope = scope();
    const candidateScope = recovery ? { ...scope(), clientRequestId: recovery.clientRequestId } : null;
    const unapplied = previous?.kind !== "discard" && (previous?.preserveLocal ||
      (recovery && fingerprint(recovery) !== fingerprint(previous?.value || current)) ||
      (previous ? fingerprint(current) !== fingerprint(previous.value) : isDirty())
    );
    draft = { ...draft, ...receipt };
    pendingTerminal = null;
    pendingMutation = null;
    creationAttempted = false;
    clearTimers();
    error = "";
    if (unapplied) {
      // Another writer may have completed/discarded the server draft while
      // this tab still has edits. Keep those edits and their recovery; never
      // apply a receipt's absent configuration or silently navigate away.
      closedReceipt = receipt;
      conflict = { kind: "closed", message: receipt.status === "COMPLETED"
        ? "This draft has already been saved as an indicator. Your local changes are still here; keep them as a separate draft."
        : "This draft was discarded elsewhere. Your local changes are still here; keep them as a separate draft." };
      status = "conflict";
      retain();
      emit();
      return receipt;
    }
    terminal = true;
    closedReceipt = null;
    conflict = null;
    recovery = null;
    status = receipt.status === "COMPLETED" ? "completed" : "discarded";
    removeDraftRecovery(scope(), storage);
    removeDraftRecovery(originalScope, storage);
    if (candidateScope) removeDraftRecovery(candidateScope, storage);
    for (const oldScope of previous?.cleanupScopes || []) removeDraftRecovery(oldScope, storage);
    if (receipt.status === "COMPLETED" && !disposed) onCompleted(receipt);
    emit();
    return receipt;
  };
  const releaseChangedTerminal = (latest) => {
    pendingTerminal = null;
    draft = latest;
    acknowledged = fingerprint(latest);
    const message = "The previous save is no longer pending, but this draft changed. Reload its latest version or keep your work as a separate draft.";
    throw Object.assign(new Error(message), { response: { status: 409, data: { message } } });
  };
  const resolvePendingTerminal = async () => {
    const pending = pendingTerminal;
    if (!pending) throw blocked("There is no previous draft action to resume.");
    const accept = (receipt) => {
      const result = finishReceipt(receipt);
      // Callers such as Save-and-exit must remain in this editor until the
      // user explicitly decides what to do with unapplied local changes.
      if (closedReceipt) throw blocked(conflict.message);
      return result;
    };
    try {
      const latest = await transport.get(pending.id);
      if (["COMPLETED", "DISCARDED"].includes(latest?.status)) return accept(latest);
      if (latest?.status !== "DRAFT" || latest.id !== pending.id || !Number.isSafeInteger(latest.revision)) {
        throw new Error("The server could not confirm this draft's current state. Retry the previous action.");
      }
      draft = latest;
      if (latest.completionPending) {
        if (pending.kind !== "complete") {
          // A different writer started completion; its saved indicator must be
          // reconciled before a discard can be considered.
          pendingTerminal = { kind: "complete", id: latest.id, revision: latest.revision,
            value: copy(current), request: null, preserveLocal: true };
        }
        if (fingerprint(current) !== fingerprint(latest)) pendingTerminal.preserveLocal = true;
        return accept(await transport.resume(latest.id));
      }
      if (latest.revision !== pending.revision || (pending.kind === "complete" && !pending.request)) releaseChangedTerminal(latest);
      if (pending.kind === "discard") {
        const result = await transport.discard(pending.id, pending.revision);
        return accept(result || { ...latest, status: "DISCARDED" });
      }
      try {
        return accept(await transport.complete(pending.id, copy(pending.request)));
      } catch (failure) {
        if ([400, 422].includes(failure?.response?.status)) pendingTerminal = null;
        throw failure;
      }
    } catch (failure) {
      if (!closedReceipt || !failure.draftActionBlocked) fail(failure);
      throw failure;
    }
  };
  const completeOnce = async (indicator) => {
    const started = fingerprint(current);
    await flush();
    if (!draft) throw blocked("Add an indicator configuration before saving.");
    if (typeof indicator !== "function" && fingerprint(current) !== started) throw blocked("Your configuration changed while saving. Review the latest preview and save again.");
    let request = { revision: draft.revision,
      indicator: typeof indicator === "function" ? indicator(copy(current)) : indicator };
    if (transport.prepareComplete) request = await transport.prepareComplete(draft.id, request);
    pendingTerminal = { kind: "complete", id: draft.id, revision: draft.revision,
      request: copy(request), value: copy(current) };
    retain();
    emit();
    try { return finishReceipt(await transport.complete(draft.id, copy(request))); }
    catch (failure) {
      // Rejected definitions never reached a completion claim. Network/5xx
      // failures remain ambiguous and must be reconciled before editing.
      if ([400, 422].includes(failure?.response?.status)) pendingTerminal = null;
      fail(failure);
      throw failure;
    }
  };
  const discardOnce = async () => {
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
      pendingTerminal = { kind: "discard", id: draft?.id || null, revision: draft?.revision, value: copy(current),
        cleanupScopes: [originalScope, ...(candidateScope ? [candidateScope] : [])] };
      if (!draft) return finishReceipt({ status: "DISCARDED" });
      retain();
      const result = await transport.discard(draft.id, draft.revision);
      return finishReceipt(result || { ...draft, status: "DISCARDED" });
    } catch (failure) { fail(failure); throw failure; }
    finally { actionBusy = false; emit(); }
  };
  const finalize = (kind, operation) => {
    if (finalization) return finalization.kind === kind ? finalization.promise
      : Promise.reject(blocked("Another draft action is still running."));
    if (terminal || disposed) return Promise.reject(blocked("This draft is no longer being edited."));
    if (pendingTerminal && pendingTerminal.kind !== kind) return Promise.reject(blocked("Resolve the previous save or discard before starting another draft action."));
    const entry = { kind, promise: null };
    finalization = entry;
    actionBusy = true;
    clearTimers();
    entry.promise = Promise.resolve().then(operation).finally(() => {
      if (finalization === entry) finalization = null;
      actionBusy = false;
      emit();
    });
    emit();
    return entry.promise;
  };
  const resumeTerminal = () => finalize(pendingTerminal?.kind || "complete", resolvePendingTerminal);
  const complete = (indicator) => finalize("complete", () => pendingTerminal ? resolvePendingTerminal() : completeOnce(indicator));
  const discard = () => finalize("discard", () => pendingTerminal ? resolvePendingTerminal() : discardOnce());
  return {
    getState: snapshot, update, flush, retry, complete, discard, reloadLatest,
    saveAsSeparateDraft, restoreRecovery, dismissRecovery,
    activate: () => { disposed = false; if (status !== "error") schedule(); emit(); },
    dispose: () => { disposed = true; clearTimers(); },
  };
}
