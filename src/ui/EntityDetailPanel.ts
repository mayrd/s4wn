/**
 * S4WN Babylon.js/TypeScript - Entity Detail Panel
 *
 * Panel embedded inside the in-game menu sidebar showing detailed info and
 * actions for the selected building or unit.
 */

import { buildingName, resourceName, garrisonCapacity } from '../economy/types';
import { UnitKind, UnitState } from '../game/types';

export type SelectedEntity = { type: 'building'; index: number } | { type: 'unit'; id: number };

export class EntityDetailPanel {
  private container: HTMLElement;
  private panel: HTMLElement | null = null;
  private selected: SelectedEntity | null = null;

  // Callbacks
  public onTogglePause: ((buildingIndex: number) => void) | null = null;
  public onDestroy: ((buildingIndex: number) => void) | null = null;
  public onUngarrison: ((buildingIndex: number, unitId: number) => void) | null = null;

  constructor(container: HTMLElement = document.getElementById('ui-overlay') || document.body) {
    this.container = container;
  }

  public setGameApp(app: any): void {
    this._gameApp = app;
  }
  private _gameApp: any = null;

  select(entity: SelectedEntity | null): void {
    this.selected = entity;
    this.render();
  }

  getSelected(): SelectedEntity | null {
    return this.selected;
  }

  private render(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }

    if (!this.selected) return;

    // Create as a section inside the in-game sidebar menu
    this.panel = document.createElement('div');
    this.panel.id = 'entity-detail-panel';
    this.panel.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background: rgba(0, 0, 0, 0.25);
      border-top: 2px solid var(--parchment-border);
      color: var(--parchment-bg);
      font-family: 'Georgia', serif;
      font-size: 0.85rem;
      box-sizing: border-box;
    `;

    const entity = this.selected;
    if (entity.type === 'building') {
      this.renderBuilding(this.panel, entity.index);
    } else {
      this.renderUnit(this.panel, entity.id);
    }

    this.container.appendChild(this.panel);
  }

  private renderBuilding(panel: HTMLElement, index: number): void {
    const econ = this._gameApp?.gameLoop?.economy;
    const b = econ?.getBuilding?.(index);
    if (!b) {
      panel.innerHTML = '<div>Building not found</div>';
      return;
    }

    const status = b.constructionProgress < 1.0
      ? 'Under Construction'
      : b.isActive
        ? (b.destructionTimer !== null ? 'Destroying' : 'Producing')
        : 'Idle';

    const name = buildingName(b.kind);

    const inputHtml = (b.inputBuffer || [])
      .map((v: number, i: number) => v > 0 ? `<div>${resourceName(i)}: ${v}</div>` : '')
      .join('');

    const outputHtml = (b.outputBuffer || [])
      .map((v: number, i: number) => v > 0 ? `<div>${resourceName(i)}: ${v}</div>` : '')
      .join('');

    const hpPct = Math.max(0, (b.hp / Math.max(1, b.maxHp)) * 100);
    const hpColor = hpPct > 60 ? '#8bc34a' : hpPct > 30 ? '#ffc107' : '#e53935';

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="font-weight:bold; font-size:1.05rem; color: var(--accent-color);">${name} <span style="opacity:0.7; font-size:0.75rem;">#${index}</span></div>
        <button id="entity-detail-close" style="background:transparent; border:none; color:var(--parchment-border); font-size:1.3rem; cursor:pointer; padding:0 4px;">×</button>
      </div>
      <div style="margin-bottom:6px;">
        <div>Status: <strong style="color: var(--accent-color);">${status}</strong></div>
        <div style="opacity:0.8;">Owner: Player ${b.ownerId}</div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between;"><span>HP</span><span>${b.hp}/${b.maxHp}</span></div>
        <div style="height:6px; background:#3e2723; border-radius:3px; overflow:hidden; margin-top:3px;">
          <div style="width:${hpPct}%; background:${hpColor}; height:100%;"></div>
        </div>
      </div>
      ${b.constructionProgress < 1.0 ? `
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between;"><span>Construction</span><span>${Math.floor((b.constructionProgress || 0) * 100)}%</span></div>
        <div style="height:6px; background:#3e2723; border-radius:3px; overflow:hidden; margin-top:3px;">
          <div style="width:${Math.floor((b.constructionProgress || 0) * 100)}%; background:#4fc3f7; height:100%;"></div>
        </div>
      </div>` : ''}
      <div style="margin-bottom:10px; display:flex; gap:10px;">
        <div style="flex:1;">
          <div style="color:var(--parchment-border); font-size:0.75rem; margin-bottom:2px;">Input</div>
          ${inputHtml || '<div style="opacity:0.6;">—</div>'}
        </div>
        <div style="flex:1;">
          <div style="color:var(--parchment-border); font-size:0.75rem; margin-bottom:2px;">Output</div>
          ${outputHtml || '<div style="opacity:0.6;">—</div>'}
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        <button id="entity-toggle-pause" class="entity-action-btn" style="
          background: var(--wood-dark); border:1px solid var(--parchment-border); border-radius:4px; color:var(--parchment-bg); padding:6px 10px; cursor:pointer; font-family:'Georgia',serif; font-size:0.8rem;">
          ${b.isActive ? '⏸️ Pause' : '▶️ Resume'}
        </button>
        <button id="entity-destroy" class="entity-action-btn" style="
          background:#7f1d1d; border:1px solid #ff8a80; border-radius:4px; color:#fff; padding:6px 10px; cursor:pointer; font-family:'Georgia',serif; font-size:0.8rem;">
          💥 Destroy
        </button>
        ${this.renderGarrisonActions(b)}
      </div>
    `;

