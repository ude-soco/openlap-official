import { useEffect, useMemo, useRef, useState } from "react";
import { createIndicatorDraftApi } from "./indicator-draft-api.js";
import { createIndicatorDraftSession } from "./indicator-draft-session.js";

export default function useIndicatorDraft({
  api, owner, environment, indicatorType, configuration, name, initialDraft = null,
  meaningful = false, onCreated, onApply, onCompleted, debounceMs = 800, maxWaitMs = 5000,
}) {
  const callbacks = useRef({ onCreated, onApply, onCompleted });
  callbacks.current = { onCreated, onApply, onCompleted };
  const environmentId = environment || `${globalThis.location?.origin || "local"}|${api?.defaults?.baseURL || ""}`;
  const initial = useRef({ configuration, name, initialDraft, meaningful });
  const [state, setState] = useState(null);
  const session = useMemo(() => {
    let created;
    created = createIndicatorDraftSession({
      transport: createIndicatorDraftApi(api, { initialDraft: initial.current.initialDraft }), owner, environment: environmentId,
      indicatorType, ...{
        initialDraft: initial.current.initialDraft,
        initialValue: { name: initial.current.name, configuration: initial.current.configuration },
        meaningful: initial.current.meaningful,
      },
      debounceMs, maxWaitMs, onState: (next) => setState({ session: created, value: next }),
      onCreated: (draft) => callbacks.current.onCreated?.(draft),
      onApply: (value) => callbacks.current.onApply?.(value),
      onCompleted: (result) => callbacks.current.onCompleted?.(result),
    });
    return created;
  }, [api, owner, environmentId, indicatorType, debounceMs, maxWaitMs]);

  useEffect(() => {
    session.activate();
    return () => session.dispose();
  }, [session]);
  useEffect(() => {
    session.update({ name, configuration }, meaningful);
  }, [session, name, configuration, meaningful]);

  // The workspace keys this hook by logical editor identity. Canonicalizing a
  // just-created draft's URL must retain that identity; opening another draft
  // deliberately remounts from its authoritative GET response.
  return { ...(state?.session === session ? state.value : session.getState()),
    flush: session.flush, retry: session.retry, complete: session.complete,
    discard: session.discard, reloadLatest: session.reloadLatest,
    saveAsSeparateDraft: session.saveAsSeparateDraft,
    restoreRecovery: session.restoreRecovery, dismissRecovery: session.dismissRecovery,
  };
}
