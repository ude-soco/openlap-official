# OpenLAP Landing Page

The public marketing/landing page served at `/` for anonymous visitors. It is
self-contained and **does not affect the authenticated app** — it applies its
own scoped MUI theme and only reads from its own `data/` folder.

> Maintainers' rule of thumb: **content lives in `data/`, presentation lives in
> `components/`.** Researchers should only ever need to touch `data/`.

---

## Folder structure

```
src/pages/landing-page/
├─ landing-page.jsx          # Composition: wraps sections in the scoped ThemeProvider
├─ components/               # Presentation only (no content literals beyond labels)
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
│     ├─ section.jsx         # Standard section container + vertical rhythm
│     ├─ section-heading.jsx # h2 title + optional subtitle
│     ├─ zoomable-image-card.jsx # Framed image that opens a full-size dialog
│     ├─ more-link.jsx       # "More …" external link with hover arrow
│     ├─ profile-avatar.jsx  # Avatar with keyboard-accessible "view profile" overlay
│     ├─ motion.js           # fadeUp/fadeDown keyframes + entrance() sx helper
│     └─ reveal.jsx          # <Reveal>: scroll-into-view fade-up wrapper
└─ data/                     # ← EDIT CONTENT HERE
   ├─ news-data.json
   ├─ publication-data.json
   ├─ team-data.js
   ├─ features-data.js
   ├─ logo-data.js
   └─ navigation-data.js
```

**Cross-app shared utilities live in `src/common/`, not here:**
- `src/common/utils/scroll-to-section.js` — smooth in-page scrolling (reduced-motion aware; optional arrival highlight).
- `src/common/components/toggle-color-mode/` — the light/dark toggle (also used by login/register/privacy).

---

## Architecture overview

- **`landing-page.jsx`** composes the sections top-to-bottom and wraps them in a
  nested `ThemeProvider` using `createScopedTheme(baseTheme)` (shared design system in `src/common/theme/scoped-theme.js`).
- **Sections** (`components/*.jsx`) are presentation only. They import their
  content from `data/` and render it with shared building blocks.
- **Shared building blocks** (`components/shared/`) keep the sections consistent
  (`Section`, `SectionHeading`, `ZoomableImageCard`, `MoreLink`, `ProfileAvatar`).
- **Content** (`data/`) is plain structured data. Pure-data content is JSON
  (`news`, `publications`); content that must reference bundled images or icons
  is a small `.js` module (`team`, `features`, `logos`, `navigation`).

---

## Where content lives & how to edit it

### Add a News item — `data/news-data.json`
Append an object (newest items sort to the top automatically by `date`):
```json
{
  "slug": "2026-09-some-event",
  "date": "2026-09-01",
  "title": "OpenLAP @ Some Event",
  "body": [
    "Plain sentence, then a link to ",
    { "text": "the paper", "href": "https://example.org/paper" },
    " and more text."
  ]
}
```
- `slug` — unique, human-readable id (also the React key).
- `date` — ISO `YYYY-MM-DD` (controls ordering; shown as e.g. "September 2026").
- `body` — an array of parts: a **string**, or a **link** `{ "text", "href" }`.
  Links open in a new tab. No React/JSX needed. In the cards the body is clamped
  to a few lines; full text lives on the linked "More News" page.

### Add a Publication — `data/publication-data.json`
```json
{
  "id": "author-2026-venue-topic",
  "year": "2026",
  "type": "Conference",
  "authors": "First Author and Second Author",
  "title": "Paper Title",
  "venue": "In Proceedings of …",
  "pdfLink": "https://…/paper.pdf",
  "details": "https://…/venue"
}
```
`type` is shown as a small chip (e.g. `Journal`, `Conference`, `Workshop`, `Book chapter`).

### Add a Team member — `data/team-data.js`
1. Drop the photo in `src/assets/team/` (square, ~256px is plenty — see "Images").
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
The section shows two complementary tools (Design → Implement). To add/edit one,
import its image + button icon at the top and add an entry to `featureItems`:
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
- **Navigation** — `data/navigation-data.js`: `navigationIds` (section ids/anchors),
  `navigationItems` (nav menu), `socialItems` (footer social icons).
- **Logos** — `data/logo-data.js`: `{ id, name, imageLight, imageDark }` (import the SVGs).

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
  `.section-arrival-highlight` class (keyframes in `src/styles.css`).

Motion timings/easings live in the theme at `theme.custom.motion`.

---

## How the scoped theme works

`landing-page.jsx` wraps the page in a nested `ThemeProvider`:
```jsx
const { theme } = useContext(CustomThemeContext);          // app base (light/dark)
const landingTheme = useMemo(() => createScopedTheme(theme), [theme]);
return <ThemeProvider theme={landingTheme}>…</ThemeProvider>;
```
`createScopedTheme(baseTheme)` (in `src/common/theme/scoped-theme.js`, shared
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

```bash
npm run lint     # eslint
npm run build    # production build
npm run dev      # local preview at http://localhost:5173
```
