import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNavigationGuard } from "../../../../setup/routes-manager/navigation-guard-context.js";
import { DraftLeaveDialog } from "./draft-header.jsx";
import { draftErrorMessage } from "./indicator-draft-api.js";

export default function useDraftNavigation(draft, { exitTo = "/indicator" } = {}) {
  const navigation = useNavigationGuard();
  const navigate = useNavigate();
  const current = useRef(draft);
  current.current = draft;
  const released = useRef(false);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discardOnly, setDiscardOnly] = useState(false);
  const needsReview = useCallback(() => !released.current && (
    current.current.dirty || current.current.saving ||
    Boolean(current.current.recovery || current.current.conflict)
  ), []);

  useEffect(() => {
    if (!navigation) return undefined;
    const guard = (next) => {
      if (!needsReview()) return false;
      setError("");
      setDiscardOnly(false);
      setTarget(next);
      return true;
    };
    navigation.registerGuard(guard, { actions: true });
    return () => navigation.unregisterGuard(guard);
  }, [navigation, needsReview]);
  useEffect(() => {
    const beforeUnload = (event) => {
      if (!needsReview()) return;
      // Every edit already writes safe local recovery synchronously. Browsers
      // cannot guarantee an awaited HTTP save while a document is unloading.
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [needsReview]);

  const perform = useCallback(async (action, destination) => {
    setBusy(true);
    setError("");
    try {
      await action();
      released.current = true;
      if (typeof destination?.action === "function") await destination.action();
      else navigate(destination);
    } catch (failure) {
      released.current = false;
      setError(draftErrorMessage(failure));
      throw failure;
    } finally { setBusy(false); }
  }, [navigate]);
  const saveAndExit = useCallback((destination = exitTo) => perform(current.current.flush, destination), [exitTo, perform]);
  const discardAndExit = useCallback((destination = exitTo) => perform(current.current.discard, destination), [exitTo, perform]);
  return {
    saveAndExit, discardAndExit,
    release: () => { released.current = true; },
    requestLeave: (destination) => {
      if (needsReview()) { setError(""); setDiscardOnly(false); setTarget(destination); }
      else if (typeof destination?.action === "function") destination.action();
      else navigate(destination);
    },
    requestDiscard: (destination = exitTo) => { setError(""); setDiscardOnly(true); setTarget(destination); },
    dialog: <DraftLeaveDialog open={Boolean(target)} busy={busy || draft.saving} error={error} discardOnly={discardOnly}
      onStay={() => setTarget(null)}
      onSaveAndExit={() => { saveAndExit(target).catch(() => {}); }}
      onDiscardAndExit={() => { discardAndExit(target).catch(() => {}); }} />,
  };
}
