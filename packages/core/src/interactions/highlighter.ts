import type { SankeyNode, SankeyLink, SankeyConfig } from '../types/index.js';

/**
 * Handles path highlighting on hover with glow effects.
 */
export class Highlighter {
  private linksGroup: SVGGElement;
  private nodesGroup: SVGGElement;
  private labelsGroup: SVGGElement | null;
  private config: SankeyConfig;

  constructor(linksGroup: SVGGElement, nodesGroup: SVGGElement, config: SankeyConfig) {
    this.linksGroup = linksGroup;
    this.nodesGroup = nodesGroup;
    this.labelsGroup = nodesGroup.parentElement?.querySelector('.sankey-labels') as SVGGElement | null;
    this.config = config;
  }

  highlightNode(node: SankeyNode): void {
    if (this.config.highlightMode === 'none') return;

    const connectedLinks = new Set<string>();
    const connectedNodes = new Set<string>();
    connectedNodes.add(node.id);

    if (this.config.highlightMode === 'forward' || this.config.highlightMode === 'both') {
      this.collectForward(node, connectedLinks, connectedNodes);
    }
    if (this.config.highlightMode === 'backward' || this.config.highlightMode === 'both') {
      this.collectBackward(node, connectedLinks, connectedNodes);
    }

    this.applyHighlight(connectedLinks, connectedNodes);
  }

  highlightLink(link: SankeyLink): void {
    if (this.config.highlightMode === 'none') return;

    const connectedLinks = new Set<string>();
    const connectedNodes = new Set<string>();

    connectedLinks.add(`${link.source.id}→${link.target.id}`);
    connectedNodes.add(link.source.id);
    connectedNodes.add(link.target.id);

    this.applyHighlight(connectedLinks, connectedNodes);
  }

  reset(): void {
    for (const path of Array.from(this.linksGroup.children)) {
      const el = path as SVGElement;
      el.setAttribute('fill-opacity', String(this.config.linkOpacity));
      el.removeAttribute('filter');
    }
    for (const rect of Array.from(this.nodesGroup.children)) {
      const el = rect as SVGElement;
      el.setAttribute('opacity', '1');
      el.setAttribute('filter', 'url(#sankey-node-shadow)');
    }
    if (this.labelsGroup) {
      for (const g of Array.from(this.labelsGroup.children)) {
        (g as SVGElement).setAttribute('opacity', '1');
      }
    }
  }

  private collectForward(node: SankeyNode, links: Set<string>, nodes: Set<string>): void {
    for (const link of node.sourceLinks) {
      const id = `${link.source.id}→${link.target.id}`;
      if (links.has(id)) continue;
      links.add(id);
      nodes.add(link.target.id);
      this.collectForward(link.target, links, nodes);
    }
  }

  private collectBackward(node: SankeyNode, links: Set<string>, nodes: Set<string>): void {
    for (const link of node.targetLinks) {
      const id = `${link.source.id}→${link.target.id}`;
      if (links.has(id)) continue;
      links.add(id);
      nodes.add(link.source.id);
      this.collectBackward(link.source, links, nodes);
    }
  }

  private applyHighlight(connectedLinks: Set<string>, connectedNodes: Set<string>): void {
    for (const path of Array.from(this.linksGroup.children)) {
      const el = path as SVGElement;
      const linkId = el.getAttribute('data-link-id') || '';
      if (connectedLinks.has(linkId)) {
        el.setAttribute('fill-opacity', String(this.config.linkHighlightOpacity));
        el.setAttribute('filter', 'url(#sankey-link-glow)');
      } else {
        el.setAttribute('fill-opacity', String(this.config.linkDimOpacity));
        el.removeAttribute('filter');
      }
    }

    for (const rect of Array.from(this.nodesGroup.children)) {
      const el = rect as SVGElement;
      const nodeId = el.getAttribute('data-node-id') || '';
      if (connectedNodes.has(nodeId)) {
        el.setAttribute('opacity', '1');
        el.setAttribute('filter', 'url(#sankey-node-glow)');
      } else {
        el.setAttribute('opacity', '0.2');
        el.setAttribute('filter', 'none');
      }
    }

    if (this.labelsGroup) {
      for (const g of Array.from(this.labelsGroup.children)) {
        const texts = (g as Element).querySelectorAll('text');
        const nodeId = texts[0]?.getAttribute('data-node-id') || '';
        (g as SVGElement).setAttribute('opacity', connectedNodes.has(nodeId) ? '1' : '0.12');
      }
    }
  }
}
