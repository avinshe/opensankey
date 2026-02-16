import { SankeyChart } from '@opensankey/core';
import type { SankeyConfig, TabularData, TransformConfig } from '@opensankey/core';

/**
 * Power BI Custom Visual for Sankey Charts.
 *
 * Implements the IVisual interface expected by Power BI.
 * Reads categorical DataView with 2 category columns (source, target) and 1 value.
 */

interface VisualConstructorOptions {
  element: HTMLElement;
  host: IVisualHost;
}

interface VisualUpdateOptions {
  dataViews: DataView[];
  viewport: { width: number; height: number };
  type: number;
}

interface IVisualHost {
  createSelectionIdBuilder(): unknown;
  createSelectionManager(): unknown;
  colorPalette: unknown;
  tooltipService: unknown;
}

interface DataView {
  categorical?: CategoricalDataView;
  metadata?: { objects?: Record<string, Record<string, unknown>> };
}

interface CategoricalDataView {
  categories?: CategoryColumn[];
  values?: ValueColumn[];
}

interface CategoryColumn {
  source: { displayName: string; queryName: string };
  values: (string | number | null)[];
}

interface ValueColumn {
  source: { displayName: string; queryName: string };
  values: (number | null)[];
}

interface IVisual {
  constructor: Function;
  update(options: VisualUpdateOptions): void;
  destroy?(): void;
}

class SankeyVisual implements IVisual {
  private container: HTMLElement;
  private chart: SankeyChart | null = null;

  constructor(options: VisualConstructorOptions) {
    this.container = options.element;
    this.container.style.overflow = 'hidden';
  }

  update(options: VisualUpdateOptions): void {
    // Clean up previous chart
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const dataView = options.dataViews?.[0];
    if (!dataView?.categorical) return;

    const categorical = dataView.categorical;
    const categories = categorical.categories;
    const values = categorical.values;

    if (!categories || categories.length < 2 || !values || values.length < 1) {
      this.container.innerHTML =
        '<div style="padding:20px;color:#666;font-family:Segoe UI,sans-serif;font-size:13px;">' +
        'Drag at least 2 fields to Categories (source, target) and 1 field to Values.</div>';
      return;
    }

    const sourceCol = categories[0];
    const targetCol = categories[1];
    const valueCol = values[0];
    const rowCount = sourceCol.values.length;

    // Convert Power BI DataView to TabularData rows
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < rowCount; i++) {
      const source = sourceCol.values[i];
      const target = targetCol.values[i];
      const value = valueCol.values[i];
      if (source != null && target != null && value != null) {
        rows.push({
          source: String(source),
          target: String(target),
          value: Number(value),
        });
      }
    }

    if (rows.length === 0) return;

    const tabularData: TabularData = { rows };
    const transformConfig: TransformConfig = {
      sourceField: 'source',
      targetField: 'target',
      valueField: 'value',
    };

    // Read settings from Power BI formatting pane
    const objects = dataView.metadata?.objects?.['sankeySettings'] ?? {};
    const chartConfig: Partial<SankeyConfig> = {
      width: options.viewport.width,
      height: options.viewport.height,
      nodeWidth: Number(objects['nodeWidth']) || 18,
      nodePadding: Number(objects['nodePadding']) || 14,
      linkOpacity: Number(objects['linkOpacity']) || 0.18,
      highlightMode: (String(objects['highlightMode'] || 'both')) as SankeyConfig['highlightMode'],
    };

    this.container.innerHTML = '';
    this.chart = new SankeyChart(this.container, chartConfig);
    this.chart.setData(tabularData, transformConfig);
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

// Power BI expects the visual class to be exported
export { SankeyVisual };

// Also register globally for Power BI's module loader
(globalThis as any).powerbi = (globalThis as any).powerbi || {};
(globalThis as any).powerbi.extensibility = (globalThis as any).powerbi.extensibility || {};
(globalThis as any).powerbi.extensibility.visual = { SankeyVisual };
