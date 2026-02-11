import { describe, it, expect } from 'vitest';
import { SankeyLayout } from '../src/layout/sankey';
import { PathGenerator } from '../src/layout/path';
import { DEFAULT_CONFIG } from '../src/types';
import type { SankeyNode, SankeyLink, SankeyGraph, SankeyConfig } from '../src/types';

function makeNode(id: string, overrides?: Partial<SankeyNode>): SankeyNode {
  return {
    id, label: id, value: 0, depth: 0,
    x: 0, y: 0, width: 0, height: 0,
    sourceLinks: [], targetLinks: [],
    ...overrides,
  };
}

function makeLink(source: SankeyNode, target: SankeyNode, value: number): SankeyLink {
  const link: SankeyLink = { source, target, value, width: 0, sy: 0, ty: 0 };
  source.sourceLinks.push(link);
  target.targetLinks.push(link);
  return link;
}

function makeConfig(overrides?: Partial<SankeyConfig>): SankeyConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('SankeyLayout', () => {
  it('computes depths via BFS from source nodes', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    const links = [makeLink(a, b, 10), makeLink(b, c, 10)];

    const layout = new SankeyLayout(makeConfig());
    layout.compute({ nodes: [a, b, c], links });

    expect(a.depth).toBe(0);
    expect(b.depth).toBe(1);
    expect(c.depth).toBe(2);
  });

  it('handles branching graphs', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    const d = makeNode('D');
    const links = [
      makeLink(a, b, 5),
      makeLink(a, c, 5),
      makeLink(b, d, 5),
      makeLink(c, d, 5),
    ];

    const layout = new SankeyLayout(makeConfig());
    layout.compute({ nodes: [a, b, c, d], links });

    expect(a.depth).toBe(0);
    expect(b.depth).toBe(1);
    expect(c.depth).toBe(1);
    // d is a sink, justify pushes it to max depth
    expect(d.depth).toBe(2);
  });

  it('computes node values as max(inflow, outflow)', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    makeLink(a, b, 10);
    makeLink(b, c, 7);

    const layout = new SankeyLayout(makeConfig());
    layout.compute({ nodes: [a, b, c], links: [...a.sourceLinks, ...b.sourceLinks] });

    expect(a.value).toBe(10); // outflow only
    expect(b.value).toBe(10); // max(10 in, 7 out) = 10
    expect(c.value).toBe(7);  // inflow only
  });

  it('positions nodes horizontally by depth', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    const links = [makeLink(a, b, 10), makeLink(b, c, 10)];
    const config = makeConfig({ width: 800, padding: { top: 20, right: 120, bottom: 20, left: 20 } });

    const layout = new SankeyLayout(config);
    layout.compute({ nodes: [a, b, c], links });

    expect(a.x).toBe(20); // left padding
    expect(b.x).toBeGreaterThan(a.x);
    expect(c.x).toBeGreaterThan(b.x);
    expect(a.width).toBe(config.nodeWidth);
  });

  it('all nodes get positive height', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const links = [makeLink(a, b, 100)];

    const layout = new SankeyLayout(makeConfig());
    layout.compute({ nodes: [a, b], links });

    expect(a.height).toBeGreaterThan(0);
    expect(b.height).toBeGreaterThan(0);
  });

  it('computes link offsets (sy, ty)', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    const l1 = makeLink(a, b, 7);
    const l2 = makeLink(a, c, 3);

    const layout = new SankeyLayout(makeConfig());
    layout.compute({ nodes: [a, b, c], links: [l1, l2] });

    // Source links are sorted by target.y, so order may differ from creation order.
    // First link in sorted order should start at sy=0
    const sorted = [...a.sourceLinks].sort((x, y) => x.sy - y.sy);
    expect(sorted[0].sy).toBe(0);
    // Second link offset = first link width
    expect(sorted[1].sy).toBeCloseTo(sorted[0].width, 5);
    // Link widths should sum to node height
    expect(sorted[0].width + sorted[1].width).toBeCloseTo(a.height, 5);
  });

  it('handles empty graph', () => {
    const layout = new SankeyLayout(makeConfig());
    const graph = layout.compute({ nodes: [], links: [] });
    expect(graph.nodes).toHaveLength(0);
    expect(graph.links).toHaveLength(0);
  });

  it('handles single node', () => {
    const a = makeNode('A');
    a.value = 10;
    const layout = new SankeyLayout(makeConfig());
    layout.compute({ nodes: [a], links: [] });
    expect(a.depth).toBe(0);
  });
});

describe('PathGenerator', () => {
  it('generates a center-line cubic bezier path', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    Object.assign(a, { x: 0, y: 0, width: 20, height: 100 });
    Object.assign(b, { x: 200, y: 50, width: 20, height: 50 });

    const link: SankeyLink = { source: a, target: b, value: 10, width: 20, sy: 0, ty: 0 };
    const d = PathGenerator.linkPath(link);

    expect(d).toMatch(/^M\d/);
    expect(d).toContain('C');
    expect(d).toMatch(/^M20,/); // sourceX = 0 + 20
  });

  it('generates a filled area ribbon path', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    Object.assign(a, { x: 0, y: 0, width: 20, height: 100 });
    Object.assign(b, { x: 200, y: 50, width: 20, height: 50 });

    const link: SankeyLink = { source: a, target: b, value: 10, width: 20, sy: 0, ty: 0 };
    const d = PathGenerator.linkArea(link);

    expect(d).toMatch(/^M20,0/); // starts at source right edge, top of link
    expect(d).toContain('C');     // has bezier curves
    expect(d).toContain('L');     // has line segments connecting top/bottom
    expect(d).toMatch(/Z$/);      // closed path
  });
});
