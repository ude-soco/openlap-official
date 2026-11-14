# OpenLAP Landing Page

The public marketing/landing page served at `/` for anonymous visitors. It is
scoped with its own MUI theme. News and publications load from the backend;
other sections use bundled data modules.

For local installation, see the [project setup guide](../README.md). The landing
page lives under `indicatorframework/src/pages/landing-page/`. Short module paths
below are relative to that directory; full source paths start with
`indicatorframework/`.

> Manage news and publications through **Administration → Content Management**.
> Database content changes appear without rebuilding the frontend.

---

## Folder structure

```
indicatorframework/src/pages/landing-page/
├─ landing-page.jsx          # Composition: wraps sections in the scoped ThemeProvider
├─ content-archive.jsx       # Public paginated /news and /publications pages
├─ utils/                    # Anonymous API client, loading hook, link/date helpers
├─ components/               # Presentation and section data loading
│  ├─ app-appbar.jsx         # Frosted floating nav bar (scroll-aware)
│  ├─ hero.jsx               # Headline, CTAs, trust strip, product screenshot
│  ├─ architecture.jsx       # Diagram + 3 icon feature points
│  ├─ logo-collection.jsx    # "Built with" technology strip
│  ├─ features/
│  │  ├─ features.jsx        # Heading + two-tool overview cards + maps feature rows
│  │  └─ feature-row.jsx     # One alternating image/text feature row
│  ├─ teams.jsx              # Lead profile cards + people avatar grid
│  ├─ news.jsx               # Featured card + news card grid
│  ├─ publications.jsx       # Dark band of publication cards
│  ├─ contact-us.jsx         # Two-column: invitation + EmailJS form card
│  ├─ footer.jsx             # Multi-column footer
│  └─ shared/                # Reusable, landing-only building blocks
│     ├─ content-cards.jsx   # Shared homepage cards and admin previews
│     ├─ content-state.jsx   # Loading, empty, and retry states
│     ├─ section.jsx         # Standard section container + vertical rhythm
│     ├─ section-heading.jsx # h2 title + optional subtitle
│     ├─ zoomable-image-card.jsx # Framed image that opens a full-size dialog
│     ├─ more-link.jsx       # "More …" external link with hover arrow
│     ├─ profile-avatar.jsx  # Avatar with keyboard-accessible "view profile" overlay
│     ├─ motion.js           # fadeUp/fadeDown keyframes + entrance() sx helper
│     └─ reveal.jsx          # <Reveal>: scroll-into-view fade-up wrapper
└─ data/                     # Bundled non-CMS sections
   ├─ team-data.js
   ├─ features-data.js
   ├─ logo-data.js
   └─ navigation-data.js
```

**Cross-app shared utilities live in `indicatorframework/src/common/`:**

- `indicatorframework/src/common/utils/scroll-to-section.js` — smooth in-page scrolling (reduced-motion aware; optional arrival highlight).
- `indicatorframework/src/common/components/toggle-color-mode/` — the light/dark toggle (also used by login/register/privacy).

---

## Architecture overview

- **`landing-page.jsx`** composes the sections top-to-bottom and wraps them in a
  nested `ThemeProvider` using `createScopedTheme(baseTheme)` (shared design system in `indicatorframework/src/common/theme/scoped-theme.js`).
- **Sections** (`components/*.jsx`) render shared building blocks. News and
  publications load independent public API requests so one failed section does
  not hide the other or trigger authentication redirects.
- **Shared building blocks** (`components/shared/`) keep the sections consistent
  (`Section`, `SectionHeading`, `ZoomableImageCard`, `MoreLink`, `ProfileAvatar`).
- **Content** comes from MongoDB for news/publications. The remaining bundled
  `.js` modules reference assets or navigation for team, features, and logos.

---

## Where content lives & how to edit it

### Manage news and publications

Sign in as an administrator and open **Administration → Content Management**.
Choose **News** or **Publications**, then add or edit an entry. The editor uses
persistent labels, field validation, a homepage card preview, and separate
**Save draft** / **Publish** actions. News uses a rich text editor with bold,
italic, underline, lists, inline links, and undo/redo. The homepage renders the
same formatting. Publications have standard fields and optional web links.

News bodies accept a small structured document schema; arbitrary HTML is never
stored or injected. Existing text/link arrays remain readable and editable,
and opening them does not change the draft. Rich text editor code is loaded
only in administration, not by public homepage visitors.

Saving draft changes to a published entry leaves the public version intact.
Choose **Publish changes** when ready. Unpublish hides the entry; trash is
recoverable, and restoring returns an entry to Draft for explicit republishing.

The homepage shows the latest five news entries and six publications. The public
`/news` and `/publications` archives provide paginated access to older entries;
news text is displayed in full there. Both collections are read through
`GET /api/v1/content/{news|publications}` and contain only published snapshots.
The anonymous client never attaches access tokens or triggers login refresh.

