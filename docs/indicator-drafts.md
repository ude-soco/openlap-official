# Indicator drafts

Basic, Composite and Multilevel editors share private, persistent drafts. A
draft can be incomplete. It appears under **My Indicators → Drafts** after the
first meaningful edit has been saved to the server. Opening an empty new editor
does not create a draft.

## Saving and resuming

- Edit the indicator's working name and configuration normally. Autosave sends
  changes after a short pause, with a maximum wait during continuous editing.
- **Draft saved** means the server acknowledged the current configuration.
  **Save draft** saves immediately; **Save draft and exit** waits for the latest
  changes before leaving. Failed saves retain the editor and provide retry.
- Continue from the Drafts table or reopen the draft's address in another
  authenticated browser. The server checks ownership on every operation.
- Search, filter by indicator type, sort, rename or discard from the same table.
  Discard requires confirmation. Starting another indicator preserves existing
  drafts.

Editing a saved indicator opens or resumes a separate editing draft. Draft
autosaves do not change the saved indicator, its embeds or the source definitions
used by other indicators. **Save Indicator** / **Update indicator** validates and
commits the completed definition. Discarding an editing draft keeps its saved
source intact.

Incomplete drafts are excluded from the Indicator Pool, public embeds and the
Basic source picker. Autosave itself does not analyze data or execute chart code.
Editor previews continue to run only when their required selections are valid.

## Recovery and conflicts

The server holds the authoritative draft. A bounded browser recovery copy stores
pending authoring changes, scoped by account, application environment, draft and
writer. It does not contain analyzed rows, generated chart code or catalog caches.
Browser recovery availability is shown separately from server save status.

On resume, the editor refreshes available LRSs, methods and visualization
contracts and regenerates previews. Unavailable choices remain visible for
review. A newer local recovery copy is offered explicitly rather than silently
replacing a server draft.

Concurrent tabs/devices use revision checks. A conflict preserves local changes
and offers **Reload latest draft** or **Save as separate draft**. Changes to the
saved source of an editing draft also require review before replacing it. The
separate-draft option creates independent new work and leaves that source intact.

Internal navigation and sign out offer to save or discard pending changes.
Explicit sign out clears that account's active browser recovery after the
editor's save/discard choice. Session expiry retains scoped recovery for the
same account to resume after signing in again. Browsers cannot guarantee an
awaited network request during tab closure; confirmed server saves remain
available independently of the browser.

Older Basic recovery copies have no reliable account owner, so importing one
requires confirmation that it is the user's work. Older account-scoped Complex
copies are also offered explicitly. The legacy copy is removed only after the
new draft is acknowledged by the server. Unreadable legacy server drafts remain
listed for review/discard rather than crashing the editor.

## Implementation

`IndicatorDraftService` owns the lifecycle in MongoDB's existing
`analytics-indicator-drafts` collection. Configuration is a versioned, bounded
authoring document with a per-editor adapter. Ownership is derived from the
authenticated principal. Each draft has an independent revision; editing drafts
also capture the saved source's definition fingerprint.

| Operation | Endpoint, relative to `/api/v1/indicators` |
| --- | --- |
| Create | `POST /drafts` with a stable client request UUID |
| List own active drafts | `GET /drafts` |
| Resume | `GET /drafts/{id}` |
| Autosave / rename | `PUT /drafts/{id}` with expected revision and mutation UUID |
| Open saved indicator for editing | `POST /{indicatorId}/edit-draft` |
| Commit completed definition | `POST /drafts/{id}/complete` with revision and complete indicator request |
| Resume an interrupted completion | `POST /drafts/{id}/resume` |
| Discard | `DELETE /drafts/{id}?revision=…` |

Responses use the existing `ApiSuccess.data` envelope and `Cache-Control:
no-store`. Lists support pagination, name search, indicator type and sorting by
name/type/creation/update time. Unknown or other users' draft IDs are unavailable.

The shared frontend session serializes autosaves and coalesces pending edits.
An uncertain create/update is retried with the same mutation identity before
sending newer work. Completion reserves one target identity, applies a
conditional save and records a durable receipt; retries cannot create another
indicator. An interrupted completion keeps its original validated payload on the
server and opens in a resume-only state until its outcome is resolved. A unique
active editing-draft key prevents concurrent opens from
creating multiple edit drafts for the same source.

Completed/discarded receipts retain retry information but release configuration
and plugin references. Active drafts are not automatically expired. The existing
plugin/source reference guards still apply to final saving and removal.

The canonical workspace address is `/indicator/editor/drafts/{id}`;
`/indicator/drafts/{id}` redirects there. The first autosave updates the address
without remounting the editor or resetting its current step.

## Verification and rollout

Backend lifecycle, ownership, conditional writes, retry recovery and validation
are covered by the backend test suite. Frontend checks include the shared queue,
storage failures, conflicts, sign out, draft-list actions, mobile layouts and
the existing Basic/Complex analysis/chart workflows:

Browser checks require a separate Playwright/WebKit installation, as prepared by
the JavaScript CI workflow. Set `NODE_PATH` to that installation when running the
browser drivers locally; application dependencies alone do not install it.

```sh
cd indicatorframework
npm test
npm run test:draft-foundation
# With an isolated Vite server; all API responses are local test fixtures:
OPENLAP_TEST_BASE_URL=http://127.0.0.1:5173 npm run test:indicator-drafts
```

Use a manifest-capable OpenLAP backend and upgrade all backend writers before
enabling the frontend. Existing source-dependency rollout safeguards remain in
[the complex-indicator guide](complex-indicators.md#deploying-the-workflows).
Legacy indicator APIs remain available for compatibility; the editors use the
draft completion boundary. This feature does not deploy or modify any cluster,
object storage or existing saved indicator automatically.
