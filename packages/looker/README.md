# @opensankey/looker

Looker custom visualization adapter for OpenSankey. Renders interactive Sankey charts inside Looker dashboards.

## Setup

1. Build the adapter:

```bash
pnpm build
```

2. Upload `dist/index.global.js` and `manifest.lkml` to your Looker instance as a custom visualization.

3. In your Looker Explore, select at least **2 dimensions** (source, target) and **1 measure** (value).

4. Choose "Sankey Chart" from the visualization picker.

## Configurable Options

These appear in Looker's visualization config panel under the "Style" section:

| Option | Default | Description |
|--------|---------|-------------|
| Node Width | 20 | Width of node rectangles in pixels |
| Node Padding | 12 | Vertical spacing between nodes |
| Link Opacity | 0.4 | Opacity of link ribbons (0-1) |
| Highlight Mode | Both | Hover highlight direction: both, forward, backward, none |

## CSP Safety

This adapter uses no injected `<style>` tags and no CSS `@keyframes`. All styling is applied via inline `style` attributes and animations use `requestAnimationFrame`. This is designed to work within Looker's Content Security Policy.

## License

MIT
