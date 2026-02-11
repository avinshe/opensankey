import { describe, it, expect, beforeEach } from 'vitest';
import { SankeyRenderer } from '../src/render/renderer';
import { SankeyLayout } from '../src/layout/sankey';
import { TabularTransform } from '../src/transforms/tabular';
import { DEFAULT_CONFIG } from '../src/types';
import type { SankeyConfig, TabularData, TransformConfig } from '../src/types';

const config: SankeyConfig = { ...DEFAULT_CONFIG, width: 600, height: 400 };
const transformConfig: TransformConfig = {
  sourceField: 'from',
  targetField: 'to',
  valueField: 'count',
};

function sampleData(): TabularData {
  return {
    rows: [
      { from: 'A', to: 'B', count: 10 },
      { from: 'A', to: 'C', count: 5 },
      { from: 'B', to: 'D', count: 8 },
      { from: 'C', to: 'D', count: 4 },
    ],
  };
}

describe('SankeyRenderer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('creates SVG with correct structure', () => {
    const renderer = new SankeyRenderer(container, config);
    const svg = renderer.getSVG();

    expect(svg.tagName).toBe('svg');
    expect(svg.getAttribute('width')).toBe('600');
    expect(svg.getAttribute('height')).toBe('400');
    expect(svg.querySelector('defs')).toBeTruthy();
    expect(svg.querySelector('.sankey-links')).toBeTruthy();
    expect(svg.querySelector('.sankey-nodes')).toBeTruthy();
    expect(svg.querySelector('.sankey-labels')).toBeTruthy();

    renderer.destroy();
  });

  it('renders nodes as rect elements with data attributes', () => {
    const renderer = new SankeyRenderer(container, config);
    const graph = TabularTransform.transform(sampleData(), transformConfig, config);
    new SankeyLayout(config).compute(graph);
    renderer.render(graph);

    const rects = renderer.getNodesGroup().querySelectorAll('rect');
    expect(rects.length).toBe(4); // A, B, C, D

    const nodeIds = Array.from(rects).map(r => r.getAttribute('data-node-id'));
    expect(nodeIds).toContain('A');
    expect(nodeIds).toContain('B');
    expect(nodeIds).toContain('C');
    expect(nodeIds).toContain('D');

    renderer.destroy();
  });

  it('renders links as filled path elements', () => {
    const renderer = new SankeyRenderer(container, config);
    const graph = TabularTransform.transform(sampleData(), transformConfig, config);
    new SankeyLayout(config).compute(graph);
    renderer.render(graph);

    const paths = renderer.getLinksGroup().querySelectorAll('path');
    expect(paths.length).toBe(4); // A→B, A→C, B→D, C→D

    for (const path of Array.from(paths)) {
      expect(path.getAttribute('d')).toBeTruthy();
      expect(path.getAttribute('data-link-id')).toBeTruthy();
      // Links are now filled ribbons, not stroked
      expect(path.getAttribute('fill')).toMatch(/^url\(#sankey-grad-\d+\)$/);
      expect(path.getAttribute('stroke')).toBe('none');
    }

    renderer.destroy();
  });

  it('renders labels with name and value text elements', () => {
    const renderer = new SankeyRenderer(container, config);
    const graph = TabularTransform.transform(sampleData(), transformConfig, config);
    new SankeyLayout(config).compute(graph);
    renderer.render(graph);

    const svg = renderer.getSVG();
    // Labels are now grouped in <g> elements, each with name + value <text>
    const labelGroups = svg.querySelectorAll('.sankey-labels .sankey-label-group');
    expect(labelGroups.length).toBe(4);

    // Each group has at least a name text
    const allText = svg.querySelectorAll('.sankey-labels text');
    expect(allText.length).toBeGreaterThanOrEqual(4);

    // Check node names appear somewhere in the text content
    const allContent = Array.from(allText).map(t => t.textContent).join(' ');
    expect(allContent).toContain('A');
    expect(allContent).toContain('D');

    renderer.destroy();
  });

  it('defs contain link gradients, node gradients, and filters', () => {
    const renderer = new SankeyRenderer(container, config);
    const graph = TabularTransform.transform(sampleData(), transformConfig, config);
    new SankeyLayout(config).compute(graph);
    renderer.render(graph);

    const defs = renderer.getSVG().querySelector('defs')!;
    const gradients = defs.querySelectorAll('linearGradient');
    // Link gradients + node gradients
    expect(gradients.length).toBeGreaterThanOrEqual(4);

    // Should have filters for shadow, link glow, and node glow
    const filters = defs.querySelectorAll('filter');
    expect(filters.length).toBe(3);

    renderer.destroy();
  });

  it('resize updates SVG dimensions', () => {
    const renderer = new SankeyRenderer(container, config);
    renderer.resize(1000, 700);
    const svg = renderer.getSVG();
    expect(svg.getAttribute('width')).toBe('1000');
    expect(svg.getAttribute('height')).toBe('700');
    renderer.destroy();
  });

  it('destroy removes SVG from DOM', () => {
    const renderer = new SankeyRenderer(container, config);
    expect(container.querySelector('svg')).toBeTruthy();
    renderer.destroy();
    expect(container.querySelector('svg')).toBeFalsy();
  });
});
