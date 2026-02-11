/** A node in the Sankey diagram */
export interface SankeyNode {
  id: string;
  label: string;
  /** Computed: total flow value through this node */
  value: number;
  /** Computed: column depth (0 = leftmost source) */
  depth: number;
  /** Computed: x position in pixels */
  x: number;
  /** Computed: y position in pixels */
  y: number;
  /** Computed: node width in pixels */
  width: number;
  /** Computed: node height in pixels */
  height: number;
  /** Color override — defaults to palette assignment */
  color?: string;
  /** Links originating from this node */
  sourceLinks: SankeyLink[];
  /** Links targeting this node */
  targetLinks: SankeyLink[];
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}

/** A link (flow) between two nodes */
export interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  /** Flow value / weight */
  value: number;
  /** Computed: link thickness in pixels */
  width: number;
  /** Computed: y offset at source node */
  sy: number;
  /** Computed: y offset at target node */
  ty: number;
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}

/** The full graph structure after layout */
export interface SankeyGraph {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/** Configuration for the Sankey chart */
export interface SankeyConfig {
  /** Chart width in pixels */
  width: number;
  /** Chart height in pixels */
  height: number;
  /** Padding inside the SVG */
  padding: Padding;
  /** Node width in pixels */
  nodeWidth: number;
  /** Vertical padding between nodes in pixels */
  nodePadding: number;
  /** Node alignment strategy */
  nodeAlign: 'left' | 'right' | 'center' | 'justify';
  /** Default link opacity */
  linkOpacity: number;
  /** Link opacity when highlighted */
  linkHighlightOpacity: number;
  /** Link opacity when dimmed */
  linkDimOpacity: number;
  /** Color palette for nodes */
  colorPalette: string[];
  /** Highlight mode on hover */
  highlightMode: 'forward' | 'backward' | 'both' | 'none';
  /** Enable node dragging */
  draggable: boolean;
  /** Enable tooltips */
  tooltips: boolean;
  /** Custom tooltip formatter for nodes */
  nodeTooltip?: (node: SankeyNode) => string;
  /** Custom tooltip formatter for links */
  linkTooltip?: (link: SankeyLink) => string;
  /** Custom node label formatter */
  nodeLabel?: (node: SankeyNode) => string;
  /** Number of layout relaxation iterations */
  iterations: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Input data in tabular form (rows from BI tools) */
export interface TabularData {
  rows: Record<string, unknown>[];
  columns?: ColumnDef[];
}

export interface ColumnDef {
  name: string;
  label?: string;
  type?: 'string' | 'number';
}

/** Configuration for transforming tabular data into a graph */
export interface TransformConfig {
  /** Column name for source node */
  sourceField: string;
  /** Column name for target node */
  targetField: string;
  /** Column name for value/weight */
  valueField: string;
  /** Optional: column for source node color */
  sourceColorField?: string;
  /** Optional: column for target node color */
  targetColorField?: string;
}

/** Journey analysis result per node */
export interface JourneyMetrics {
  nodeId: string;
  label: string;
  /** Total inflow (0 for source nodes) */
  inflow: number;
  /** Total outflow (0 for sink nodes) */
  outflow: number;
  /** Drop-off: inflow - outflow (for non-source/sink nodes) */
  dropOff: number;
  /** Drop-off rate: dropOff / inflow */
  dropOffRate: number;
  /** Conversion rate: outflow / inflow */
  conversionRate: number;
  /** Is this a source (entry) node? */
  isSource: boolean;
  /** Is this a sink (exit) node? */
  isSink: boolean;
}

/** Events emitted by the chart */
export interface SankeyEvents {
  'node:hover': { node: SankeyNode; event: MouseEvent };
  'node:leave': { node: SankeyNode; event: MouseEvent };
  'node:click': { node: SankeyNode; event: MouseEvent };
  'node:drag': { node: SankeyNode; dx: number; dy: number };
  'link:hover': { link: SankeyLink; event: MouseEvent };
  'link:leave': { link: SankeyLink; event: MouseEvent };
  'link:click': { link: SankeyLink; event: MouseEvent };
}

export type SankeyEventName = keyof SankeyEvents;
export type SankeyEventHandler<K extends SankeyEventName> = (data: SankeyEvents[K]) => void;

/** Default config values */
export const DEFAULT_CONFIG: SankeyConfig = {
  width: 800,
  height: 500,
  padding: { top: 20, right: 120, bottom: 20, left: 20 },
  nodeWidth: 18,
  nodePadding: 14,
  nodeAlign: 'justify',
  linkOpacity: 0.18,
  linkHighlightOpacity: 0.45,
  linkDimOpacity: 0.04,
  colorPalette: [
    '#5b8fc9', '#6bb89c', '#c07eb5', '#e8a952',
    '#7c8cbf', '#6aada8', '#d4896a', '#8e85c2',
    '#73b475', '#b5876e', '#7facc4', '#c4a55a',
  ],
  highlightMode: 'both',
  draggable: true,
  tooltips: true,
  iterations: 32,
};
