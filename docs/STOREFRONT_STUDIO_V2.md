# Azaman Storefront Studio V2 — Editor Architecture

## Purpose

Azaman Business Portal should evolve from a widget/grid editor into a genuine visual Storefront Studio. Businesses should be able to design the customer-facing store experience visually, preview it against the real marketplace renderer, and publish a validated immutable snapshot.

The inspiration is the editor mechanics in `lnkiai/m3e-canvas`, not its prompt-generation goal. `m3e-canvas` demonstrates a useful composition model: a palette of parts, a central phone/canvas stage, selectable layers, multi-selection and grouping, snapping/alignment, an inspector, theme tokens, undo/redo, screen-level navigation and a serializable document. Azaman should adopt those mechanics while replacing generic Material components and prompt output with commerce-aware storefront components and executable customer actions.

`m3e-canvas` is MIT licensed, so code reuse is legally possible subject to its license notice. The preferred Azaman strategy is still to reproduce the useful interaction patterns and build an Azaman-native model rather than copy a large unrelated implementation wholesale.

## What exists today

The Business Portal already has an unusually strong foundation:

- Draft/published storefront layouts with optimistic concurrency and version history.
- A 4-column 2D canvas with tile move/resize interactions.
- Widget palette, tile configuration, theme selection, phone preview, templates, Nitro eligibility, analytics, QR/live view, undo/redo, autosave and conflict recovery.
- A published render service that combines business profile data, theme tokens, layout tiles and the category-native Experience Blueprint.
- Experience Blueprint support for category-specific customer journeys.
- Public rendering and caching separate from editor state.

The current editor therefore should **not** be thrown away. It should become the migration base for Studio V2.

## Important gap found during audit

`StorefrontCanvas.jsx` currently sends a whole tile object to the `onUpdateTile` callback while `useStorefront.updateTile()` treats its second argument as a props patch. That creates a contract mismatch: drag/resize operations can place tile-level fields inside `tile.props` instead of changing `tile.position`.

Studio V2 must formalize mutation boundaries so content, presentation, layout and actions are distinct patch domains. Pointer-move operations should also be coalesced into a single history transaction and autosave event on pointer-up rather than treated as hundreds of independent edits.

## Lessons worth taking from m3e-canvas

### 1. Palette -> semantic component library

m3e-canvas provides searchable, categorized parts and drag initiation from the palette. Azaman should keep this interaction but expose commerce components rather than generic M3 pieces.

Suggested categories:

- Navigation: store header, back/navigation bar, category tabs, search, cart shortcut.
- Commerce: product grid, product carousel, featured product, category rail, offer card, bundle card, buy/add-to-cart CTA.
- Brand: hero, logo, rich text, image, video, announcement, social proof.
- Trust: rating, review carousel, verified badge, business facts, location/hours/contact.
- Conversion: primary CTA, secondary CTA, floating action, coupon/promo, loyalty/follow CTA.
- Layout: section, row, column, spacer, divider, grid, stack.
- Advanced: reusable group, conditional section, dynamic collection, embed only when explicitly supported by a safe allowlist.

Search and favorites should remain first-class. Premium/Nitro components should be marked in the palette without allowing the editor to construct an invalid publishable document.

### 2. Inspector -> four-domain property editor

A selected component should expose a predictable inspector with these tabs:

**Content** — text, media, product/category source, labels, item count, ordering, visibility of sub-elements.

**Style** — variant, fill, border, radius, typography, icon, icon placement, alignment, elevation, spacing, hover/pressed/focus states.

**Layout** — width/height, min/max, alignment, gap, padding/margin, stacking, grid span, position, responsive overrides, z-order.

**Action** — safe declarative action target, analytics event, confirmation/loading behavior and accessibility label.

This is where Azaman can go materially deeper than the reference editor. For a button, for example, the business should be able to change label, icon, icon position, size, variant, radius, fill, border, typography, width, alignment, spacing, loading style, disabled presentation and the action itself without authoring code.

