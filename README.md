# OpenSankey

Zero-dependency TypeScript Sankey chart library built for BI tools. Interactive user journey visualization for Looker, Power BI, Tableau, and more.

## Features

- **Zero runtime dependencies** — layout algorithm from scratch, no D3
- **Filled ribbon links** — area paths with source-to-target gradients
- **CSP-safe** — no injected `<style>` tags or `@keyframes`, works inside strict BI tool iframes
- **Interactive** — hover highlighting (forward/backward/both), node dragging, frosted-glass tooltips
- **Journey analytics** — drop-off rates, conversion rates, percentage badges on nodes
- **Tiny bundle** — ~25KB minified IIFE with everything included
- **TypeScript-first** — full type definitions, tree-shakeable ESM export

## Quick Start

### Browser (IIFE)

```html
<div id="chart"></div>
<script src="https://unpkg.com/@opensankey/core/dist/index.global.js"></script>
<script>
  const chart = new OpenSankey.SankeyChart(document.getElementById('chart'), {
    width: 900,
    height: 500,
  });

  chart.setData(
    {
      rows: [
        { from: 'Google Ads', to: 'Landing Page', count: 5000 },
        { from: 'Organic Search', to: 'Landing Page', count: 3000 },
        { from: 'Landing Page', to: 'Sign Up', count: 4800 },
        { from: 'Landing Page', to: 'Bounce', count: 3200 },
        { from: 'Sign Up', to: 'Purchase', count: 2400 },
        { from: 'Sign Up', to: 'Drop Off', count: 2400 },
      ],
    },
    { sourceField: 'from', targetField: 'to', valueField: 'count' },
  );
</script>
```

### npm (ESM)

```bash
npm install @opensankey/core
```

```typescript
import { SankeyChart } from '@opensankey/core';

const chart = new SankeyChart(document.getElementById('chart')!, {
  width: 900,
  height: 500,
  highlightMode: 'both',
  draggable: true,
});

chart.setData(
  { rows: myData },
  { sourceField: 'source', targetField: 'target', valueField: 'value' },
);
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | `800` | Chart width in pixels |
| `height` | `number` | `500` | Chart height in pixels |
| `nodeWidth` | `number` | `18` | Width of node rectangles |
| `nodePadding` | `number` | `14` | Vertical spacing between nodes |
| `nodeAlign` | `string` | `'justify'` | Node alignment: `left`, `right`, `center`, `justify` |
| `linkOpacity` | `number` | `0.18` | Default link opacity |
| `linkHighlightOpacity` | `number` | `0.45` | Link opacity when highlighted |
| `linkDimOpacity` | `number` | `0.04` | Link opacity when dimmed |
| `highlightMode` | `string` | `'both'` | Hover highlight: `forward`, `backward`, `both`, `none` |
| `draggable` | `boolean` | `true` | Enable node dragging |
| `tooltips` | `boolean` | `true` | Enable hover tooltips |
| `colorPalette` | `string[]` | 12 muted colors | Node color palette |
| `iterations` | `number` | `32` | Layout relaxation iterations |
| `padding` | `Padding` | `{top:20, right:120, bottom:20, left:20}` | SVG inner padding |

## API

### `SankeyChart`

```typescript
const chart = new SankeyChart(container: HTMLElement, config?: Partial<SankeyConfig>);

// Set data from tabular rows (typical BI tool output)
chart.setData(data: TabularData, transform: TransformConfig): void;

// Set data from a pre-built graph (advanced)
chart.setGraph(graph: SankeyGraph): void;

// Update config and re-render
chart.updateConfig(config: Partial<SankeyConfig>): void;

// Resize
chart.resize(width: number, height: number): void;

// Journey analytics: drop-off, conversion rates per node
chart.getJourneyMetrics(): JourneyMetrics[];

// Event handling
chart.on('node:hover', ({ node, event }) => { ... });
chart.on('node:click', ({ node, event }) => { ... });
chart.on('link:hover', ({ link, event }) => { ... });
chart.on('link:click', ({ link, event }) => { ... });
chart.on('node:drag', ({ node, dx, dy }) => { ... });

// Cleanup
chart.destroy(): void;
```

### Events

| Event | Payload |
|-------|---------|
| `node:hover` | `{ node: SankeyNode, event: MouseEvent }` |
| `node:leave` | `{ node: SankeyNode, event: MouseEvent }` |
| `node:click` | `{ node: SankeyNode, event: MouseEvent }` |
| `node:drag` | `{ node: SankeyNode, dx: number, dy: number }` |
| `link:hover` | `{ link: SankeyLink, event: MouseEvent }` |
| `link:leave` | `{ link: SankeyLink, event: MouseEvent }` |
| `link:click` | `{ link: SankeyLink, event: MouseEvent }` |

### Custom Formatters

```typescript
const chart = new SankeyChart(container, {
  nodeTooltip: (node) => `<b>${node.label}</b>: ${node.value} users`,
  linkTooltip: (link) => `${link.source.label} → ${link.target.label}: ${link.value}`,
  nodeLabel: (node) => node.label.toUpperCase(),
});
```

## Packages

| Package | Description | Bundle |
|---------|-------------|--------|
| `@opensankey/core` | Layout engine, SVG renderer, interactions | ~44KB IIFE |
| `@opensankey/looker` | Looker custom visualization adapter | ~25KB IIFE (minified) |

## Looker Integration

See [`packages/looker/`](packages/looker/) for the Looker custom visualization adapter. Upload the built IIFE bundle and `manifest.lkml` to your Looker instance.

Requires 2 dimensions (source, target) and 1 measure (value). Configurable options: Node Width, Node Padding, Link Opacity, Highlight Mode.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Dev mode (watch)
pnpm dev
```

### Project Structure

```
opensankey/
├── packages/
│   ├── core/                  # @opensankey/core
│   │   ├── src/
│   │   │   ├── types/         # Type definitions and defaults
│   │   │   ├── layout/        # Sankey layout algorithm + path generator
│   │   │   ├── render/        # CSP-safe SVG renderer + gradient manager
│   │   │   ├── interactions/  # Events, highlighting, tooltips
│   │   │   ├── transforms/    # Tabular data transform, journey analysis
│   │   │   └── chart.ts       # Main SankeyChart API
│   │   └── tests/             # 25 tests (vitest + jsdom)
│   └── looker/                # @opensankey/looker
│       ├── src/index.ts       # Looker custom viz adapter
│       └── manifest.lkml      # Looker manifest
├── examples/
│   └── demo.html              # Interactive demo with 3 datasets
└── package.json
```

## Demo

Open `examples/demo.html` in a browser after building:

```bash
pnpm build
npx http-server . -p 3333
# Open http://localhost:3333/examples/demo.html
```

## License

MIT
