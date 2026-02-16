# @opensankey/powerbi

Power BI custom visual adapter for OpenSankey. Renders interactive Sankey charts inside Power BI reports and dashboards.

## Setup

1. Build the visual:

```bash
pnpm build
```

2. Package as a `.pbiviz` file using the Power BI visuals CLI (`pbiviz package`), or import the built JS directly into a Power BI custom visual project.

3. In Power BI, drag **2 category fields** (source, target) and **1 value field** (measure) into the visual.

## Data Mapping

| Role | Type | Description |
|------|------|-------------|
| Source | Grouping (Category) | Source node dimension |
| Target | Grouping (Category) | Target node dimension |
| Value | Measure | Flow value / weight |

## Formatting Options

Available in the Power BI formatting pane under "Sankey Settings":

| Option | Default | Description |
|--------|---------|-------------|
| Node Width | 18 | Width of node rectangles in pixels |
| Node Spacing | 14 | Vertical spacing between nodes |
| Link Opacity | 0.18 | Opacity of link ribbons (0-1) |
| Highlight Mode | Both | Hover highlight: both, forward, backward, none |

## License

MIT
