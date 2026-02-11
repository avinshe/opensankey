import type {
  SankeyNode, SankeyLink, SankeyGraph,
  TabularData, TransformConfig, SankeyConfig,
} from '../types/index.js';

/**
 * Converts tabular (row-based) data into a SankeyGraph.
 *
 * - Deduplicates and aggregates duplicate source→target pairs
 * - Assigns colors from the palette
 * - Wires up sourceLinks/targetLinks references
 */
export class TabularTransform {
  static transform(
    data: TabularData,
    transformConfig: TransformConfig,
    sankeyConfig: SankeyConfig,
  ): SankeyGraph {
    const { sourceField, targetField, valueField } = transformConfig;
    const palette = sankeyConfig.colorPalette;

    // Aggregate links: key → total value
    const linkAgg = new Map<string, number>();
    for (const row of data.rows) {
      const source = String(row[sourceField] ?? '');
      const target = String(row[targetField] ?? '');
      const value = Number(row[valueField]) || 0;
      if (!source || !target || value <= 0) continue;

      const key = `${source}→${target}`;
      linkAgg.set(key, (linkAgg.get(key) || 0) + value);
    }

    // Collect unique node IDs preserving first-seen order
    const nodeIds: string[] = [];
    const nodeIdSet = new Set<string>();
    for (const row of data.rows) {
      const source = String(row[sourceField] ?? '');
      const target = String(row[targetField] ?? '');
      if (source && !nodeIdSet.has(source)) {
        nodeIdSet.add(source);
        nodeIds.push(source);
      }
      if (target && !nodeIdSet.has(target)) {
        nodeIdSet.add(target);
        nodeIds.push(target);
      }
    }

    // Create nodes
    const nodeMap = new Map<string, SankeyNode>();
    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      const node: SankeyNode = {
        id,
        label: id,
        value: 0,
        depth: 0,
        x: 0, y: 0,
        width: 0, height: 0,
        color: palette[i % palette.length],
        sourceLinks: [],
        targetLinks: [],
      };
      nodeMap.set(id, node);
    }

    // Create links with node references
    const links: SankeyLink[] = [];
    for (const [key, value] of linkAgg) {
      const [sourceId, targetId] = key.split('→');
      const source = nodeMap.get(sourceId)!;
      const target = nodeMap.get(targetId)!;

      const link: SankeyLink = {
        source,
        target,
        value,
        width: 0,
        sy: 0,
        ty: 0,
      };

      source.sourceLinks.push(link);
      target.targetLinks.push(link);
      links.push(link);
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links,
    };
  }
}
