# Plan: Unauthenticated landing site for "Build Your Own Internet"

## Context

The repo is a hands-on tutorial teaching how the internet works. The educational
prose lives in `chapters/*/README.md` (10 chapters) plus supporting docs
(`chapters/glossary.md`, `chapters/command-reference-guide.md`, `appendix/*.md`).
Today this content is only readable on GitHub. We want a public, unauthenticated
website that renders this markdown in a two-pane reading layout: a Table of
Contents on the left and the fully-rendered chapter on the right, with a header
bar carrying a (visual-only) "Log in / Create account" control — per the supplied
mockup.

The markdown is non-trivial: reference-style links, nested image-links
(`[![alt][ref]][ref]`), relative asset paths (`../../img/*.svg|png`), cross-`.md`
links with `#anchors`, raw `<details>/<summary>` HTML, fenced code blocks, and
native unicode emoji. All of this must render correctly.

### Decisions locked in with the user
- **Tooling:** Astro, package-managed and run with **bun**. **shadcn dropped**
  (it requires React+Tailwind, which fights the structural-CSS approach and buys
  nothing for a static reading page).
- **Components:** authored as **pure `.astro`** following the **lasertag** CSS
  convention (sibling `.module.css`, single `.class` root, kebab-case custom-element
  roots, no `<div>`). lasertag's JSX intrinsic types / ESLint plugin do not apply to
  `.astro`, but the structural convention does.
- **lasertag scope:** governs only the component *shells we author*. The
  markdown→HTML output is plain semantic HTML styled by a separate content
  stylesheet — there is **no conflict** between lasertag and the rendered content,
  and if any ever arose we drop lasertag for that surface.
- **Content scope:** render chapters **and** the supporting docs (glossary,
  command-reference, appendix) as real routes so cross-links and `#anchors` resolve.
- **Login control:** non-functional visual placeholder for now.

## Source of truth & freshness (important)

**The markdown files are the single source of truth — guaranteed structurally.**
The site reads the `.md` files *in place* from `chapters/` and `appendix/` via
Astro's content-collection `glob()` loader. We never copy, fork, or transform the
prose into `web/`. There is exactly one copy of every chapter — the one already in
the repo — so the site cannot drift from it.

Freshness behaves differently per mode, and we make both explicit:

- **Dev (`bun run dev`):** Astro hot-reloads on content change. Because the markdown
  lives *outside* the `web/` project root (`../chapters`, `../appendix`), Vite's
  watcher may not watch it by default. We address this with
  `vite: { server: { fs: { allow: [".."] }, watch: { ignored: [] } } }` plus
  explicit `additionalWatchPaths` if needed, and we **verify empirically** that
  editing a chapter triggers reload (see Verification step 5).
- **Production (`bun run build`):** a static build is a snapshot at build time — it
  is only as fresh as the last build. Making prod "always reflect the markdown" is a
  **deploy-pipeline** responsibility, so we add a CI stub (see §7) that rebuilds on
  any push touching `chapters/**`, `appendix/**`, or `img/**`.

The only files we copy are images (`img/` → `public/content-assets/img/`), re-synced
on every `predev`/`prebuild` so they can't go stale either.

## Approach

Create a new `web/` Astro project at the repo root. Source the markdown in place
from the existing repo dirs via Astro **content collections** (`glob()` loader can
read from anywhere on the filesystem). Fix up in-content relative links/images at
build time with a small **rehype plugin** so they resolve to site routes / served
assets. Render into a static two-pane layout.

### 1. Project scaffold (`web/`)
- Astro (minimal/empty template), TypeScript strict, installed/run via **bun**.
- `web/package.json` scripts use bun; add `lasertag` as a dev dep for the
  `types/module.css.d.ts` (constrains `.module.css` default export to `{ class }`)
  and reference it in `web/src/env.d.ts` / tsconfig `types`.
- No React/Tailwind/shadcn. Astro ships its own Shiki code highlighting and
  GitHub-Flavored-Markdown support.
- `.gitignore`: add `web/node_modules`, `web/dist`, `web/.astro`,
  `web/public/content-assets` (generated).

