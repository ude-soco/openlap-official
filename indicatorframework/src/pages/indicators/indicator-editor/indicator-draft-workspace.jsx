import { lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { createIndicatorDraftApi } from "./drafts/indicator-draft-api.js";
import { refreshBasicReferences } from "./basic-indicator/utils/basic-draft-model.js";
import { editorRoute } from "./utils/indicator-draft-routes.js";

const BasicIndicator = lazy(() => import("./basic-indicator/basic-indicator.jsx"));
const ComplexIndicator = lazy(() => import("./complex-indicator/complex-indicator.jsx"));
const IndicatorEditor = lazy(() => import("./indicator-editor.jsx"));

// A single route boundary preserves the live editor while its first autosave
// replaces the new-work URL with a durable draft URL. Reloads and other draft
// IDs always load authoritative, owner-checked server data.
export default function IndicatorDraftWorkspace() {
  const { api, user } = useContext(AuthContext);
  const params = useParams();
  const navigate = useNavigate();
  const route = editorRoute(params["*"] || "");
  const identity = route.identity;
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const currentWorkspace = useRef(workspace);
  currentWorkspace.current = workspace;

  useEffect(() => {
    const run = ++generation.current;
    if (route.mode === "choose" || route.mode === "unknown") {
      setWorkspace(null);
      setError("");
      return undefined;
    }
    if (currentWorkspace.current?.identities.includes(identity)) {
      if (currentWorkspace.current.handoffFrom) setWorkspace((previous) => ({ ...previous, handoffFrom: null }));
      return undefined;
    }
    if (currentWorkspace.current?.handoffFrom === identity) return undefined;
    setError("");
    if (route.mode === "new") {
      setWorkspace({ key: crypto.randomUUID(), identities: [identity], indicatorType: route.indicatorType,
        initialDraft: null, initialState: null });
      return undefined;
    }
    const load = async () => {
      try {
        const transport = createIndicatorDraftApi(api);
        const draft = route.mode === "edit" ? await transport.edit(route.id) : await transport.get(route.id);
        if (run !== generation.current) return;
        if (draft.status === "COMPLETED" && draft.savedIndicatorId) {
          navigate(`/indicator/${encodeURIComponent(draft.savedIndicatorId)}`, { replace: true });
          return;
        }
        if (draft.status !== "DRAFT" || draft.recoverable === false) throw new Error(
          draft.recoverable === false ? "This older draft cannot be safely restored. You can discard it from My Indicators." : "This draft is no longer available.");
        const refreshed = draft.indicatorType === "BASIC"
          ? await refreshBasicReferences(api, draft.configuration) : null;
        if (run !== generation.current) return;
        const draftIdentity = `draft:${draft.id}`;
        setWorkspace({ key: `${user?.sub}:${draft.id}:${retry}`, identities: [identity, draftIdentity],
          indicatorType: draft.indicatorType, initialDraft: draft, initialState: refreshed });
        if (route.mode === "edit") navigate(`/indicator/editor/drafts/${encodeURIComponent(draft.id)}`, { replace: true });
      } catch (failure) {
        if (run === generation.current) setError(failure?.response?.data?.message || failure?.message || "Could not open this draft.");
      }
    };
    load();
    return () => { generation.current += 1; };
  // Route snapshots are reduced to a stable identity to avoid reloading on renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, identity, retry, navigate, user?.sub]);

  const onDraftCreated = useCallback((draft) => {
    setWorkspace((previous) => previous ? { ...previous, initialDraft: draft,
      identities: [`draft:${draft.id}`], handoffFrom: identity } : previous);
    navigate(`/indicator/editor/drafts/${encodeURIComponent(draft.id)}`, { replace: true });
  }, [navigate, identity]);

  if (route.mode === "choose") return <Suspense fallback={<CircularProgress aria-label="Loading editor" />}><IndicatorEditor /></Suspense>;
  if (route.mode === "unknown") return <Alert severity="error">This indicator editor address is not available.</Alert>;
  if (error) return <Stack sx={{ gap: 2 }}><Alert severity="error">{error}</Alert><Stack direction="row" sx={{ gap: 1 }}>
    <Button variant="contained" onClick={() => setRetry((value) => value + 1)}>Retry</Button>
    <Button onClick={() => navigate("/indicator?view=drafts")}>Back to My Indicators</Button>
  </Stack></Stack>;
  if (!workspace?.identities.includes(identity) && workspace?.handoffFrom !== identity) return <CircularProgress aria-label="Loading indicator draft" />;
  return <Suspense fallback={<CircularProgress aria-label="Loading editor" />}>
    {workspace.indicatorType === "BASIC"
      ? <BasicIndicator key={workspace.key} initialDraft={workspace.initialDraft} initialState={workspace.initialState} onDraftCreated={onDraftCreated} />
      : <ComplexIndicator key={workspace.key} type={workspace.indicatorType} initialDraft={workspace.initialDraft} onDraftCreated={onDraftCreated} />}
  </Suspense>;
}
