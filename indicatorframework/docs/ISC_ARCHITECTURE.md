# Indicator Specification Card architecture

The ISC Creator helps users define an indicator through its goal, question, data
requirements and visualization. It creates a specification and prototype dataset;
the Indicator Editor is the separate workflow that queries connected learning data
and applies installed analytics plugins. See [UI architecture](UI_ARCHITECTURE.md)
for the shared shell, themes and components, and the [installation guide](../../README.md#local-installation)
to run the application.

## Workflow and source map

The creator retains five conceptual phases: requirements, path, visualization,
dataset and finalize. The selected path changes the middle phases' order:

| Persisted path | Order after requirements and path selection |
| --- | --- |
| `Visualization` | Visualization → Dataset → Finalize |
| `Task` | Analysis task and visualization → Dataset → Finalize |
| `Dataset` | Dataset → Visualization → Finalize |

The [creator](../src/pages/indicator-specification-cards/creator/indicator-specification-card.jsx)
owns React state and provides it through `ISCContext`. Shared `WorkflowStepper`
and `WorkflowSection` components show progression; unlocked sections can be
reopened. The workspace uses the routes' full-bleed layout.

| Responsibility | Source |
| --- | --- |
| Steps, paths and persisted step codes | [ISC constants](../src/pages/indicator-specification-cards/creator/utils/isc-constants.js) |
| Completion and progression view | [Selectors](../src/pages/indicator-specification-cards/creator/utils/isc-selectors.js) |
| Path changes and dependent state | [Workflow reset helpers](../src/pages/indicator-specification-cards/creator/utils/isc-workflow-reset.js) |
| Chart recommendations and requirements | [Chart compatibility](../src/pages/indicator-specification-cards/creator/components/visualization/utils/chart-compatibility.js) |
| Dataset editing and requirements rail | [Dataset workspace](../src/pages/indicator-specification-cards/creator/components/dataset/dataset.jsx) |
| Preview, definition and readiness checks | [Finalize review](../src/pages/indicator-specification-cards/creator/components/finalize/utils/finalize-readiness.js) |
| Dashboard queries and per-status actions | [My ISCs](../src/pages/indicator-specification-cards/dashboard/components/my-isc-table.jsx) |

Chart compatibility counts precise column types, including ordinal categories;
recommendation badges and requirements panels share that rule. Recommendations
guide selection and do not replace the user's decision. Requirements data defines
the dataset's columns, so adding or changing a column also changes the associated
requirement. Dataset validation distinguishes meaningful rows, invalid numeric
cells and illustrative example data. Preview components must tolerate incomplete
input without preventing the user from editing it.

## Persistence contract

The [ISC entity](../../analyticsframework/src/main/java/com/openlap/isc_module/entities/IndicatorSpecificationCard.java)
lives in MongoDB's `openlap-isc` collection. Its four domain fields are
`requirements`, `dataset`, `visRef` and `lockedStep`, each stored as a **JSON
string**. Creator state and the browser recovery copy hold parsed objects.

The [serialization helpers](../src/pages/indicator-specification-cards/creator/utils/isc-serialization.js)
read both encodings and preserve the legacy wire format. The
[draft API client](../src/pages/indicator-specification-cards/creator/utils/isc-draft-api.js)
also emits the four stringified fields. Schema versioning in the adapter is
client-side; it is not a version field on the backend ISC entity.

Preserve these compatibility boundaries when changing the editor:

- Keep all four payload fields. Legacy create/update validation requires a
  nonblank `lockedStep` value.
- Keep the persisted `lockedStep` string codes (`0` through `5`) and the path
  values above. The two middle positions depend on the chosen path.
- Preserve goal categories, custom goals and the Goal → Question → Indicator
  research model.
- Treat saved `visRef` as a compatibility contract: it includes chart selection,
  mappings and ApexCharts configuration. Check saved-card preview and editing
  when changing its shape or the renderers.
- Keep dataset column identities and requirement associations intact when
  importing, renaming or changing data types.

## Draft and saved lifecycle

The backend stores `status`, `sourceId`, `createdOn`, `updatedOn` and a denormalized
`indicatorName` alongside the four slices. Missing status on a legacy row is read
as `SAVED`; an update preserves its creation time.

| Row | Meaning | Publish behavior |
| --- | --- | --- |
| `DRAFT`, no `sourceId` | New specification | The same row becomes `SAVED` |
| `DRAFT`, with `sourceId` | Editing a saved specification | Copy into the source row, then remove the draft |
| `SAVED` | Saved specification | Edit through a separate draft |

The [service](../../analyticsframework/src/main/java/com/openlap/isc_module/services/impl/IscServiceImpl.java)
checks ownership when reading or modifying a card. Discarding an edit draft leaves
the saved source unchanged. List responses include draft kind, status, timestamps,
visualization type and dataset dimensions. Search, status filtering, sorting and
pagination run on the server; list and card views share the query state.

All endpoint paths below are relative to `/api`. See the
[controller](../../analyticsframework/src/main/java/com/openlap/isc_module/controller/IscController.java)
for request and response envelopes.

| Method and path | Purpose |
| --- | --- |
| `GET /v1/isc/my` | Owner's cards and drafts; accepts `page`, `size`, `sortBy`, `sortDirection`, `status`, `search` |
| `GET /v1/isc/{id}` | Full card or draft details |
| `POST /v1/isc/drafts` | Create a draft from partial slices; return its ID and status |
| `PUT /v1/isc/drafts/{draftId}` | Autosave draft content |
| `POST /v1/isc/{id}/edit-draft` | Find or create an edit draft for a saved card |
| `POST /v1/isc/drafts/{draftId}/publish` | Save a new card or merge an edit draft |
| `DELETE /v1/isc/drafts/{draftId}` | Discard a draft |
| `POST /v1/isc/create`, `PUT /v1/isc/{id}` | Retained legacy create/update routes |
| `DELETE /v1/isc/{id}` | Delete an owned card |

## Routes, autosave and recovery

[Route loaders](../src/pages/indicator-specification-cards/creator/isc-route-loaders.jsx)
establish the creator's intent before it reads the recovery session:

| Route | Purpose |
| --- | --- |
| `/isc` | My ISCs dashboard |
| `/isc/new` | Start a new draft; clear incompatible edit or legacy session state |
| `/isc/drafts/:draftId` | Load a backend draft by its route ID |
| `/isc/:id` | Saved-card preview |
| `/isc/:id/edit` | Obtain an edit draft and redirect to its draft route |

The creator writes a local `session_isc` recovery copy on state changes, and
debounces backend autosave by two seconds. A new backend draft is created when
autosave first runs. Saves within one mounted creator are serialized and pending
changes are coalesced. Failed saves retain the browser copy and display an error;
the recovery copy is specific to the browser tab and must not be treated as a
cross-device backup.

For edit drafts, guarded navigation offers Save changes, Keep this draft or
Discard changes. Save checks frontend readiness and writes the latest content
before publishing. Browser close/refresh uses the browser's generic leave prompt.
Legacy sessions and fallback edit routes remain supported; those sessions do not
receive backend draft autosave.

## Limits and verification

ISC drafts currently have no optimistic revision field. Edit-draft reuse is a
find-then-create operation, and edit publication saves the source and deletes the
draft in separate operations. Do not assume cross-tab conflict detection, unique
edit drafts under concurrent requests, or transactional publication. Frontend
readiness checks also do not establish equivalent strict backend publish
validation. These are limitations to consider before changing the lifecycle.

Name search and sorting use stored `indicatorName`. Legacy rows missing that
field can display a title parsed from requirements, but need it populated before
name search and ordering can behave consistently.

For a change, run the frontend tests and production build described in the
[project guide](../../README.md). Review all three paths, CSV/manual data entry,
chart selection and customization, refresh/resume, new/edit publish and discard,
failed autosave, and preview/edit of existing cards. Preserve the four-field
payload and step/path constants throughout.
