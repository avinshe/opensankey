import type { SankeyLink } from '../types/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * SVG gradient and filter definitions for premium rendering.
 */
export class GradientManager {
  private defs: SVGDefsElement;
  private gradientIds = new Map<string, string>();
  private filtersCreated = false;

  constructor(defs: SVGDefsElement) {
    this.defs = defs;
  }

  ensureFilters(): void {
    if (this.filtersCreated) return;
    this.filtersCreated = true;

    // ── Node shadow: subtle ──
    const nodeShadow = this.createFilter('sankey-node-shadow', '-20%', '-20%', '140%', '140%');
    this.appendFilterElements(nodeShadow, [
      this.el('feDropShadow', { dx: '0', dy: '1', stdDeviation: '2', 'flood-color': 'rgba(0,0,0,0.3)', 'flood-opacity': '1' }),
    ]);
    this.defs.appendChild(nodeShadow);

    // ── Link glow: gentle highlight on hover ──
    const linkGlow = this.createFilter('sankey-link-glow', '-10%', '-10%', '120%', '120%');
    this.appendFilterElements(linkGlow, [
      this.el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '1.5', result: 'blur' }),
    ]);
    const glowMerge = document.createElementNS(SVG_NS, 'feMerge');
    for (const input of ['blur', 'SourceGraphic']) {
      const mn = document.createElementNS(SVG_NS, 'feMergeNode');
      mn.setAttribute('in', input);
      glowMerge.appendChild(mn);
    }
    linkGlow.appendChild(glowMerge);
    this.defs.appendChild(linkGlow);

    // ── Node hover glow: subtle brightening ──
    const nodeGlow = this.createFilter('sankey-node-glow', '-30%', '-30%', '160%', '160%');
    this.appendFilterElements(nodeGlow, [
      this.el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3', result: 'blur' }),
    ]);
    const nodeGlowMerge = document.createElementNS(SVG_NS, 'feMerge');
    for (const input of ['blur', 'SourceGraphic']) {
      const mn = document.createElementNS(SVG_NS, 'feMergeNode');
      mn.setAttribute('in', input);
      nodeGlowMerge.appendChild(mn);
    }
    nodeGlow.appendChild(nodeGlowMerge);
    this.defs.appendChild(nodeGlow);
  }

  /** Multi-stop gradient for link with soft edge feathering */
  getGradientId(link: SankeyLink): string {
    const key = `${link.source.id}→${link.target.id}`;
    if (this.gradientIds.has(key)) return this.gradientIds.get(key)!;

    const id = `sankey-grad-${this.gradientIds.size}`;
    const gradient = document.createElementNS(SVG_NS, 'linearGradient');
    gradient.setAttribute('id', id);
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', String(link.source.x + link.source.width));
    gradient.setAttribute('x2', String(link.target.x));
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('y2', '0');

    const srcColor = link.source.color || '#888';
    const tgtColor = link.target.color || '#888';

    // Clean two-stop gradient — no muddy midpoint
    const stops = [
      { offset: '0%', color: srcColor, opacity: '1' },
      { offset: '100%', color: tgtColor, opacity: '1' },
    ];

    for (const { offset, color, opacity } of stops) {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      stop.setAttribute('stop-opacity', opacity);
      gradient.appendChild(stop);
    }

    this.defs.appendChild(gradient);
    this.gradientIds.set(key, id);
    return id;
  }

  /** Node gradient: subtle vertical sheen with glass effect */
  getNodeGradientId(nodeId: string, baseColor: string): string {
    const key = `node-${nodeId}`;
    if (this.gradientIds.has(key)) return this.gradientIds.get(key)!;

    const id = `sankey-node-grad-${this.gradientIds.size}`;
    const gradient = document.createElementNS(SVG_NS, 'linearGradient');
    gradient.setAttribute('id', id);
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0.3');
    gradient.setAttribute('y2', '1');

    const stops = [
      { offset: '0%', color: this.lighten(baseColor, 6), opacity: '1' },
      { offset: '100%', color: this.darken(baseColor, 6), opacity: '0.95' },
    ];

    for (const { offset, color, opacity } of stops) {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      stop.setAttribute('stop-opacity', opacity);
      gradient.appendChild(stop);
    }

    this.defs.appendChild(gradient);
    this.gradientIds.set(key, id);
    return id;
  }

  clear(): void {
    const toRemove: Element[] = [];
    for (const child of Array.from(this.defs.children)) {
      if (child.tagName === 'linearGradient' || child.tagName === 'path') toRemove.push(child);
    }
    for (const el of toRemove) el.remove();
    this.gradientIds.clear();
  }

  private createFilter(id: string, x: string, y: string, w: string, h: string): SVGFilterElement {
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('x', x);
    filter.setAttribute('y', y);
    filter.setAttribute('width', w);
    filter.setAttribute('height', h);
    return filter;
  }

  private el(tag: string, attrs: Record<string, string>): SVGElement {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  private appendFilterElements(filter: SVGFilterElement, elements: SVGElement[]): void {
    for (const el of elements) filter.appendChild(el);
  }

  private parseHex(hex: string): [number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }

  private toHex(r: number, g: number, b: number): string {
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private lighten(hex: string, pct: number): string {
    const [r, g, b] = this.parseHex(hex);
    const amt = Math.round(255 * pct / 100);
    return this.toHex(
      Math.min(255, r + amt),
      Math.min(255, g + amt),
      Math.min(255, b + amt),
    );
  }

  private darken(hex: string, pct: number): string {
    const [r, g, b] = this.parseHex(hex);
    const amt = Math.round(255 * pct / 100);
    return this.toHex(
      Math.max(0, r - amt),
      Math.max(0, g - amt),
      Math.max(0, b - amt),
    );
  }

  private blendColors(hex1: string, hex2: string, t: number): string {
    const [r1, g1, b1] = this.parseHex(hex1);
    const [r2, g2, b2] = this.parseHex(hex2);
    return this.toHex(
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t),
    );
  }
}
