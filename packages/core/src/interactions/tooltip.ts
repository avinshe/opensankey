import type { SankeyNode, SankeyLink, SankeyConfig } from '../types/index.js';

/**
 * Premium frosted-glass tooltip with color swatches and formatted data.
 */
export class TooltipManager {
  private tooltip: HTMLDivElement;
  private config: SankeyConfig;

  constructor(container: HTMLElement, config: SankeyConfig) {
    this.config = config;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'sankey-tooltip';
    Object.assign(this.tooltip.style, {
      position: 'absolute',
      pointerEvents: 'none',
      background: 'rgba(15, 15, 30, 0.88)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      color: '#f0f0f5',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)',
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      lineHeight: '1.5',
      maxWidth: '280px',
      zIndex: '10000',
      opacity: '0',
      transform: 'translateY(4px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      whiteSpace: 'nowrap',
    });
    container.style.position = 'relative';
    container.appendChild(this.tooltip);
  }

  showNode(node: SankeyNode, event: MouseEvent): void {
    if (!this.config.tooltips) return;

    if (this.config.nodeTooltip) {
      this.show(this.config.nodeTooltip(node), event);
      return;
    }

    const inflow = node.targetLinks.reduce((s, l) => s + l.value, 0);
    const outflow = node.sourceLinks.reduce((s, l) => s + l.value, 0);
    const isSource = node.targetLinks.length === 0;
    const isSink = node.sourceLinks.length === 0;

    let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">`;
    html += `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${this.escapeHtml(node.color || '#888')};flex-shrink:0;"></span>`;
    html += `<strong style="font-size:14px;">${this.escapeHtml(node.label)}</strong>`;
    html += `</div>`;

    html += `<div style="color:#aab;font-size:12px;">`;
    html += `<div>Total: <span style="color:#fff;font-weight:600;">${this.formatNumber(node.value)}</span></div>`;

    if (!isSource) {
      html += `<div>Inflow: ${this.formatNumber(inflow)}</div>`;
    }
    if (!isSink) {
      html += `<div>Outflow: ${this.formatNumber(outflow)}</div>`;
    }
    if (!isSource && !isSink && inflow > 0) {
      const dropPct = ((inflow - outflow) / inflow * 100).toFixed(1);
      html += `<div style="color:${Number(dropPct) > 50 ? '#ff7b7b' : '#7bdfff'};">Drop-off: ${dropPct}%</div>`;
    }
    html += `</div>`;

    this.show(html, event);
  }

  showLink(link: SankeyLink, event: MouseEvent): void {
    if (!this.config.tooltips) return;

    if (this.config.linkTooltip) {
      this.show(this.config.linkTooltip(link), event);
      return;
    }

    let html = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">`;
    html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${this.escapeHtml(link.source.color || '#888')};"></span>`;
    html += `<span style="color:#aab;">\u2192</span>`;
    html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${this.escapeHtml(link.target.color || '#888')};"></span>`;
    html += `</div>`;
    html += `<strong>${this.escapeHtml(link.source.label)} \u2192 ${this.escapeHtml(link.target.label)}</strong><br/>`;
    html += `<span style="color:#aab;font-size:12px;">Flow: </span><span style="font-weight:600;">${this.formatNumber(link.value)}</span>`;

    // Show percentage of source
    const sourceTotal = link.source.sourceLinks.reduce((s, l) => s + l.value, 0);
    if (sourceTotal > 0) {
      const pct = ((link.value / sourceTotal) * 100).toFixed(1);
      html += `<span style="color:#aab;font-size:12px;"> (${pct}% of ${this.escapeHtml(link.source.label)})</span>`;
    }

    this.show(html, event);
  }

  hide(): void {
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transform = 'translateY(4px)';
  }

  destroy(): void {
    this.tooltip.remove();
  }

  private show(html: string, event: MouseEvent): void {
    this.tooltip.innerHTML = html;
    this.tooltip.style.opacity = '1';
    this.tooltip.style.transform = 'translateY(0)';

    const container = this.tooltip.parentElement!;
    const rect = container.getBoundingClientRect();
    let left = event.clientX - rect.left + 16;
    let top = event.clientY - rect.top - 12;

    const ttRect = this.tooltip.getBoundingClientRect();
    if (left + ttRect.width > rect.width) {
      left = event.clientX - rect.left - ttRect.width - 16;
    }
    if (top + ttRect.height > rect.height) {
      top = rect.height - ttRect.height;
    }
    if (top < 0) top = 4;

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatNumber(n: number): string {
    return n.toLocaleString();
  }
}
