# @opensankey/core

Zero-dependency Sankey chart engine for the browser. Layout algorithm, SVG renderer, interactions, and journey analytics — all in one CSP-safe package.

## Install

```bash
npm install @opensankey/core
```

## Usage

```typescript
import { SankeyChart } from '@opensankey/core';

const chart = new SankeyChart(document.getElementById('chart')!, {
  width: 900,
  height: 500,
});

chart.setData(
  {
    rows: [
      { from: 'Ads', to: 'Landing', count: 5000 },
      { from: 'Landing', to: 'Signup', count: 3000 },
      { from: 'Landing', to: 'Bounce', count: 2000 },
    ],
  },
  { sourceField: 'from', targetField: 'to', valueField: 'count' },
);

// Journey analytics
const metrics = chart.getJourneyMetrics();
// [{ nodeId: 'Landing', conversionRate: 0.6, dropOff: 2000, ... }, ...]
```

## Browser (IIFE)

```html
<script src="https://unpkg.com/@opensankey/core/dist/index.global.js"></script>
<script>
  const chart = new OpenSankey.SankeyChart(container, config);
</script>
```

## Advanced: Direct Layout + Renderer

```typescript
import { SankeyLayout, SankeyRenderer, TabularTransform } from '@opensankey/core';
import type { SankeyConfig } from '@opensankey/core';

const config: SankeyConfig = { /* ... */ };
const graph = TabularTransform.transform(data, transformConfig, config);
new SankeyLayout(config).compute(graph);

const renderer = new SankeyRenderer(container, config);
renderer.render(graph);
```

See the [main README](../../README.md) for full API docs.

## License

MIT