### 2. Content collections (`web/src/content.config.ts`)
Define collections with the glob loader pointing **outside** `src`:
- `chapters`  → `{ base: "../chapters", pattern: "*/README.md" }`
- `appendix`  → `{ base: "../appendix", pattern: "*.md" }`
- `refs`      → `{ base: "../chapters", pattern: "{glossary,command-reference-guide}.md" }`

Slugs come from the directory name (`1.1-routing-getting-started`, etc.), which
already sort correctly.

**TOC metadata via frontmatter (single source of truth).** Several chapter `<h1>`s
are duplicated/generic ("Name Resolution" appears 3×; "Getting Started" twice), so
the `<h1>` can't serve as a unique TOC label, and ordering/section grouping only
live implicitly in the dir-name numbering. Rather than a separate, drift-prone
manifest, we add a small YAML frontmatter block to the top of each chapter README:

```yaml
---
title: "Smol Internet"
section: "Routing"
order: 1.2
---
```

The `chapters` collection schema validates `{ title, section, order }`. The TOC
reads these, sorts by `order`, and groups by `section`. Co-located with the prose,
idiomatic Astro, no second source of truth. (Appendix/refs need no frontmatter —
their nav entries are derived from filenames.)

### 3. Markdown rendering config (`web/astro.config.mjs`)
- Enable raw HTML passthrough (Astro renders HTML in markdown by default — covers
  `<details>/<summary>`). GFM and Shiki are built-in; keep them.
- Register a custom **rehype plugin** `web/src/lib/rehype-rewrite-links.ts` (see §3a).

#### 3a. Why a rehype plugin (and what it does)
Markdown rendering is a pipeline: `text → remark (Markdown AST) → rehype (HTML AST
"hast") → HTML`. A rehype plugin is the **standard, Astro-supported hook**
(`markdown.rehypePlugins`) that walks the HTML AST and edits nodes before
serialization. We chose it over the two alternatives deliberately:

- **vs. regex string replacement:** a blind find/replace on raw markdown would also
  rewrite `../../` *inside fenced code blocks* — and these chapters are full of
  shell/`ip`/`tcpdump` samples. The rehype plugin only touches real `<a>`/`<img>`
  element nodes, so it structurally cannot corrupt a code sample or prose.
- **vs. a remark plugin:** remark runs earlier on the Markdown AST, before
  reference-style links (`[ping][ref ping]`) and nested image-links
  (`[![alt][ref]][ref]`) are resolved to concrete `href`/`src`. At the rehype stage
  every link is already a clean, normalized URL, so we inspect one value per link
  regardless of how it was authored — no need to reimplement reference resolution.

<!--COMMENT
Question about the nature of this pipeline. Is there anything about how our markdown was authored that REQUIRES this pipeline approach, or is this simply the standard way to go about converting markdown to HTML? What benefits do we get from this approach? what kinds of things are possible doing this that wouldn't be possible without it?
-->

The plugin rewrites, per node:
  - **images** `../../img/X` → `/content-assets/img/X`
  - **appendix links** `../../appendix/foo.md#anchor` → `/appendix/foo#anchor`
  - **glossary** `.../glossary.md#anchor` → `/glossary#anchor`
  - **command-reference** `.../command-reference-guide.md#anchor` → `/reference#anchor`
  - **cross-chapter** `../<slug>/README.md#anchor` → `/chapters/<slug>#anchor`
  - external `http(s)` links: leave as-is, add `target=_blank rel=noopener`.
This is the single source of truth for link fixups.

### 4. Static assets
The READMEs reference `../../img/*`. Add a bun **prebuild/predev script**
`web/scripts/sync-assets.ts` that copies the repo `img/` tree into
`web/public/content-assets/img/` (wired as `predev` and `prebuild` in
`web/package.json`). Matches the `/content-assets/img/...` paths produced by the
rehype plugin. (Copy rather than symlink so `astro build` bundles them reliably.)

<!-- COMMENT WE STOPPED HERE -->

### 5. Routes & components (lasertag `.astro`)
Components, each with a sibling `.module.css` whose single top-level selector is
`<tag>.class`:
- `web/src/layouts/SiteLayout.astro` (+ `.module.css`) — root `<site-layout>`,
  renders `<app-header-bar>` + two-column `<main>` with `<toc-pane>` and
  `<content-pane>` slots.
