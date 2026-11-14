# Content management: local setup and review

This guide checks the admin editor, public homepage and content API together.
Use a local development database for these checks.

## Setup

Follow the [local installation guide](../README.md#local-installation) to select
and start MongoDB and prepare both frameworks. Keep the backend stopped while
running the optional import below. The startup guide selects an external Docker
volume explicitly; a bare `docker compose up` is not a replacement for that setup.

To review the original homepage content, run its explicit one-time import from
`analyticsframework`:

```bash
./mvnw -q -DskipTests compile \
  exec:java \
  -Dexec.mainClass=com.openlap.content.migration.ContentMigrationApplication
```

The migration targets `openlap_v2` by default. Set `MONGODB_PRIMARY_URI` and
`OPENLAP_MONGODB_DB` explicitly for another local database. Its completion marker
makes successful reruns idempotent; existing content is not overwritten. See the
[backend reference](backend-reference.md#homepage-content-management) for the
content schema, API, collision behavior and interrupted-import recovery.

Start the backend and frontend using the installation guide's matching ports and
API URL. For the examples' API port `8090`, the frontend uses
`VITE_BACKEND_URL=http://localhost:8090/api/`. Stop any previous backend in its
original terminal before starting a replacement on the same port.

Open the frontend, sign in as an administrator, and choose **Administration →
Content Management**. For a fresh local database with the development defaults,
the seed administrator is `admin@mail.com` / `1234qweR`.

## Manual review

1. **Existing content:** check that news and publications load from the database.
   The homepage shows five news entries and six publications. Follow **View all**
   to find all 7 original news entries and 9 publications, including their links.
   News archives display the full text.
   Use the icons beside **Title**, **News date/Year**, **Status**, and **Updated**
   to toggle ascending/descending sorting. Verify sorting is retained while
   searching, filtering, or changing pages; changing the sort returns to page one.
2. **Drafts:** add a news item with only a title and save it. It must remain absent
   from the homepage and public archive. Reopen it to verify persistence.
3. **Rich text and publishing:** type directly in the news editor. Use its toolbar
   for bold, italic, underline, bulleted/numbered lists, links, and undo/redo.
   Select words and choose **Insert or edit link** (or Ctrl/Command + K), or paste
   a web URL over selected text. The link must be visible inside the editable
   text. Click it to edit or remove the link. Applying formatting or a link must
   not save or publish the entry. Save and reopen the draft to verify formatting
   persists, then publish and verify the homepage card and full-text archive.
4. **Publications:** add authors, year, type, venue, and optional PDF/details URLs.
   Check that the preview and public card match. Empty optional URLs must not
   produce broken buttons. A reference URL need not end in `.pdf`.
5. **Published edits:** change a published entry and save its draft. The public
   version must stay unchanged until **Publish changes** is confirmed. Switch
   between draft and published previews to compare them.
6. **Recovery:** unpublish an entry, move an entry to trash, and restore it.
   Restoration must return it to Draft without publishing automatically.
7. **Conflicts:** open the same entry in two tabs, save one, then save the other.
   The second tab must preserve its input and explain the conflict, with options
   to reload or save a separate draft.
8. **Errors and unsaved work:** submit incomplete content and invalid links.
   Errors should identify fields and focus the first invalid control. Navigating
   away through app controls must offer a save/discard choice. After browser
   history navigation, revisit an entry to recover its unsaved working copy.
9. **Access and layout:** verify anonymous visitors can read published content
   and cannot access administration. Review the editor at mobile width, by
   keyboard, and in both themes. Status and errors must be understandable without
   relying on color.

The browser working copy is recovery storage for the current tab and account;
**Save draft** is the action that persists content to MongoDB.

## Automated checks

```bash
cd analyticsframework
./mvnw package
```

```bash
cd indicatorframework
npm test
npm run build
```

The backend suite covers validation, role enforcement, snapshot isolation,
version conflicts, and migration retries. Frontend tests cover text/link edits,
validation, field-error mapping, and versioned request payloads.
