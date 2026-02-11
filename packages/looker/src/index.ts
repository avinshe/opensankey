import { SankeyChart } from '@opensankey/core';
import type { SankeyConfig, TabularData, TransformConfig } from '@opensankey/core';

/**
 * Looker Custom Visualization Adapter for Sankey Charts.
 *
 * Integrates @opensankey/core into Looker's custom visualization API.
 * Looker provides data as rows with dimension/measure fields.
 */

interface LookerViz {
  id: string;
  label: string;
  options: Record<string, LookerOption>;
  create(element: HTMLElement, config: Record<string, unknown>): void;
  updateAsync(
    data: LookerData[],
    element: HTMLElement,
    config: Record<string, unknown>,
    queryResponse: LookerQueryResponse,
    details: unknown,
    done: () => void,
  ): void;
}

interface LookerOption {
  type: string;
  label: string;
  default?: string | number | boolean;
  display?: string;
  values?: Array<{ [key: string]: string }>;
  section?: string;
  order?: number;
  placeholder?: string;
}

interface LookerData {
  [fieldName: string]: { value: unknown; rendered?: string };
}

interface LookerQueryResponse {
  fields: {
    dimensions: Array<{ name: string; label_short?: string; label?: string }>;
    measures: Array<{ name: string; label_short?: string; label?: string }>;
  };
}

declare const looker: {
  plugins: {
    visualizations: {
      add: (viz: LookerViz) => void;
    };
  };
};

const viz: LookerViz = {
  id: 'opensankey',
  label: 'Sankey Chart',
  options: {
    nodeWidth: {
      type: 'number',
      label: 'Node Width',
      default: 20,
      section: 'Style',
      order: 1,
    },
    nodePadding: {
      type: 'number',
      label: 'Node Padding',
      default: 12,
      section: 'Style',
      order: 2,
    },
    linkOpacity: {
      type: 'number',
      label: 'Link Opacity',
      default: 0.4,
      section: 'Style',
      order: 3,
    },
    highlightMode: {
      type: 'string',
      label: 'Highlight Mode',
      default: 'both',
      display: 'select',
      values: [
        { 'Both directions': 'both' },
        { 'Forward only': 'forward' },
        { 'Backward only': 'backward' },
        { 'None': 'none' },
      ],
      section: 'Style',
      order: 4,
    },
  },

  create(element: HTMLElement) {
    element.innerHTML = '';
    element.style.fontFamily = 'sans-serif';
  },

  updateAsync(data, element, config, queryResponse, _details, done) {
    // Determine source, target, and value fields from query
    const dims = queryResponse.fields.dimensions;
    const measures = queryResponse.fields.measures;

    if (dims.length < 2 || measures.length < 1) {
      element.innerHTML =
        '<div style="padding:20px;color:#666;">Requires at least 2 dimensions (source, target) and 1 measure (value).</div>';
      done();
      return;
    }

    const sourceField = dims[0].name;
    const targetField = dims[1].name;
    const valueField = measures[0].name;

    // Convert Looker data to TabularData
    const rows = data.map(row => ({
      [sourceField]: row[sourceField]?.value,
      [targetField]: row[targetField]?.value,
      [valueField]: row[valueField]?.value,
    }));

    const tabularData: TabularData = { rows };
    const transformConfig: TransformConfig = { sourceField, targetField, valueField };

    // Chart config from Looker options
    const chartConfig: Partial<SankeyConfig> = {
      width: element.clientWidth || 800,
      height: element.clientHeight || 500,
      nodeWidth: Number(config.nodeWidth) || 20,
      nodePadding: Number(config.nodePadding) || 12,
      linkOpacity: Number(config.linkOpacity) || 0.4,
      highlightMode: (config.highlightMode as SankeyConfig['highlightMode']) || 'both',
    };

    // Clear and re-create chart
    element.innerHTML = '';
    const chart = new SankeyChart(element, chartConfig);
    chart.setData(tabularData, transformConfig);

    done();
  },
};

// Register with Looker if available
if (typeof looker !== 'undefined') {
  looker.plugins.visualizations.add(viz);
}

export { viz };
