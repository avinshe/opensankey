import type { SankeyLink } from '../types/index.js';

/**
 * Generates SVG path data for Sankey links.
 * Uses filled area paths (not stroked center lines) for a more organic, fluid look.
 */
export class PathGenerator {
  /**
   * Generate a filled area path for a link — two cubic beziers forming a ribbon.
   * This creates the "flowing water" look instead of a stroked line.
   */
  static linkArea(link: SankeyLink): string {
    const sourceX = link.source.x + link.source.width;
    const targetX = link.target.x;

    const sy0 = link.source.y + link.sy;
    const sy1 = sy0 + link.width;
    const ty0 = link.target.y + link.ty;
    const ty1 = ty0 + link.width;

    const midX = (sourceX + targetX) / 2;

    // Top edge: source top → target top
    // Bottom edge: target bottom → source bottom (reversed)
    return (
      `M${sourceX},${sy0}` +
      `C${midX},${sy0} ${midX},${ty0} ${targetX},${ty0}` +
      `L${targetX},${ty1}` +
      `C${midX},${ty1} ${midX},${sy1} ${sourceX},${sy1}` +
      `Z`
    );
  }

  /** Legacy center-line path (kept for stroke-based fallback) */
  static linkPath(link: SankeyLink): string {
    const sourceX = link.source.x + link.source.width;
    const sourceY = link.source.y + link.sy + link.width / 2;
    const targetX = link.target.x;
    const targetY = link.target.y + link.ty + link.width / 2;

    const midX = (sourceX + targetX) / 2;

    return (
      `M${sourceX},${sourceY}` +
      `C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
    );
  }
}
