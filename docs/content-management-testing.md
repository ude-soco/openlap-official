# Content management: local setup and review

The feature branch is `feat/shoeb-homepage-content-management`. The pull request
must remain unmerged until manual review is complete.

## Setup

Use Java 11 and the editor's supported Node version. From the repository root:

```bash
cd openlap-analyticsframework
docker compose -f compose.yaml -f compose.dev.yaml up -d mongo

# Explicit, one-time import of the existing 7 news entries and 9 publications.
# Safe to repeat after completion; it will not overwrite subsequent edits.
./mvnw -q -DskipTests compile \
  org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
  -Dexec.mainClass=com.openlap.content.migration.ContentMigrationApplication

ALLOW_INSECURE_DEFAULTS=true \
PORT=8091 \
MONGODB_SECONDARY_URI=mongodb://127.0.0.1:27017/learninglocker_v2 \
./mvnw spring-boot:run
```

The migration targets `openlap_v2` by default. Set `OPENLAP_MONGODB_DB` explicitly
to test another database. Run it before enabling content editing or deploying
the API-driven homepage. Details and interrupted-run recovery are documented in
the [backend README](../openlap-analyticsframework/README.md#homepage-content-management).

Stop any previous backend instance in its original terminal before starting a
replacement on the same port. Otherwise Maven reports a startup failure because
the port is occupied.

In another terminal:

```bash
cd openlap-indicatoreditor
npm ci
VITE_BACKEND_URL=http://localhost:8091/api/ npm run dev
```

Open the displayed frontend URL, sign in as an administrator, and choose the
**Content Management** card on Home, or **Administration → Content Management**
in the sidebar. After switching feature branches, hard-refresh the browser if
it still displays the previous navigation. For a fresh local database, the seed
administrator is `admin@mail.com` / `1234qweR` when local defaults are enabled.

## Manual review

1. **Existing content:** check that news and publications load from the database.
   The homepage shows five news entries and six publications. Follow **View all**
   to find all 7 original news entries and 9 publications, including their links.
   News archives display the full text.
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
cd openlap-analyticsframework
./mvnw package
```

```bash
cd openlap-indicatoreditor
npm test
npm run build
```

The backend suite covers validation, role enforcement, snapshot isolation,
version conflicts, and migration retries. Frontend tests cover text/link edits,
validation, field-error mapping, and versioned request payloads.