### 3. Layers -> real document structure

The layer panel in m3e-canvas is valuable because it converts a visual composition into an understandable hierarchy. Azaman should go beyond a flat tile list.

Recommended tree:

`Page > Section > Stack/Grid > Component > nested Component`

Every node should have a stable ID. The layer tree should support selection, multi-select, visibility, lock, duplicate, delete, group/ungroup, z-order and drag re-parenting where the target container allows it.

### 4. Groups -> containers with intent

m3e-canvas distinguishes connected runs from free groups. Azaman should translate this into explicit layout containers rather than opaque grouping.

Use semantic containers such as `section`, `stack`, `row`, `column`, `grid`, `carousel`, and `overlay`. A container defines how children behave, which makes responsive rendering deterministic and avoids storing accidental pixel relationships.

### 5. Snapping, alignment and tidy

Keep magnetic snapping/alignment guides and add:

- consistent spacing guides;
- equal-size guides;
- parent/container bounds;
- safe-area guides for phone rendering;
- smart distribution;
- one-click tidy/normalize;
- keyboard nudging with coarse/fine increments.

For commerce screens, snapping should be subordinate to container constraints. Freeform absolute positioning is appropriate for controlled overlays, not as the default layout mode.

### 6. Theme tokens

m3e-canvas uses a theme/palette token system rather than forcing every object to own a raw color. Azaman should do the same.

Global tokens should include:

- brand primary/secondary/accent;
- surface/background/elevated surface;
- text/secondary text/muted text;
- success/warning/error;
- typography scale and weights;
- button defaults;
- corner-radius scale;
- spacing scale;
- elevation/shadow presets;
- motion presets and reduced-motion policy.

Raw arbitrary CSS should not be the persistence format. Tokens keep storefronts coherent and make theme changes cheap.

### 7. Navigation graph -> customer action graph

m3e-canvas stores screen-to-screen actions and transitions. Azaman should turn that into a safe commerce action system.

Examples:

- `openProduct(productId)`
- `openCategory(categoryId)`
- `addToCart(productId, configuration)`
- `openCart()`
- `checkout()`
- `openStoreReviews()`
- `openStoreLocation()`
- `callBusiness()`
- `openExternalUrl(url)` (allowlisted/validated)
- `navigatePage(pageId)`
- `scrollTo(nodeId)`
- `followStore()`

Actions should be serializable intents, not arbitrary JavaScript. The main application remains authoritative for money movement, product availability, inventory and checkout logic.

## Proposed document model

The existing `layoutJson.tiles` model is an effective compatibility format, but it is too flat for a full visual editor. Introduce a versioned `experience` document inside the existing layout snapshot while retaining tile support during migration.

```json
{
  "schemaVersion": 2,
  "pages": [
    {
      "id": "home",
      "name": "Home",
      "slug": "/",
      "root": ["section-1", "section-2"]
    }
  ],
  "nodes": {
    "section-1": {
      "id": "section-1",
      "type": "section",
      "children": ["hero-1", "featured-1"],
      "layout": { "mode": "stack", "direction": "column", "gap": 16 }
    },
    "hero-1": {
      "id": "hero-1",
      "type": "hero",
      "props": { "title": "Welcome" },
      "style": { "variant": "brand" },
      "actions": {}
    }
  },
  "theme": {
    "tokens": {}
  },
  "navigation": {},
  "assets": []
}
```

A node should be constrained to a schema roughly equivalent to:

```text
id
 type
 props
 style
 layout
 responsive
 actions
 visibility
 locked
 dataBinding
 children
 metadata
```

`dataBinding` is particularly important. A product grid should describe *which* business collection to render rather than copy product data into the design document. This keeps product/catalog data authoritative outside the visual editor.

## Responsive strategy

The canvas can be phone-first, but the document should not become a desktop-only pile of coordinates.

