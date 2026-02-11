import type { SankeyGraph, SankeyConfig, SankeyNode, SankeyLink } from '../types/index.js';
import { PathGenerator } from '../layout/path.js';
import { GradientManager } from './gradient.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Transition shorthand applied via inline style (CSP-safe)
const TRANSITION_FAST = 'fill-opacity 0.3s ease, filter 0.3s ease, opacity 0.3s ease';

/**
 * CSP-safe SVG renderer — no <style> tags, no @keyframes.
 * All styling via inline style attributes and JS-driven fade-in.
 */
export class SankeyRenderer {
  private svg!: SVGSVGElement;
  private defs!: SVGDefsElement;
  private linksGroup!: SVGGElement;
  private nodesGroup!: SVGGElement;
  private labelsGroup!: SVGGElement;
  private gradients!: GradientManager;
  private config: SankeyConfig;
  private container: HTMLElement;
  private animationFrame: number | null = null;

  constructor(container: HTMLElement, config: SankeyConfig) {
    this.container = container;
    this.config = config;
    this.createSVG();
  }

  private createSVG(): void {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('width', String(this.config.width));
    this.svg.setAttribute('height', String(this.config.height));
    this.svg.setAttribute('class', 'sankey-chart');
    this.svg.style.overflow = 'visible';

    this.defs = document.createElementNS(SVG_NS, 'defs');
    this.svg.appendChild(this.defs);

    this.linksGroup = document.createElementNS(SVG_NS, 'g');
    this.linksGroup.setAttribute('class', 'sankey-links');
    this.svg.appendChild(this.linksGroup);

    this.nodesGroup = document.createElementNS(SVG_NS, 'g');
    this.nodesGroup.setAttribute('class', 'sankey-nodes');
    this.svg.appendChild(this.nodesGroup);

    this.labelsGroup = document.createElementNS(SVG_NS, 'g');
    this.labelsGroup.setAttribute('class', 'sankey-labels');
    this.svg.appendChild(this.labelsGroup);

    this.gradients = new GradientManager(this.defs);
    this.gradients.ensureFilters();
    this.container.appendChild(this.svg);
  }

  render(graph: SankeyGraph): void {
    this.cancelAnimation();
    this.clear();
    this.renderLinks(graph.links);
    this.renderNodes(graph.nodes);
    this.renderLabels(graph.nodes);
    this.animateEntrance();
  }

  resize(width: number, height: number): void {
    this.svg.setAttribute('width', String(width));
    this.svg.setAttribute('height', String(height));
  }

  getSVG(): SVGSVGElement { return this.svg; }
  getNodesGroup(): SVGGElement { return this.nodesGroup; }
  getLinksGroup(): SVGGElement { return this.linksGroup; }

  destroy(): void {
    this.cancelAnimation();
    this.svg.remove();
  }

  private clear(): void {
    this.gradients.clear();
    for (const g of [this.linksGroup, this.nodesGroup, this.labelsGroup]) {
      while (g.firstChild) g.removeChild(g.firstChild);
    }
  }

  // ─── JS-driven staggered fade-in (no @keyframes needed) ──────────

