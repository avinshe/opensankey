# @opensankey/tableau

Tableau dashboard extension for OpenSankey. Renders interactive Sankey charts inside Tableau dashboards.

## Setup

1. Build the extension:

```bash
pnpm build
```

2. Host the built `dist/index.global.js` and an `index.html` on a web server (HTTPS in production, localhost for development).

3. Create an `index.html` that loads the Tableau Extensions API and the built bundle:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@anthropic-ai/tableau-ext-api/lib/tableau.extensions.1.latest.js"></script>
  <script src="./dist/index.global.js"></script>
</head>
<body></body>
</html>
```

4. Update the `source-location` URL in `opensankey.trex` to point to your hosted `index.html`.

5. In Tableau Desktop, drag the extension onto your dashboard. The extension reads from the first worksheet and auto-detects dimensions (source, target) and measures (value).

## Data Requirements

The worksheet should contain at least:
- **2 dimension columns** (text) — source and target nodes
- **1 measure column** (numeric) — flow value

The extension auto-detects column types and maps the first two text columns as source/target and the first numeric column as value.

## Events

The extension automatically re-renders when:
- Filters change
- Mark selection changes
- The browser window resizes

## License

MIT
