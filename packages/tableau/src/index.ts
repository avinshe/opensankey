import { SankeyChart } from '@opensankey/core';
import type { SankeyConfig, TabularData, TransformConfig } from '@opensankey/core';

/**
 * Tableau Dashboard Extension for Sankey Charts.
 *
 * Uses the Tableau Extensions API to read summary data from a worksheet
 * and render an interactive Sankey chart.
 *
 * The extension expects a worksheet with at least 2 dimensions (source, target)
 * and 1 measure (value).
 */

// Tableau Extensions API global types
declare const tableau: {
  extensions: {
    initializeAsync(config?: { configure?: () => void }): Promise<void>;
    dashboardContent: {
      dashboard: TableauDashboard;
    };
    settings: {
      get(key: string): string | undefined;
      set(key: string, value: string): void;
      saveAsync(): Promise<void>;
    };
  };
  TableauEventType: {
    FilterChanged: string;
    MarkSelectionChanged: string;
    SummaryDataChanged: string;
  };
};

interface TableauDashboard {
  name: string;
  worksheets: TableauWorksheet[];
}

interface TableauWorksheet {
  name: string;
  getSummaryDataAsync(): Promise<TableauDataTable>;
  addEventListener(type: string, handler: () => void): void;
}

interface TableauDataTable {
  columns: TableauColumn[];
  data: TableauRow[];
  totalRowCount: number;
}

interface TableauColumn {
  fieldName: string;
  index: number;
  dataType: string;
}

type TableauRow = TableauDataValue[];

interface TableauDataValue {
  value: unknown;
  formattedValue: string;
}

let chart: SankeyChart | null = null;
let activeWorksheet: TableauWorksheet | null = null;

function getConfig(): Partial<SankeyConfig> {
  const container = document.getElementById('sankey-container');
  const settings = tableau.extensions.settings;

  return {
    width: container?.clientWidth || 800,
    height: container?.clientHeight || 500,
    nodeWidth: Number(settings.get('nodeWidth')) || 18,
    nodePadding: Number(settings.get('nodePadding')) || 14,
    linkOpacity: Number(settings.get('linkOpacity')) || 0.18,
    highlightMode: (settings.get('highlightMode') || 'both') as SankeyConfig['highlightMode'],
  };
}

async function loadAndRender(worksheet: TableauWorksheet): Promise<void> {
  const dataTable = await worksheet.getSummaryDataAsync();
  const columns = dataTable.columns;

  if (columns.length < 3) {
    const container = document.getElementById('sankey-container');
    if (container) {
      container.innerHTML =
        '<div style="padding:20px;color:#666;font-family:sans-serif;font-size:13px;">' +
        'Requires at least 2 dimensions (source, target) and 1 measure (value) in the worksheet.</div>';
    }
    return;
  }

  // Detect columns: first two string-like columns as source/target, first numeric as value
  const dimCols = columns.filter(c => c.dataType === 'string');
  const measureCols = columns.filter(c => c.dataType === 'float' || c.dataType === 'int');

  const sourceField = dimCols.length >= 2 ? dimCols[0].fieldName : columns[0].fieldName;
  const targetField = dimCols.length >= 2 ? dimCols[1].fieldName : columns[1].fieldName;
  const valueField = measureCols.length >= 1 ? measureCols[0].fieldName : columns[2].fieldName;

  const sourceIdx = columns.findIndex(c => c.fieldName === sourceField);
  const targetIdx = columns.findIndex(c => c.fieldName === targetField);
  const valueIdx = columns.findIndex(c => c.fieldName === valueField);

  // Convert Tableau data to TabularData rows
  const rows: Record<string, unknown>[] = [];
  for (const row of dataTable.data) {
    rows.push({
      [sourceField]: row[sourceIdx]?.formattedValue ?? row[sourceIdx]?.value,
      [targetField]: row[targetIdx]?.formattedValue ?? row[targetIdx]?.value,
      [valueField]: Number(row[valueIdx]?.value) || 0,
    });
  }

  if (rows.length === 0) return;

  const tabularData: TabularData = { rows };
  const transformConfig: TransformConfig = { sourceField, targetField, valueField };

  const container = document.getElementById('sankey-container');
  if (!container) return;

  if (chart) {
    chart.destroy();
    chart = null;
  }

  container.innerHTML = '';
  chart = new SankeyChart(container, getConfig());
  chart.setData(tabularData, transformConfig);
}

function init(): void {
  // Create container
  const container = document.createElement('div');
  container.id = 'sankey-container';
  container.style.width = '100%';
  container.style.height = '100vh';
  container.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.appendChild(container);

  tableau.extensions.initializeAsync().then(() => {
    const dashboard = tableau.extensions.dashboardContent.dashboard;

    if (dashboard.worksheets.length === 0) {
      container.innerHTML =
        '<div style="padding:20px;color:#666;font-family:sans-serif;">No worksheets found.</div>';
      return;
    }

    // Use the first worksheet by default
    activeWorksheet = dashboard.worksheets[0];
    loadAndRender(activeWorksheet);

    // Re-render on data changes
    activeWorksheet.addEventListener(tableau.TableauEventType.FilterChanged, () => {
      if (activeWorksheet) loadAndRender(activeWorksheet);
    });
    activeWorksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, () => {
      if (activeWorksheet) loadAndRender(activeWorksheet);
    });

    // Resize handling
    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (activeWorksheet) loadAndRender(activeWorksheet);
      }, 200);
    });
  }).catch((err: Error) => {
    container.innerHTML =
      `<div style="padding:20px;color:#c00;font-family:sans-serif;">Failed to initialize: ${err.message}</div>`;
  });
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, loadAndRender };
