import type {
  SankeyNode, SankeyLink, SankeyGraph, SankeyConfig,
  SankeyEventName, SankeyEventHandler, SankeyEvents,
} from '../types/index.js';

/**
 * Manages mouse events on SVG nodes and links.
 */
export class EventManager {
  private listeners = new Map<SankeyEventName, Set<SankeyEventHandler<any>>>();
  private nodesGroup: SVGGElement;
  private linksGroup: SVGGElement;
  private graph: SankeyGraph | null = null;
  private config: SankeyConfig;
  private boundHandlers: Array<{ el: Element; event: string; handler: EventListener }> = [];

  constructor(nodesGroup: SVGGElement, linksGroup: SVGGElement, config: SankeyConfig) {
    this.nodesGroup = nodesGroup;
    this.linksGroup = linksGroup;
    this.config = config;
  }

  /** Register a graph and bind events to its SVG elements */
  bind(graph: SankeyGraph): void {
    this.unbind();
    this.graph = graph;

    // Build lookup maps
    const nodeMap = new Map<string, SankeyNode>();
    for (const node of graph.nodes) nodeMap.set(node.id, node);

    const linkMap = new Map<string, SankeyLink>();
    for (const link of graph.links) {
      linkMap.set(`${link.source.id}→${link.target.id}`, link);
    }

    // Bind node events
    for (const rect of Array.from(this.nodesGroup.children)) {
      const nodeId = rect.getAttribute('data-node-id');
      if (!nodeId) continue;
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      this.addListener(rect, 'mouseenter', (e) =>
        this.emit('node:hover', { node, event: e as MouseEvent }));
      this.addListener(rect, 'mouseleave', (e) =>
        this.emit('node:leave', { node, event: e as MouseEvent }));
      this.addListener(rect, 'click', (e) =>
        this.emit('node:click', { node, event: e as MouseEvent }));

      if (this.config.draggable) {
        this.bindDrag(rect as SVGRectElement, node);
      }
    }

    // Bind link events
    for (const path of Array.from(this.linksGroup.children)) {
      const linkId = path.getAttribute('data-link-id');
      if (!linkId) continue;
      const link = linkMap.get(linkId);
      if (!link) continue;

      this.addListener(path, 'mouseenter', (e) =>
        this.emit('link:hover', { link, event: e as MouseEvent }));
      this.addListener(path, 'mouseleave', (e) =>
        this.emit('link:leave', { link, event: e as MouseEvent }));
      this.addListener(path, 'click', (e) =>
        this.emit('link:click', { link, event: e as MouseEvent }));
    }
  }

  /** Remove all event listeners */
  unbind(): void {
    for (const { el, event, handler } of this.boundHandlers) {
      el.removeEventListener(event, handler);
    }
    this.boundHandlers = [];
    this.graph = null;
  }

  /** Subscribe to an event */
  on<K extends SankeyEventName>(event: K, handler: SankeyEventHandler<K>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /** Unsubscribe from an event */
  off<K extends SankeyEventName>(event: K, handler: SankeyEventHandler<K>): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit<K extends SankeyEventName>(event: K, data: SankeyEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) handler(data);
    }
  }

  private addListener(el: Element, event: string, handler: EventListener): void {
    el.addEventListener(event, handler);
    this.boundHandlers.push({ el, event, handler });
  }

  private bindDrag(rect: SVGRectElement, node: SankeyNode): void {
    let startY = 0;
    let startNodeY = 0;
    let dragging = false;

    const onMouseDown = (e: Event) => {
      const me = e as MouseEvent;
      dragging = true;
      startY = me.clientY;
      startNodeY = node.y;
      rect.style.cursor = 'grabbing';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      me.preventDefault();
    };

    const onMouseMove = (e: Event) => {
      if (!dragging) return;
      const me = e as MouseEvent;
      const dy = me.clientY - startY;
      node.y = startNodeY + dy;
      rect.setAttribute('y', String(node.y));
      this.emit('node:drag', { node, dx: 0, dy });
    };

    const onMouseUp = () => {
      dragging = false;
      rect.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.addListener(rect, 'mousedown', onMouseDown);
  }
}