Store layout intent first, then allow breakpoint overrides for a small set of meaningful properties:

- column count;
- direction;
- alignment;
- gap;
- padding;
- visibility;
- text scale;
- component width mode;
- carousel behavior.

Prefer fluid/container rules over absolute coordinates. Absolute coordinates remain available for bounded overlay components.

## Editor/runtime separation

The highest-value architectural change is to share the renderer.

There should be one `StorefrontRenderer` implementation used by:

1. Business Portal edit stage.
2. Business Portal phone preview.
3. Main Azaman public/customer storefront.

The editor should add a thin interaction overlay around the renderer for selection, handles, drop zones and guides. It should **not** maintain a separate visual approximation of the storefront.

This eliminates the current risk where the editor can look correct while the customer-facing screen renders differently.

## Draft, publish and history rules

The existing server-side draft/publish boundary should remain authoritative.

Editor behavior:

- Local mutations are immediate.
- Undo/redo operates on document snapshots in memory.
- Pointer interactions are transaction-coalesced.
- Autosave debounces stable document revisions.
- Server writes include an expected revision/timestamp.
- A conflict never silently overwrites another editor.
- Publish validates the entire normalized document and Nitro eligibility.
- Published output is immutable until the next publish.
- Historical snapshots remain immutable.

## Server validation

A browser editor is not a trust boundary. Backend normalization must validate:

- schema version;
- maximum nodes/children/depth;
- valid component type allowlist;
- valid property types/ranges;
- valid token names;
- valid action intents;
- valid page IDs and references;
- valid data-binding shapes;
- absence of executable HTML/JS in unsafe fields;
- maximum media/reference sizes;
- Nitro entitlement before publish.

Unknown fields may be stripped or preserved only under an explicit forward-compatibility namespace.

## Migration path

### Phase A — Stabilize current editor contracts

- Correct move/resize mutation boundaries.
- Add explicit patch functions for layout/content/style/action.
- Coalesce drag history and autosave.
- Add regression coverage.

### Phase B — Introduce Studio document primitives

- Add `experience.schemaVersion = 2`.
- Add node IDs, pages, containers and theme tokens.
- Add v1 tile -> v2 node migration.
- Keep server persistence inside the existing draft snapshot.

### Phase C — Shared renderer

- Extract reusable storefront renderer components.
- Make phone preview consume the same document.
- Teach main application to consume the published v2 document.

### Phase D — Real Studio UX

- Searchable/favorited component palette.
- Phone stage with zoom/pan.
- Drop zones and magnetic guides.
- Layer tree and multi-select.
- Inspector tabs.
- Responsive controls.
- Action graph.
- Duplicate/group/reparent/lock/hide.

### Phase E — Advanced commerce design system

- Dynamic collection blocks.
- Conditional sections.
- reusable saved sections.
- templates with semantic slots.
- optional variant sets/A-B experiments later.
- analytics overlays showing storefront performance without changing published rendering.

## What we should not copy from m3e-canvas

- Prompt generation as the canonical artifact.
- Generic Material component semantics as the storefront model.
- LocalStorage as the authoritative project store.
- Arbitrary screen links that bypass Azaman domain actions.
- A purely absolute-positioned screen model as the default layout system.

## Product vision

The finished experience should feel closer to a purpose-built mini-Figma/Shopify Theme Editor inside Azaman than the current tile configurator.

A business owner should be able to open **Storefront Studio**, choose a template or blank page, drag components into a phone-shaped customer view, directly manipulate the composition, switch between desktop/tablet/phone previews, select any component, deeply customize it from the inspector, connect buttons to safe customer actions, see real catalog data in the stage, review the live storefront, undo/redo confidently, and publish a validated revision.

The key design principle is **visual freedom without runtime freedom**: businesses can control presentation extremely deeply, while the platform retains strict control over money, catalog truth, security, and executable behavior.