Existing installations can import the original entries with an explicit one-time
backend migration. See the [backend content migration instructions](backend-reference.md#homepage-content-management).
The immutable migration fixtures are historical input, not runtime fallback
content. The frontend JSON content files and imports have been removed.

### Add a Team member — `data/team-data.js`

Edit `indicatorframework/src/pages/landing-page/data/team-data.js`:

1. Drop the photo in `indicatorframework/src/assets/team/` (square, ~256px is plenty — see [image conventions](#conventions)).
2. `import Photo from "../../../assets/team/photo.jpg";` at the top.
3. Add an entry to `memberItems` (3 prominent leads) **or** `peopleItems` (the wider team):
```js
{
  id: "first-last",
  name: "First Last",
  title: "Role",                 // optional for peopleItems
  link: "https://…/profile",
  image: Photo,
  social: [                      // optional, leads only
    { id: "first-last-linkedin", name: "LinkedIn", type: "linkedin", link: "https://…" },
  ],
}
```
`social.type` ∈ `linkedin` | `scholar` | `github` (mapped to an icon in `teams.jsx`).

### Add a Feature — `data/features-data.js`

The section shows two complementary tools (Design → Implement). In
`indicatorframework/src/pages/landing-page/data/features-data.js`, import its image
and button icon at the top and add an entry to `featureItems`:
```js
{
  id: "isc-creator",            // also the in-page anchor (#isc-creator)
  step: "Design",               // eyebrow label
  title: "…",
  description: "…",
  image: Img,
  imageAlt: "…",
  dialogLabel: "…",             // aria-label for the zoom dialog
  buttonLabel: "…",
  buttonIcon: SomeMuiIcon,
  to: "/login",                 // CTA navigation target
  imageSide: "left",            // layout: image on left/right (alternates)
  imageWidth: "55%",            // layout: md image column width
  pb: { xs: 2, md: 10 },        // layout: bottom spacing
}
```
Content fields are first; the last few are layout hints consumed by `feature-row.jsx`.

### Edit navigation / logos

Both modules are under `indicatorframework/src/pages/landing-page/data/`:

- **Navigation** — `navigation-data.js`: `navigationIds` (section ids/anchors),
  `navigationItems` (nav menu), `socialItems` (footer social icons).
- **Logos** — `logo-data.js`: `{ id, name, imageLight, imageDark }` (import the SVGs).

---

## How animations work

CSS/MUI only — **no animation library**, and everything respects
`prefers-reduced-motion`.

- **On-mount entrance** (Hero, AppBar): `entrance(fadeUp|fadeDown)` from
  `shared/motion.js` returns an `sx` fragment with a keyframe animation.
- **Scroll reveals** (most sections): wrap content in `<Reveal>` (`shared/reveal.jsx`).
  It uses an `IntersectionObserver` to fade content up the first time it enters
  the viewport (one-shot). Reduced-motion users see the final state immediately.
- **Arrival highlight**: clicking a Hero link / feature overview card calls
  `scrollToSection(id, { highlight: true })`, which briefly applies the
  `.section-arrival-highlight` class (keyframes in `indicatorframework/src/styles.css`).

Motion timings/easings live in the theme at `theme.custom.motion`.

---

## How the scoped theme works

`landing-page.jsx` wraps the page in a nested `ThemeProvider`:
```jsx
const { theme } = useContext(CustomThemeContext);          // app base (light/dark)
const landingTheme = useMemo(() => createScopedTheme(theme), [theme]);
return <ThemeProvider theme={landingTheme}>…</ThemeProvider>;
```
`createScopedTheme(baseTheme)` (in `indicatorframework/src/common/theme/scoped-theme.js`, shared
with the login/register/privacy pages) **layers** the
design system on top of the app's base theme: Inter typography scale,
border radii, soft shadows, motion tokens, the accent color, AppBar tokens, and
MUI component overrides (Button/Card/Input/Dialog/Link/Chip). Because it's a
nested provider, **the authenticated app keeps its own default theme.**

Reusable design tokens are under `theme.custom`:
- `theme.custom.colors.accent` — mode-aware accent (eyebrows, icon badges).
- `theme.custom.radii` — `button | card | input | dialog | image | pill`.
- `theme.custom.shadows` — `sm | card | cardHover | md | lg`.
- `theme.custom.motion` — `duration.{fast,hover,normal,slow,dialog}` + `easing.*`.
- `theme.custom.appBar` — `height | blur | bgOpacity | borderColor | shadow`.
- `theme.custom.layout` — section/grid spacing tokens.

Prefer these tokens over hard-coded values when editing components.

---

## Conventions

- **Files & folders**: kebab-case. Components use PascalCase default exports.
- **Data files**: `<entity>-data.{json,js}`; JSON when no imports are needed.
- **Headings**: one `<h1>` (Hero); section titles are `<h2>` via `SectionHeading`;
  card/item titles are `<h3>`. Don't introduce extra `<h1>`s or skip levels.
- **Accessibility**: no clickable `<div>`s — use `Button`/`Link`/`CardActionArea`/
  anchors; external links use `rel="noopener noreferrer"`; keep `alt`/`aria-label`s.
- **Images**: keep source assets near their display size (avatars ~256px, hero
  ~2×); below-the-fold images use `loading="lazy"`.

---

## Verify changes

After completing the [local setup](../README.md), run from the repository root:

```bash
cd indicatorframework
npm test         # frontend unit tests
npm run build    # production build
```

For an interactive preview, start the frontend with the backend URL described in
the project setup guide.

`npm run lint` is also available for diagnostics. The repository has existing
lint violations, so a clean lint run is not currently the baseline.
