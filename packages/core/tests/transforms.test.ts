import { describe, it, expect } from 'vitest';
import { TabularTransform } from '../src/transforms/tabular';
import { JourneyAnalyzer } from '../src/transforms/journey';
import { DEFAULT_CONFIG } from '../src/types';
import type { TabularData, TransformConfig, SankeyConfig } from '../src/types';

const config: SankeyConfig = { ...DEFAULT_CONFIG };
const transformConfig: TransformConfig = {
  sourceField: 'from',
  targetField: 'to',
  valueField: 'count',
};

describe('TabularTransform', () => {
  it('converts basic tabular data to a graph', () => {
    const data: TabularData = {
      rows: [
        { from: 'A', to: 'B', count: 10 },
        { from: 'B', to: 'C', count: 7 },
      ],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.links).toHaveLength(2);
    expect(graph.nodes.map(n => n.id)).toEqual(['A', 'B', 'C']);
  });

  it('aggregates duplicate source→target pairs', () => {
    const data: TabularData = {
      rows: [
        { from: 'A', to: 'B', count: 5 },
        { from: 'A', to: 'B', count: 3 },
        { from: 'A', to: 'B', count: 2 },
      ],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);

    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].value).toBe(10);
  });

  it('skips rows with missing or zero values', () => {
    const data: TabularData = {
      rows: [
        { from: 'A', to: 'B', count: 10 },
        { from: 'B', to: 'C', count: 0 },
        { from: '', to: 'D', count: 5 },
        { from: 'E', to: '', count: 5 },
        { from: 'F', to: 'G', count: -1 },
      ],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);

    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source.id).toBe('A');
  });

  it('wires up sourceLinks and targetLinks references', () => {
    const data: TabularData = {
      rows: [
        { from: 'A', to: 'B', count: 10 },
        { from: 'A', to: 'C', count: 5 },
      ],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);
    const nodeA = graph.nodes.find(n => n.id === 'A')!;
    const nodeB = graph.nodes.find(n => n.id === 'B')!;

    expect(nodeA.sourceLinks).toHaveLength(2);
    expect(nodeA.targetLinks).toHaveLength(0);
    expect(nodeB.targetLinks).toHaveLength(1);
    expect(nodeB.targetLinks[0].source).toBe(nodeA);
  });

  it('assigns colors from the palette', () => {
    const data: TabularData = {
      rows: [{ from: 'A', to: 'B', count: 10 }],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);

    expect(graph.nodes[0].color).toBe(config.colorPalette[0]);
    expect(graph.nodes[1].color).toBe(config.colorPalette[1]);
  });

  it('handles many nodes wrapping palette', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      from: `N${i}`,
      to: `N${i + 1}`,
      count: 1,
    }));

    const graph = TabularTransform.transform({ rows }, transformConfig, config);
    // Should not throw, colors wrap around palette
    expect(graph.nodes.length).toBe(16);
    // Color at index N wraps around palette length
    const paletteLen = config.colorPalette.length;
    expect(graph.nodes[paletteLen].color).toBe(config.colorPalette[0]); // wraps
  });
});

describe('JourneyAnalyzer', () => {
  it('computes metrics for a simple journey', () => {
    const data: TabularData = {
      rows: [
        { from: 'Landing', to: 'Signup', count: 1000 },
        { from: 'Signup', to: 'Checkout', count: 400 },
        { from: 'Checkout', to: 'Purchase', count: 200 },
      ],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);
    // Need to compute node values for journey analysis
    for (const node of graph.nodes) {
      const inSum = node.targetLinks.reduce((s, l) => s + l.value, 0);
      const outSum = node.sourceLinks.reduce((s, l) => s + l.value, 0);
      node.value = Math.max(inSum, outSum);
    }

    const metrics = JourneyAnalyzer.analyze(graph);

    const landing = metrics.find(m => m.nodeId === 'Landing')!;
    expect(landing.isSource).toBe(true);
    expect(landing.outflow).toBe(1000);

    const signup = metrics.find(m => m.nodeId === 'Signup')!;
    expect(signup.inflow).toBe(1000);
    expect(signup.outflow).toBe(400);
    expect(signup.dropOff).toBe(600);
    expect(signup.dropOffRate).toBeCloseTo(0.6);
    expect(signup.conversionRate).toBeCloseTo(0.4);

    const purchase = metrics.find(m => m.nodeId === 'Purchase')!;
    expect(purchase.isSink).toBe(true);
    expect(purchase.inflow).toBe(200);
  });

  it('handles branching journeys', () => {
    const data: TabularData = {
      rows: [
        { from: 'Home', to: 'Products', count: 500 },
        { from: 'Home', to: 'About', count: 300 },
        { from: 'Products', to: 'Cart', count: 200 },
      ],
    };

    const graph = TabularTransform.transform(data, transformConfig, config);
    const metrics = JourneyAnalyzer.analyze(graph);

    const home = metrics.find(m => m.nodeId === 'Home')!;
    expect(home.isSource).toBe(true);
    expect(home.outflow).toBe(800);

    const about = metrics.find(m => m.nodeId === 'About')!;
    expect(about.isSink).toBe(true);
    expect(about.inflow).toBe(300);
  });
});
