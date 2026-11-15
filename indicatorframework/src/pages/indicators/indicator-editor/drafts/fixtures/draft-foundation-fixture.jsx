// Synthetic hook/UI contract fixture. It has no authentication, database,
// analytics or plugin access and is not imported by the application bundle.
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { Button, Stack, Typography } from "@mui/material";
import { NavigationGuardProvider } from "../../../../../setup/routes-manager/navigation-guard.jsx";
import { useNavigationGuard } from "../../../../../setup/routes-manager/navigation-guard-context.js";
import useIndicatorDraft from "../use-indicator-draft.js";
import useDraftNavigation from "../use-draft-navigation.jsx";
import DraftHeader, { defaultDraftName } from "../draft-header.jsx";

const clone = (value) => JSON.parse(JSON.stringify(value));
// eslint-disable-next-line react-refresh/only-export-components
function Fixture() {
  const location = useLocation();
  const navigate = useNavigate();
  const guardedNavigation = useNavigationGuard();
  const [initialDraft] = useState(() => new URLSearchParams(location.search).get("case") === "conflict" ? {
    id: "server-draft", revision: 3, indicatorType: "COMPOSITE", schemaVersion: 1,
    name: "Saved working draft", configuration: { sources: [{ id: "first" }] },
    status: "DRAFT", updatedAt: new Date().toISOString(),
  } : null);
  const [configuration, setConfiguration] = useState(initialDraft?.configuration || { sources: [] });
  const [name, setName] = useState(initialDraft?.name || defaultDraftName("COMPOSITE"));
  const api = useMemo(() => {
    const control = { calls: [], failWrites: false, conflict: Boolean(initialDraft), drafts: initialDraft ? { [initialDraft.id]: clone(initialDraft) } : {} };
    const response = (data) => ({ data: { data: clone(data) } });
    const mutation = (method, path, body) => {
      control.calls.push({ method, path, body: clone(body) });
      if (control.failWrites) return Promise.reject(new Error("Fixture offline"));
      if (method === "put" && control.conflict) return Promise.reject(Object.assign(new Error("A newer draft exists"), { response: { status: 409, data: { message: "A newer draft exists" } } }));
      const id = method === "post" ? `created-${control.calls.filter((call) => call.method === "post").length}` : path.split("/").at(-1);
      const draft = { ...body, id, revision: method === "post" ? 0 : body.revision + 1, status: "DRAFT", updatedAt: new Date().toISOString() };
      control.drafts[id] = draft;
      return Promise.resolve(response(draft));
    };
    return {
      control,
      defaults: { baseURL: "/fixture-api/" },
      post: (path, body) => mutation("post", path, body),
      put: (path, body) => mutation("put", path, body),
      delete: async (path) => { control.calls.push({ method: "delete", path }); return response({}); },
      get: async (path) => { const id = path.split("/").at(-1); return response(control.drafts[id]); },
    };
  }, [initialDraft]);
  useEffect(() => { window.__draftFixture = api.control; }, [api]);
  const draft = useIndicatorDraft({
    api, owner: "fixture@example.test", environment: "draft-foundation-fixture", indicatorType: "COMPOSITE",
    initialDraft, configuration, name, meaningful: configuration.sources.length > 0 || name !== defaultDraftName("COMPOSITE"),
    debounceMs: 180, maxWaitMs: 500,
    onCreated: (created) => navigate(`/__draft_fixture/${created.id}`, { replace: true }),
    onApply: (next) => { setConfiguration(next.configuration); setName(next.name); },
  });
  const navigation = useDraftNavigation(draft, { exitTo: "/__draft_fixture/exit" });
  return <Stack sx={{ maxWidth: 1000, mx: "auto", p: 3, gap: 2 }}>
    <Typography variant="h5">Indicator draft fixture</Typography>
    <DraftHeader name={name} onNameChange={setName} indicatorType="COMPOSITE" draft={draft}
      onSaveAndExit={() => navigation.saveAndExit()} onDiscard={() => navigation.requestDiscard()} />
    <Button onClick={() => setConfiguration((previous) => ({ sources: [...previous.sources, { id: `source-${previous.sources.length}` }] }))}>Add source</Button>
    <Button onClick={() => guardedNavigation.guardedNavigate("/__draft_fixture/leave")}>Go to indicators</Button>
    <Typography role="note">{configuration.sources.length} sources</Typography>
    <Typography data-testid="location">{location.pathname}</Typography>
    {navigation.dialog}
  </Stack>;
}
createRoot(document.getElementById("root")).render(<StrictMode><BrowserRouter><NavigationGuardProvider><Fixture /></NavigationGuardProvider></BrowserRouter></StrictMode>);
