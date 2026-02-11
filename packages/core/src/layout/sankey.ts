import type { SankeyNode, SankeyLink, SankeyGraph, SankeyConfig } from '../types/index.js';

/**
 * Sankey layout algorithm — from scratch, zero dependencies.
 *
 * Steps:
 * 1. Compute node depths via BFS from sources
 * 2. Compute node values (max of in/out link sums)
 * 3. Position nodes horizontally by depth
 * 4. Position nodes vertically using initial ordering + iterative relaxation
 * 5. Compute link vertical offsets at source and target
 */
export class SankeyLayout {
  private config: SankeyConfig;

  constructor(config: SankeyConfig) {
    this.config = config;
  }

  compute(graph: SankeyGraph): SankeyGraph {
    const { nodes, links } = graph;
    if (nodes.length === 0) return graph;

    this.computeDepths(nodes);
    this.computeNodeValues(nodes);
    this.positionNodesX(nodes);
    this.initializeNodeY(nodes);
    this.relaxNodePositions(nodes);
    this.computeLinkOffsets(nodes);

    return graph;
  }

  /** BFS from source nodes to compute depth */
  private computeDepths(nodes: SankeyNode[]): void {
    // Find source nodes (no incoming links)
    const sources = nodes.filter(n => n.targetLinks.length === 0);
    if (sources.length === 0) {
      // Circular graph fallback: assign all to depth 0
      nodes.forEach(n => (n.depth = 0));
      return;
    }

    const visited = new Set<string>();
    let current = sources;
    let depth = 0;

    while (current.length > 0) {
      const next: SankeyNode[] = [];
      for (const node of current) {
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        node.depth = depth;
        for (const link of node.sourceLinks) {
          if (!visited.has(link.target.id)) {
            next.push(link.target);
          }
        }
      }
      current = next;
      depth++;
    }

    // Handle unvisited nodes (disconnected components)
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        node.depth = 0;
      }
    }

    // For 'justify' alignment, push sink nodes to the rightmost column
    if (this.config.nodeAlign === 'justify') {
      const maxDepth = Math.max(...nodes.map(n => n.depth));
      for (const node of nodes) {
        if (node.sourceLinks.length === 0 && node.depth < maxDepth) {
          node.depth = maxDepth;
        }
      }
    }
  }

  /** Node value = max(sum of incoming, sum of outgoing) */
  private computeNodeValues(nodes: SankeyNode[]): void {
    for (const node of nodes) {
      const inSum = node.targetLinks.reduce((s, l) => s + l.value, 0);
      const outSum = node.sourceLinks.reduce((s, l) => s + l.value, 0);
      node.value = Math.max(inSum, outSum);
    }
  }

  /** Horizontal positioning by depth */
  private positionNodesX(nodes: SankeyNode[]): void {
    const { padding, width, nodeWidth } = this.config;
    const innerWidth = width - padding.left - padding.right - nodeWidth;
    const maxDepth = Math.max(...nodes.map(n => n.depth), 0);
    const step = maxDepth > 0 ? innerWidth / maxDepth : 0;

    for (const node of nodes) {
      node.x = padding.left + node.depth * step;
      node.width = nodeWidth;
    }
  }

  /** Initial vertical positioning: stack nodes per column using a global scale */
  private initializeNodeY(nodes: SankeyNode[]): void {
    const { padding, height, nodePadding } = this.config;
    const innerHeight = height - padding.top - padding.bottom;

    // Group nodes by depth
    const columns = this.getColumns(nodes);

    // Compute a single global scale: the most constrained column determines it.
    // This ensures 1 unit of value = same pixels everywhere, so links fill nodes.
    let globalScale = Infinity;
    for (const column of columns) {
      const totalValue = column.reduce((s, n) => s + n.value, 0);
      const totalPadding = Math.max(0, (column.length - 1) * nodePadding);
      const availableHeight = innerHeight - totalPadding;
      if (totalValue > 0) {
        const scale = availableHeight / totalValue;
        if (scale < globalScale) globalScale = scale;
      }
    }
    if (!isFinite(globalScale)) globalScale = 0;

    for (const column of columns) {
      // Sort by value descending for initial placement
      column.sort((a, b) => b.value - a.value);

      let y = padding.top;
      for (const node of column) {
        node.y = y;
        node.height = Math.max(1, node.value * globalScale);
        y += node.height + nodePadding;
      }
    }
  }

  /** Iteratively relax vertical positions to reduce link crossings */
  private relaxNodePositions(nodes: SankeyNode[]): void {
    const columns = this.getColumns(nodes);
    const alpha = 1;

    for (let i = 0; i < this.config.iterations; i++) {
      const damping = alpha * (1 - (i / this.config.iterations));

      // Forward pass: position nodes based on their incoming links
      for (let c = 1; c < columns.length; c++) {
        for (const node of columns[c]) {
          if (node.targetLinks.length === 0) continue;
          const weightedCenter = this.weightedCenter(node, 'target');
          const delta = weightedCenter - this.nodeCenter(node);
          node.y += delta * damping;
        }
        this.resolveCollisions(columns[c]);
      }

      // Backward pass: position nodes based on their outgoing links
      for (let c = columns.length - 2; c >= 0; c--) {
        for (const node of columns[c]) {
          if (node.sourceLinks.length === 0) continue;
          const weightedCenter = this.weightedCenter(node, 'source');
          const delta = weightedCenter - this.nodeCenter(node);
          node.y += delta * damping;
        }
        this.resolveCollisions(columns[c]);
      }
    }
  }

  /** Compute link sy/ty offsets and widths */
  private computeLinkOffsets(nodes: SankeyNode[]): void {
    const columns = this.getColumns(nodes);

    for (const column of columns) {
      // Sort source links for each node
      for (const node of column) {
        // Sort outgoing links by target y position
        node.sourceLinks.sort((a, b) => a.target.y - b.target.y);
        // Sort incoming links by source y position
        node.targetLinks.sort((a, b) => a.source.y - b.source.y);
      }
    }

    // Compute link widths from source side, then compute offsets
    for (const node of nodes) {
      const outTotal = node.sourceLinks.reduce((s, l) => s + l.value, 0);
      let sy = 0;
      for (const link of node.sourceLinks) {
        link.width = outTotal > 0 ? (link.value / outTotal) * node.height : 0;
        link.sy = sy;
        sy += link.width;
      }
    }

    // Compute target-side offsets using the already-set link widths
    for (const node of nodes) {
      let ty = 0;
      for (const link of node.targetLinks) {
        link.ty = ty;
        ty += link.width;
      }
    }
  }

  /** Group nodes by depth column */
  private getColumns(nodes: SankeyNode[]): SankeyNode[][] {
    const maxDepth = Math.max(...nodes.map(n => n.depth), 0);
    const columns: SankeyNode[][] = Array.from({ length: maxDepth + 1 }, () => []);
    for (const node of nodes) {
      columns[node.depth].push(node);
    }
    return columns;
  }

  /** Weighted average center of connected nodes */
  private weightedCenter(node: SankeyNode, direction: 'source' | 'target'): number {
    const links = direction === 'target' ? node.targetLinks : node.sourceLinks;
    let sumWeightedY = 0;
    let sumWeight = 0;

    for (const link of links) {
      const other = direction === 'target' ? link.source : link.target;
      const center = this.nodeCenter(other);
      sumWeightedY += center * link.value;
      sumWeight += link.value;
    }

    return sumWeight > 0 ? sumWeightedY / sumWeight : this.nodeCenter(node);
  }

  /** Vertical center of a node */
  private nodeCenter(node: SankeyNode): number {
    return node.y + node.height / 2;
  }

  /** Resolve vertical overlaps within a column */
  private resolveCollisions(column: SankeyNode[]): void {
    const { padding, height, nodePadding } = this.config;
    const innerBottom = height - padding.bottom;

    // Sort by y position
    column.sort((a, b) => a.y - b.y);

    // Push down overlapping nodes
    let y = padding.top;
    for (const node of column) {
      const dy = y - node.y;
      if (dy > 0) node.y += dy;
      y = node.y + node.height + nodePadding;
    }

    // Push up from bottom if needed
    const last = column[column.length - 1];
    let overflow = last.y + last.height - innerBottom;
    if (overflow > 0) {
      last.y -= overflow;
      for (let i = column.length - 2; i >= 0; i--) {
        overflow = column[i].y + column[i].height + nodePadding - column[i + 1].y;
        if (overflow > 0) {
          column[i].y -= overflow;
        }
      }
    }
  }
}