  private animateEntrance(): void {
    // Collect all elements that need to animate in
    const entries: Array<{ el: SVGElement | HTMLElement; delay: number }> = [];

    const links = Array.from(this.linksGroup.children) as SVGElement[];
    links.forEach((el, i) => {
      el.style.opacity = '0';
      entries.push({ el, delay: 100 + i * 25 });
    });

    const nodes = Array.from(this.nodesGroup.children) as SVGElement[];
    nodes.forEach((el, i) => {
      el.style.opacity = '0';
      entries.push({ el, delay: i * 35 });
    });

    const labels = Array.from(this.labelsGroup.children) as SVGElement[];
    labels.forEach((el, i) => {
      el.style.opacity = '0';
      entries.push({ el, delay: 50 + i * 35 });
    });

    // Use a single rAF loop to stagger reveals
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      let allDone = true;
      for (const entry of entries) {
        if (elapsed >= entry.delay) {
          if (entry.el.style.opacity === '0') {
            entry.el.style.transition = 'opacity 0.4s ease';
            entry.el.style.opacity = '1';
          }
        } else {
          allDone = false;
        }
      }
      if (!allDone) {
        this.animationFrame = requestAnimationFrame(tick);
      } else {
        this.animationFrame = null;
      }
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private cancelAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // ─── Links ────────────────────────────────────────────────────────

  private renderLinks(links: SankeyLink[]): void {
    for (const link of links) {
      const path = document.createElementNS(SVG_NS, 'path');

      path.setAttribute('d', PathGenerator.linkArea(link));
      path.setAttribute('data-link-id', `${link.source.id}→${link.target.id}`);
      path.setAttribute('data-source', link.source.id);
      path.setAttribute('data-target', link.target.id);
      path.setAttribute('fill', `url(#${this.gradients.getGradientId(link)})`);
      path.setAttribute('fill-opacity', String(this.config.linkOpacity));
      path.setAttribute('stroke', 'none');
      path.style.transition = TRANSITION_FAST;
      path.style.cursor = 'pointer';

      this.linksGroup.appendChild(path);
    }
  }

  // ─── Nodes ────────────────────────────────────────────────────────

  private renderNodes(nodes: SankeyNode[]): void {
    for (const node of nodes) {
      const h = Math.max(2, node.height);
      const color = node.color || '#888';
      const rx = Math.min(3, h / 2, node.width / 2);

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('data-node-id', node.id);
      rect.setAttribute('x', String(node.x));
      rect.setAttribute('y', String(node.y));
      rect.setAttribute('width', String(node.width));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', String(rx));
      rect.setAttribute('ry', String(rx));
      rect.setAttribute('fill', `url(#${this.gradients.getNodeGradientId(node.id, color)})`);
      rect.setAttribute('filter', 'url(#sankey-node-shadow)');
      rect.style.transition = TRANSITION_FAST;
      rect.style.cursor = this.config.draggable ? 'grab' : 'pointer';

      this.nodesGroup.appendChild(rect);
    }
  }

  // ─── Labels ───────────────────────────────────────────────────────

  private renderLabels(nodes: SankeyNode[]): void {
    const maxDepth = Math.max(...nodes.map(n => n.depth), 0);

    for (const node of nodes) {
      const labelText = this.config.nodeLabel
        ? this.config.nodeLabel(node)
        : node.label;

      const isRight = node.depth < maxDepth;
      const gap = 8;
      const labelX = isRight
        ? node.x + node.width + gap
        : node.x - gap;
      const anchor = isRight ? 'start' : 'end';
      const centerY = node.y + node.height / 2;

      const inflow = node.targetLinks.reduce((s, l) => s + l.value, 0);
      const outflow = node.sourceLinks.reduce((s, l) => s + l.value, 0);
      const isSource = node.targetLinks.length === 0;
      const isSink = node.sourceLinks.length === 0;
      const displayValue = isSource ? outflow : inflow;

      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'sankey-label-group');
      g.style.pointerEvents = 'none';
      g.style.transition = 'opacity 0.3s ease';

      const nameEl = this.makeText(labelX, anchor, '#d4d4e0', 12, '600', node.id);
      const valueEl = this.makeText(labelX, anchor, '#7a7a96', 11, '400', node.id);
      valueEl.textContent = this.formatNumber(displayValue);

      if (node.height >= 28) {
        nameEl.setAttribute('y', String(centerY - 4));
        nameEl.textContent = labelText;
        valueEl.setAttribute('y', String(centerY + 11));
      } else {
        nameEl.setAttribute('y', String(centerY));
        nameEl.setAttribute('dy', '0.35em');
        nameEl.textContent = `${labelText}  ${this.formatNumber(displayValue)}`;
        valueEl.style.display = 'none';
      }

      g.appendChild(nameEl);
      g.appendChild(valueEl);

      if (node.height >= 44 && !isSource && !isSink && inflow > 0) {
        const pct = Math.round((outflow / inflow) * 100);
        const badgeW = pct === 100 ? 32 : 26;
        const badgeH = 13;

        const pill = document.createElementNS(SVG_NS, 'rect');
        pill.setAttribute('x', String(node.x + node.width / 2 - badgeW / 2));
        pill.setAttribute('y', String(centerY - badgeH / 2));
        pill.setAttribute('width', String(badgeW));
        pill.setAttribute('height', String(badgeH));
        pill.setAttribute('rx', '6');
        pill.setAttribute('fill', 'rgba(0,0,0,0.4)');
        g.appendChild(pill);

        const pctEl = this.makeText(node.x + node.width / 2, 'middle', '#e0e0ea', 9, '600');
        pctEl.setAttribute('y', String(centerY));
        pctEl.setAttribute('dy', '0.35em');
        pctEl.textContent = `${pct}%`;
        g.appendChild(pctEl);
      }

      this.labelsGroup.appendChild(g);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private makeText(x: number, anchor: string, fill: string, size: number, weight: string, nodeId?: string): SVGTextElement {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('text-anchor', anchor);
    text.setAttribute('fill', fill);
    text.setAttribute('font-size', String(size));
    text.setAttribute('font-weight', weight);
    text.setAttribute('font-family', 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif');
    text.style.pointerEvents = 'none';
    text.style.userSelect = 'none';
    if (nodeId) text.setAttribute('data-node-id', nodeId);
    return text;
  }

  private formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }
}
