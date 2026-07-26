/**
 * S4WN Babylon.js/TypeScript - Entity Info Tooltip
 *
 * Floating tooltip that follows the mouse cursor on hover over buildings/units.
 */

export class EntityInfoTooltip {
  private el: HTMLElement;
  private container: HTMLElement;

  constructor(container: HTMLElement = document.body) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'entity-tooltip hidden';
    this.el.style.position = 'fixed';
    this.el.style.pointerEvents = 'none';
    this.el.style.zIndex = '999';
    this.el.style.maxWidth = '260px';
    this.el.style.fontFamily = "'Georgia', serif";
    this.el.style.fontSize = '0.85rem';
    this.el.style.lineHeight = '1.35';
    this.el.style.background = 'rgba(20, 12, 8, 0.92)';
    this.el.style.color = '#f4e4bc';
    this.el.style.border = '2px solid #8b5a2b';
    this.el.style.borderRadius = '6px';
    this.el.style.padding = '8px 10px';
    this.el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
    this.container.appendChild(this.el);
  }

  show(html: string, x: number, y: number): void {
    this.el.innerHTML = html;
    this.el.classList.remove('hidden');
    // Keep tooltip on screen
    const rect = this.el.getBoundingClientRect();
    const left = Math.min(x + 14, window.innerWidth - rect.width - 10);
    const top = Math.min(y + 14, window.innerHeight - rect.height - 10);
    this.el.style.left = `${Math.max(6, left)}px`;
    this.el.style.top = `${Math.max(6, top)}px`;
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }
}