- `web/src/components/AppHeaderBar.astro` — `<app-header-bar>` with brand on the
  left and the placeholder `<button>Log in / Create account</button>` on the right.
- `web/src/components/TableOfContents.astro` — `<table-of-contents>` rendering a
  `<nav><ol>` grouped by section (from chapter frontmatter, sorted by `order`),
  marking the active item.
- `web/src/components/ChapterContent.astro` — `<chapter-content>` wrapper that
  renders `<Content />` from the collection entry; its `.module.css` styles the
  generated markup (headings, code, tables, `details`, images, blockquotes).
- Routes:
  - `web/src/pages/index.astro` → redirect to the first chapter (`000-getting-started`).
  - `web/src/pages/chapters/[slug].astro` → `getStaticPaths` over `chapters`.
  - `web/src/pages/appendix/[slug].astro` → over `appendix`.
  - `web/src/pages/glossary.astro` and `web/src/pages/reference.astro` → the two refs.
  All routes use `SiteLayout` so the TOC + header are consistent everywhere.
- A global stylesheet `web/src/styles/globals.css` (based on lasertag's
  `templates/globals.css`) for resets, custom-element `display:block` defaults, and
  CSS variables (colors, spacing, max content width).

### 6. Content styling
`ChapterContent.module.css` is the one place that styles rendered-markdown output
(`.class > h1`, `> pre`, `> table`, `> details`, `> img { max-width:100% }`, etc.).
Keeping it separate from the structural component CSS is exactly the lasertag/markdown
boundary the user called out.

### 7. Production rebuild trigger (CI stub)
Add `.github/workflows/build-site.yml` (stub) that runs on push to `main` when
`chapters/**`, `appendix/**`, `img/**`, or `web/**` change: `bun install` →
`bun run build` (and a deploy step left as a TODO comment, since hosting isn't
chosen yet). This is what makes the prod freshness guarantee real — without it, a
static build only reflects the markdown as of the last manual build.

## Critical files
- `web/astro.config.mjs` — markdown + rehype wiring, Vite watch config for `..`
- `web/src/content.config.ts` — collections + frontmatter schema from `../chapters`, `../appendix`
- `chapters/*/README.md` — add `{ title, section, order }` frontmatter to each
- `web/src/lib/rehype-rewrite-links.ts` — link/image rewriting (the key risk area)
- `web/scripts/sync-assets.ts` — copy `img/` → `public/content-assets/img/`
- `web/src/layouts/SiteLayout.astro`, `web/src/components/*.astro` (+ `.module.css`)
- `web/src/pages/{index,chapters/[slug],appendix/[slug],glossary,reference}.astro`
- `.github/workflows/build-site.yml` — prod rebuild stub

## Verification
1. `cd web && bun install`
2. `bun run dev` → open the served URL.
3. Confirm, on `1.1-routing-getting-started` and `2.2-name-resolution-2-...`:
   - TOC lists all chapters grouped by section; clicking navigates; active item marked.
   - Images render (network-map SVGs, `terminal.png`).
   - `<details>/<summary>` blocks expand; code blocks are highlighted; emoji render.
   - Glossary/command-reference/appendix/cross-chapter links navigate on-site and
     `#anchors` jump to the right heading.
   - Header shows the placeholder login button (non-functional).
4. `bun run build && bun run preview` → confirm the static build renders identically
   and bundled images resolve under `/content-assets/img/...`.
5. **Dev-watch check (explicit):** with `bun run dev` running, edit a heading/line in
   a `chapters/*/README.md`, save, and confirm the browser hot-reloads without a
   manual refresh. If it does not, add the markdown dirs to Vite's watch config and
   re-verify; document the final config in `astro.config.mjs`.

## Out of scope (later passes)
- Real authentication / accounts behind the login button.
- Rendering the hands-on infra (Dockerfiles, compose, scripts).
- Search, dark mode, mobile-nav polish.
- Choosing/wiring the actual prod host + deploy step in the CI workflow.
