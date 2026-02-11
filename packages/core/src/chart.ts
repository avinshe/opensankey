import type {
  SankeyConfig, SankeyGraph, TabularData, TransformConfig,
  SankeyEventName, SankeyEventHandler, JourneyMetrics,
} from './types/index.js';
import { DEFAULT_CONFIG } from './types/index.js';
import { SankeyLayout } from './layout/sankey.js';
import { PathGenerator } from './layout/path.js';
import { SankeyRenderer } from './render/renderer.js';
import { EventManager } from './interactions/events.js';
import { Highlighter } from './interactions/highlighter.js';
import { TooltipManager } from './interactions/tooltip.js';
import { TabularTransform } from './transforms/tabular.js';
import { JourneyAnalyzer } from './transforms/journey.js';

/**
 * Main public API for the Sankey chart.
 *
 * Usage:
 *   const chart = new SankeyChart(container, { width: 800, height: 500 });
 *   chart.setData(tabularData, { sourceField: 'from', targetField: 'to', valueField: 'count' });
 */
export class SankeyChart {
  private config: SankeyConfig;
  private layout: SankeyLayout;
  private renderer: SankeyRenderer;
  private events: EventManager;
  private highlighter: Highlighter;
  private tooltips: TooltipManager;
  private graph: SankeyGraph | null = null;

  constructor(container: HTMLElement, config?: Partial<SankeyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (config?.padding) {
      this.config.padding = { ...DEFAULT_CONFIG.padding, ...config.padding };
    }

    this.layout = new SankeyLayout(this.config);
    this.renderer = new SankeyRenderer(container, this.config);
    this.events = new EventManager(
      this.renderer.getNodesGroup(),
      this.renderer.getLinksGroup(),
      this.config,
    );
    this.highlighter = new Highlighter(
      this.renderer.getLinksGroup(),
      this.renderer.getNodesGroup(),
      this.config,
    );
    this.tooltips = new TooltipManager(container, this.config);

    // Wire up default interactions
    this.events.on('node:hover', ({ node, event }) => {
      this.highlighter.highlightNode(node);
      this.tooltips.showNode(node, event);
    });
    this.events.on('node:leave', () => {
      this.highlighter.reset();
      this.tooltips.hide();
    });
    this.events.on('link:hover', ({ link, event }) => {
      this.highlighter.highlightLink(link);
      this.tooltips.showLink(link, event);
    });
    this.events.on('link:leave', () => {
      this.highlighter.reset();
      this.tooltips.hide();
    });
    this.events.on('node:drag', () => {
      if (this.graph) {
        // Re-render links/labels after drag (node positions changed)
        this.renderer.render(this.graph);
        this.events.bind(this.graph);
      }
    });
  }

  /** Set data from tabular format (typical BI tool output) */
  setData(data: TabularData, transformConfig: TransformConfig): void {
    const graph = TabularTransform.transform(data, transformConfig, this.config);
    this.setGraph(graph);
  }

  /** Set data from a pre-built graph (advanced use) */
  setGraph(graph: SankeyGraph): void {
    this.graph = graph;
    this.layout.compute(graph);
    this.renderer.render(graph);
    this.events.bind(graph);
  }

  /** Update configuration and re-render */
  updateConfig(config: Partial<SankeyConfig>): void {
    Object.assign(this.config, config);
    if (config.padding) {
      this.config.padding = { ...this.config.padding, ...config.padding };
    }
    if (this.graph) {
      this.layout = new SankeyLayout(this.config);
      this.layout.compute(this.graph);
      this.renderer.resize(this.config.width, this.config.height);
      this.renderer.render(this.graph);
      this.events.bind(this.graph);
    }
  }

  /** Resize the chart */
  resize(width: number, height: number): void {
    this.updateConfig({ width, height });
  }

  /** Get journey analytics for the current graph */
  getJourneyMetrics(): JourneyMetrics[] {
    if (!this.graph) return [];
    return JourneyAnalyzer.analyze(this.graph);
  }

  /** Subscribe to chart events */
  on<K extends SankeyEventName>(event: K, handler: SankeyEventHandler<K>): void {
    this.events.on(event, handler);
  }

  /** Unsubscribe from chart events */
  off<K extends SankeyEventName>(event: K, handler: SankeyEventHandler<K>): void {
    this.events.off(event, handler);
  }

  /** Get the underlying SVG element */
  getSVG(): SVGSVGElement {
    return this.renderer.getSVG();
  }

  /** Get the current graph */
  getGraph(): SankeyGraph | null {
    return this.graph;
  }

  /** Cleanup and remove the chart */
  destroy(): void {
    this.events.unbind();
    this.tooltips.destroy();
    this.renderer.destroy();
    this.graph = null;
  }
}
