import { SankeyChart } from '@opensankey/core';
import type { SankeyConfig, TabularData, TransformConfig } from '@opensankey/core';
import {
  client,
  type WorkbookElementColumns,
  type WorkbookElementData,
} from '@sigmacomputing/plugin';

/**
 * Sigma Computing Plugin for Sankey Charts.
 *
 * Uses the @sigmacomputing/plugin client to receive data from Sigma workbooks
 * and render an interactive Sankey chart inside the plugin iframe.
 *
 * Configuration panel exposes:
 * - "source": element (the Sigma table/sheet to pull data from)
 * - "sourceCol": column from that element (source dimension)
 * - "targetCol": column from that element (target dimension)
 * - "valueCol": column from that element (numeric measure)
 */

let chart: SankeyChart | null = null;
let cachedColumns: WorkbookElementColumns | null = null;

// Configure the Sigma editor panel with our required inputs
client.config.configureEditorPanel([
  { name: 'source', type: 'element', label: 'Data Source' },
  { name: 'sourceCol', type: 'column', source: 'source', allowMultiple: false, label: 'Source Column' },
  { name: 'targetCol', type: 'column', source: 'source', allowMultiple: false, label: 'Target Column' },
  { name: 'valueCol', type: 'column', source: 'source', allowMultiple: false, label: 'Value Column' },
  {
    name: 'highlightMode',
    type: 'dropdown',
    label: 'Highlight Mode',
    values: ['both', 'forward', 'backward', 'none'],
    defaultValue: 'both',
  },
]);

function getChartConfig(): Partial<SankeyConfig> {
  const container = document.getElementById('sankey-container');
  const config = client.config.get() as Record<string, unknown> | undefined;
  return {
    width: container?.clientWidth || 800,
    height: container?.clientHeight || 500,
    nodeWidth: 18,
    nodePadding: 14,
    linkOpacity: 0.18,
    highlightMode: ((config?.['highlightMode'] as string) || 'both') as SankeyConfig['highlightMode'],
  };
}

function renderChart(data: WorkbookElementData): void {
  const container = document.getElementById('sankey-container');
  if (!container || !cachedColumns) return;

  const config = client.config.get() as Record<string, unknown> | undefined;
  const sourceColId = config?.['sourceCol'] as string | undefined;
  const targetColId = config?.['targetCol'] as string | undefined;
  const valueColId = config?.['valueCol'] as string | undefined;

  if (!sourceColId || !targetColId || !valueColId) {
    container.innerHTML =
      '<div style="padding:20px;color:#666;font-family:sans-serif;font-size:13px;">' +
      'Configure Source Column, Target Column, and Value Column in the plugin settings.</div>';
    return;
  }

  const sourceValues = data[sourceColId];
  const targetValues = data[targetColId];
  const valueValues = data[valueColId];

  if (!sourceValues || !targetValues || !valueValues) {
    container.innerHTML =
      '<div style="padding:20px;color:#666;font-family:sans-serif;font-size:13px;">' +
      'No data available for the selected columns.</div>';
    return;
  }

  const sourceName = cachedColumns[sourceColId]?.name || 'source';
  const targetName = cachedColumns[targetColId]?.name || 'target';
  const valueName = cachedColumns[valueColId]?.name || 'value';

  const rowCount = Math.min(sourceValues.length, targetValues.length, valueValues.length);
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < rowCount; i++) {
    const source = sourceValues[i];
    const target = targetValues[i];
    const value = valueValues[i];
    if (source != null && target != null && value != null) {
      rows.push({
        [sourceName]: String(source),
        [targetName]: String(target),
        [valueName]: Number(value),
      });
    }
  }

  if (rows.length === 0) {
    container.innerHTML =
      '<div style="padding:20px;color:#666;font-family:sans-serif;font-size:13px;">' +
      'No valid rows found.</div>';
    return;
  }

  const tabularData: TabularData = { rows };
  const transformConfig: TransformConfig = {
    sourceField: sourceName,
    targetField: targetName,
    valueField: valueName,
  };

  if (chart) {
    chart.destroy();
    chart = null;
  }

  container.innerHTML = '';
  chart = new SankeyChart(container, getChartConfig());
  chart.setData(tabularData, transformConfig);
}

// Create container
const container = document.createElement('div');
container.id = 'sankey-container';
container.style.width = '100%';
container.style.height = '100vh';
container.style.overflow = 'hidden';
document.body.style.margin = '0';
document.body.appendChild(container);

// Subscribe to column metadata
client.elements.subscribeToElementColumns('source', (columns) => {
  cachedColumns = columns;
});

// Subscribe to data updates — re-render whenever data changes
client.elements.subscribeToElementData('source', (data) => {
  renderChart(data);
});

// Re-render on config changes (e.g., column selection changes)
client.config.subscribe(() => {
  // Data subscription will fire again if columns changed,
  // but we re-render for config-only changes too (like highlightMode)
  if (chart) {
    const cfg = getChartConfig();
    chart.updateConfig(cfg);
  }
});

// Resize handling
let resizeTimer: ReturnType<typeof setTimeout>;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (chart) {
      const cfg = getChartConfig();
      chart.resize(cfg.width!, cfg.height!);
    }
  }, 200);
});

export { renderChart };
