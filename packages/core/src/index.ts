// Main API
export { SankeyChart } from './chart.js';

// Types
export type {
  SankeyNode,
  SankeyLink,
  SankeyGraph,
  SankeyConfig,
  Padding,
  TabularData,
  ColumnDef,
  TransformConfig,
  JourneyMetrics,
  SankeyEvents,
  SankeyEventName,
  SankeyEventHandler,
} from './types/index.js';
export { DEFAULT_CONFIG } from './types/index.js';

// Layout (for advanced use)
export { SankeyLayout } from './layout/sankey.js';
export { PathGenerator } from './layout/path.js';

// Renderer (for advanced use)
export { SankeyRenderer } from './render/renderer.js';
export { GradientManager } from './render/gradient.js';

// Transforms (for advanced use)
export { TabularTransform } from './transforms/tabular.js';
export { JourneyAnalyzer } from './transforms/journey.js';

// Interactions (for advanced use)
export { EventManager } from './interactions/events.js';
export { Highlighter } from './interactions/highlighter.js';
export { TooltipManager } from './interactions/tooltip.js';
