import type { SankeyGraph, JourneyMetrics } from '../types/index.js';

/**
 * Analyzes a Sankey graph as a user journey:
 * - Drop-off rates per node
 * - Conversion rates per node
 * - Source/sink detection
 */
export class JourneyAnalyzer {
  static analyze(graph: SankeyGraph): JourneyMetrics[] {
    return graph.nodes.map(node => {
      const inflow = node.targetLinks.reduce((s, l) => s + l.value, 0);
      const outflow = node.sourceLinks.reduce((s, l) => s + l.value, 0);
      const isSource = node.targetLinks.length === 0;
      const isSink = node.sourceLinks.length === 0;

      const dropOff = isSource || isSink ? 0 : inflow - outflow;
      const dropOffRate = inflow > 0 && !isSource ? dropOff / inflow : 0;
      const conversionRate = inflow > 0 && !isSource ? outflow / inflow : isSource ? 1 : 0;

      return {
        nodeId: node.id,
        label: node.label,
        inflow,
        outflow,
        dropOff,
        dropOffRate,
        conversionRate,
        isSource,
        isSink,
      };
    });
  }
}
