# @opensankey/sigma

Sigma Computing plugin for OpenSankey. Renders interactive Sankey charts inside Sigma workbooks.

## Setup

1. Build the plugin:

```bash
pnpm build
```

2. Host the built `dist/index.global.js` in an HTML page accessible via URL.

3. In Sigma, add a Plugin element to your workbook and point it to your hosted URL.

4. Configure the plugin in the Sigma editor panel:
   - **Data Source**: Select the Sigma table/element to pull data from
   - **Source Column**: The dimension for source nodes
   - **Target Column**: The dimension for target nodes
   - **Value Column**: The numeric measure for flow weight
   - **Highlight Mode**: Hover highlight direction (both, forward, backward, none)

## How It Works

The plugin uses the `@sigmacomputing/plugin` client API to:

- Register configuration options via `configureEditorPanel`
- Subscribe to element data via `subscribeToElementData`
- Subscribe to column metadata via `subscribeToElementColumns`
- React to config changes via `config.subscribe`

Data flows from Sigma to the plugin as column arrays, which are converted to tabular rows and passed to `@opensankey/core`.

## License

MIT
