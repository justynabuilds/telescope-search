# Telescope Search

A site search that pulls out like a telescope. Closed, it is a short pearl field with "Search" and a key hint, stepping down through satin rings into a round eyepiece. Click it (or press `/` or ⌘K) and the long tube slides out first, then the two collar rings knock into place one after the other with a quiet click. Type, and the results slide down on one sheet from under the tube. Escape tucks the sheet back in, then the tubes slide home.

It ships as a plain web component that works on any site (Webflow embed, WordPress, Squarespace, Shopify, plain HTML) and as a React component. Both run on the same framework-free engine and render inside a shadow root, so the host site's CSS can't break them.

**[Live demo](https://telescopesearch.vercel.app)** · **[Playground](https://telescopesearch.vercel.app/playground)** (every option in a panel, with copyable HTML and React code)

## Quick start

Any site, including a Framer or Webflow embed. The pages to search are ordinary `<a>` tags, so they still make sense to search engines and without JavaScript:

```html
<script src="https://telescopesearch.vercel.app/telescope-search.iife.js"></script>
<telescope-search>
  <a href="/work" data-description="Selected projects">Work</a>
  <a href="/pricing" data-description="Three fixed packages" data-keywords="cost price rates">Pricing</a>
  <a href="/journal" data-description="Notes on design and building">Journal</a>
  <a href="/contact" data-description="Start a project">Contact</a>
</telescope-search>
```

`data-description` shows under the title and is searched too. `data-keywords` is searched but never shown. A `target` on a link is respected.

React:

```tsx
import { TelescopeSearch } from "@justbuilt/telescope-search/react"

<TelescopeSearch
  items={[
    { label: "Work", href: "/work", description: "Selected projects" },
    { label: "Pricing", href: "/pricing", keywords: "cost price" },
  ]}
  onSelect={(page) => router.push(page.href!)}  // return false to stop the browser navigating itself
/>
```

In an embed (Framer, Webflow), the search lives in its own frame: give the embed room to open (the open length plus about 24 px, by 380 px tall), add `target="_top"` to the links so they open the real page, and set a font (an embed can't inherit your site's). The [playground](https://telescopesearch.vercel.app/playground)'s HTML does all three.

To hide the links for the moment before the script runs, add `telescope-search:not(:defined){visibility:hidden}` to your CSS.

To host the script yourself, build it with `npm run build` (see [Development](#development)) and point the `src` at your copy; `telescope-search.js` is the ES module version.

## Attributes

| Attribute | Default | |
| --- | --- | --- |
| `label` | `Search` | Text on the closed field. The idle length fits it. |
| `placeholder` | `Search pages` | Placeholder once the field is pulled out. |
| `hint` | `/` | Key hint on the closed field. Empty hides it. |
| `shortcut` | on | `/` and ⌘K (Ctrl+K) open the first visible search on the page. `off` turns them off. |
| `side` | `left` | `left` pulls out to the left, for a field on the right of the nav. `right` mirrors it for a field on the left. |
| `length` | `420` | Open length in px. Shortens itself when the screen is too narrow. |
| `max-results` | `5` | Most results shown at once. |
| `count-text` | `{n} page\|{n} pages\|none` | The count on the field: one, many and none, split by `\|`. |
| `empty-text` | `No page matches “{q}”` | Shown when nothing matches. `{q}` is the query. |
| `empty-hint` | `Try a shorter word` | The line under it. |
| `sound` | on | A short click when a tube knocks against its stop. `off` mutes it. |
| `haptics` | on | A tiny vibration on phones when a tube knocks. `off` turns it off. |
| `open` | off | Reflects the state; set it to open the search. |

The element also has an `open` property (get and set) and a `toggle(force?)` method. React props use the same names in camelCase (`maxResults`, `countText`), with booleans for `shortcut`, `sound` and `haptics`.

Matching ignores case and accents, so "zrodla" finds "Źródła". Results are ranked: titles that start with the query, then titles with a word that starts with it, then titles that contain it, then descriptions and keywords.

## Events

| Event | `detail` | |
| --- | --- | --- |
| `select` | `{ index, label, href, description }` | A page was picked. Cancelable: call `preventDefault()` to stop navigation (for client-side routing). The search closes either way. |
| `toggle` | `{ open }` | The search opened or closed. |
| `search` | `{ query, results }` | The query changed. |

## Styling

Set these on the element or any parent. Every shade, rim and shadow is mixed from them, so any palette still reads as lit.

| Property | Default |
| --- | --- |
| `--ts-tube` | `#FFFFFF` (tubes, eyepiece and the results sheet) |
| `--ts-ring` | `#DFE1E6` (the satin rings at the joints) |
| `--ts-text` | `#141415` |
| `--ts-muted` | `#8E8E95` (placeholder, key hint, count, descriptions) |
| `--ts-shade` | `#3C3C50` (mixed into the tube colour for the cylinder shading) |
| `--ts-shadow` | `16 18 40` (RGB channels used for every shadow) |
| `--ts-focus` | `rgb(20 20 21 / .45)` (focus ring) |
| `--ts-font` | `inherit` |

For deeper styling use the parts `::part(field)`, `::part(eyepiece)`, `::part(collar)`, `::part(tube)`, `::part(input)`, `::part(hint)`, `::part(count)`, `::part(panel)`, `::part(list)` and `::part(row)`.

## Behaviour and accessibility

- The whole closed telescope is clickable. Hovering pulls the field out a little; pressing pushes it in a touch before the pull.
- Opening is a chain: the long tube moves first and takes each collar along once it is most of the way out. Every tube is driven into a hard stop, so it knocks, rebounds a little and clicks. Closing runs the chain the other way.
- The field is a combobox: ArrowUp and ArrowDown move the pick, Enter opens it, Escape closes it. Focus goes back where it came from: to the eyepiece if you opened it from there with the keyboard, otherwise to whatever had it before. A click outside or tabbing away also closes it.
- The result count is announced to screen readers as you type.
- Touch: no hover state; a tap opens it, with a tiny vibration on each knock.
- `prefers-reduced-motion`: the telescope opens and closes without motion, and the sheet appears without sliding.
- The frame loop only runs while something moves.

## How the code is organised

```
src/core/engine.ts                          the three tubes on springs with hard stops, the chain; no DOM, unit-tested
src/core/search.ts                          matching, ranking, accent folding and highlighting; no DOM, unit-tested
src/core/styles.ts                          shadow-root styles and the --ts-* hooks
src/element/telescope-search-element.ts     the <telescope-search> custom element
src/element/index.ts                        registers the element; the library entry point
src/react/TelescopeSearch.tsx               React adapter
index.html, demo/                           demo page, props playground, in-browser self-test
test/                                       unit tests (node --test)
vite.config.ts                              library build (dist/)
vite.site.config.ts, vercel.json            demo site build and hosting
```

The engine knows nothing about the page: it holds the tube positions and decides where each one goes. The element reads the links and attributes, measures the label to set the idle length, and every frame turns the engine's three numbers into tube widths, with the text, key hint and count riding on the long tube. The React adapter only maps props and events onto the element.

## Development

Requires Node 22.18 or newer (see `.nvmrc`) and npm.

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies. |
| `npm run dev` | Demo at http://localhost:4176, playground at `/demo/playground.html`, self-test at `/demo/selftest.html`. |
| `npm test` | Engine and search unit tests. |
| `npm run typecheck` | TypeScript check. |
| `npm run build` | `dist/telescope-search.js` (ESM), `dist/telescope-search.iife.js` (script tag) and `dist/types`. |
| `npm run build:site` | The demo site Vercel serves (`site-dist`): `/`, `/playground`, `/demo/selftest.html`, plus `/telescope-search.iife.js` and `/telescope-search.js` for embeds. |

Typecheck, tests and build also run on GitHub for every push. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to make a change and [CHANGELOG.md](CHANGELOG.md) for what changed.

## License

All rights reserved for now: the license hasn't been chosen yet. See [LICENSE.md](LICENSE.md).