    panel.querySelector('#entity-detail-close')?.addEventListener('click', () => this.select(null));

    panel.querySelector('#entity-toggle-pause')?.addEventListener('click', () => {
      this.onTogglePause?.(b.index);
    });

    panel.querySelector('#entity-destroy')?.addEventListener('click', () => {
      if (confirm(`Destroy ${name}?`)) {
        this.onDestroy?.(b.index);
        this.select(null);
      }
    });

    panel.querySelectorAll('.garrison-eject').forEach(btn => {
      btn.addEventListener('click', () => {
        const unitId = parseInt((btn as HTMLElement).dataset.unitId || '0', 10);
        if (unitId) this.onUngarrison?.(b.index, unitId);
      });
    });
  }

  private renderGarrisonActions(b: any): string {
    if (garrisonCapacity(b.kind) <= 0 || !b.garrisonUnitIds || b.garrisonUnitIds.length === 0) {
      return '';
    }
    const buttons = (b.garrisonUnitIds || []).map((unitId: number) => {
      return `<button class="entity-action-btn garrison-eject" data-unit-id="${unitId}" style="
        background: rgba(93,64,55,0.6); border:1px solid var(--parchment-border); border-radius:4px; color:var(--parchment-bg); padding:6px 10px; cursor:pointer; font-family:'Georgia',serif; font-size:0.8rem;">🪖 Remove #${unitId}</button>`;
    }).join('');
    return `<div style="width:100%; margin-top:6px; display:flex; flex-direction:column; gap:4px;"><div style="color:var(--parchment-border); font-size:0.75rem;">Garrison</div>${buttons}</div>`;
  }

  private renderUnit(panel: HTMLElement, id: number): void {
    const units = this._gameApp?.gameLoop?.unitManager?.units || [];
    const unit = units.find((u: any) => u.id === id);
    if (!unit) {
      panel.innerHTML = '<div>Unit not found</div>';
      return;
    }

    const kindName = UnitKind[unit.kind] ?? 'Unit';
    const stateName = UnitState[unit.state] ?? 'Unknown';

    const cargoHtml = unit.carrying
      ? `<div>Carrying: <strong>${unit.carrying.amount}x ${resourceName(unit.carrying.resource)}</strong></div>`
      : '<div>Carrying: <em>Nothing</em></div>';

    const hpPct = Math.max(0, (unit.hp / Math.max(1, unit.getMaxHp?.() || unit.hp)) * 100);
    const hpColor = hpPct > 60 ? '#8bc34a' : hpPct > 30 ? '#ffc107' : '#e53935';

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="font-weight:bold; font-size:1.05rem; color: var(--accent-color);">${kindName} <span style="opacity:0.7; font-size:0.75rem;">#${id}</span></div>
        <button id="entity-detail-close" style="background:transparent; border:none; color:var(--parchment-border); font-size:1.3rem; cursor:pointer; padding:0 4px;">×</button>
      </div>
      <div style="margin-bottom:6px;">
        <div>Status: <strong style="color: var(--accent-color);">${stateName}</strong></div>
        <div style="opacity:0.8;">Owner: Player ${unit.ownerId ?? 0}</div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between;"><span>HP</span><span>${unit.hp.toFixed(0)}/${unit.getMaxHp?.() ?? unit.hp}</span></div>
        <div style="height:6px; background:#3e2723; border-radius:3px; overflow:hidden; margin-top:3px;">
          <div style="width:${hpPct}%; background:${hpColor}; height:100%;"></div>
        </div>
      </div>
      ${cargoHtml}
      <div style="margin-bottom:8px; font-size:0.8rem; opacity:0.9;">
        ${unit.targetX !== null ? `Target: (${unit.targetX}, ${unit.targetY ?? '?'})` : ''}
        ${unit.assignedBuilding !== null ? `Assigned: Building #${unit.assignedBuilding}` : ''}
        ${unit.garrisonBuildingIndex !== null ? `Garrison: Building #${unit.garrisonBuildingIndex}` : ''}
      </div>
      <div style="margin-top:10px;">
        <button id="entity-unit-action" class="entity-action-btn" style="
          background: var(--wood-dark); border:1px solid var(--parchment-border); border-radius:4px; color:var(--parchment-bg); padding:6px 10px; cursor:pointer; font-family:'Georgia',serif; font-size:0.8rem;">
          🎯 Assign / Move
        </button>
      </div>
    `;

    panel.querySelector('#entity-detail-close')?.addEventListener('click', () => this.select(null));
  }

  dispose(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    this.selected = null;
  }
}