/**
 * S4WN Babylon.js/TypeScript - Entity Detail Panel
 *
 * Persistent bottom-left panel showing detailed info and actions for a
 * selected building or unit.
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

    this.panel = document.createElement('div');
    this.panel.id = 'entity-detail-panel';
    this.panel.style.cssText = `
      position: fixed;
      bottom: 12px;
      left: 295px;
      width: 280px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      background: rgba(30, 18, 10, 0.94);
      border: 3px solid #5d4037;
      border-radius: 10px;
      padding: 14px;
      color: #f4e4bc;
      font-family: 'Georgia', serif;
      font-size: 0.9rem;
      z-index: 900;
      pointer-events: auto;
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
    const idx = index;
    const econ = this._gameApp?.gameLoop?.economy;
    const b = econ?.getBuilding?.(idx);
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
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="font-weight:bold; font-size:1.1rem;">${name} <span style="opacity:0.75; font-size:0.8rem;">#${idx}</span></div>
        <button id="entity-detail-close" style="background:transparent; border:none; color:#f4e4bc; font-size:1.4rem; cursor:pointer;">×</button>
      </div>
      <div style="margin-top:6px;">
        <div>Status: <strong>${status}</strong></div>
        <div>Owner: Player ${b.ownerId}</div>
      </div>
      <div style="margin-top:8px;">
        <div style="display:flex; justify-content:space-between;"><span>HP</span><span>${b.hp}/${b.maxHp}</span></div>
        <div style="height:6px; background:#3e2723; border-radius:3px; overflow:hidden; margin-top:3px;">
          <div style="width:${hpPct}%; background:${hpColor}; height:100%;"></div>
        </div>
      </div>
      ${b.constructionProgress < 1.0 ? `
      <div style="margin-top:8px;">
        <div style="display:flex; justify-content:space-between;"><span>Construction</span><span>${Math.floor((b.constructionProgress || 0) * 100)}%</span></div>
        <div style="height:6px; background:#3e2723; border-radius:3px; overflow:hidden; margin-top:3px;">
          <div style="width:${Math.floor((b.constructionProgress || 0) * 100)}%; background:#4fc3f7; height:100%;"></div>
        </div>
      </div>` : ''}
      <div style="margin-top:10px; display:flex; gap:10px;">
        <div style="flex:1;">
          <div style="color:#d7ccc8; font-size:0.8rem; margin-bottom:2px;">Input</div>
          ${inputHtml || '<div style="opacity:0.6;">—</div>'}
        </div>
        <div style="flex:1;">
          <div style="color:#d7ccc8; font-size:0.8rem; margin-bottom:2px;">Output</div>
          ${outputHtml || '<div style="opacity:0.6;">—</div>'}
        </div>
      </div>
      <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:6px;">
        <button id="entity-toggle-pause" class="entity-action-btn">${b.isActive ? '⏸️ Pause' : '▶️ Resume'}</button>
        <button id="entity-destroy" class="entity-action-btn" style="background:#7f1d1d;">💥 Destroy</button>
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
      return `<button class="entity-action-btn garrison-eject" data-unit-id="${unitId}">🪖 Remove #${unitId}</button>`;
    }).join('');
    return `<div style="width:100%; margin-top:6px; display:flex; flex-direction:column; gap:4px;"><div style="color:#d7ccc8; font-size:0.8rem;">Garrison</div>${buttons}</div>`;
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
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="font-weight:bold; font-size:1.1rem;">${kindName} <span style="opacity:0.75; font-size:0.8rem;">#${id}</span></div>
        <button id="entity-detail-close" style="background:transparent; border:none; color:#f4e4bc; font-size:1.4rem; cursor:pointer;">×</button>
      </div>
      <div style="margin-top:6px;">
        <div>Status: <strong>${stateName}</strong></div>
        <div>Owner: Player ${unit.ownerId ?? 0}</div>
      </div>
      <div style="margin-top:8px;">
        <div style="display:flex; justify-content:space-between;"><span>HP</span><span>${unit.hp.toFixed(0)}/${unit.getMaxHp?.() ?? unit.hp}</span></div>
        <div style="height:6px; background:#3e2723; border-radius:3px; overflow:hidden; margin-top:3px;">
          <div style="width:${hpPct}%; background:${hpColor}; height:100%;"></div>
        </div>
      </div>
      ${cargoHtml}
      <div style="margin-top:8px; font-size:0.8rem; opacity:0.8;">
        ${unit.targetX !== null ? `Target: (${unit.targetX}, ${unit.targetY ?? '?'})` : ''}
        ${unit.assignedBuilding !== null ? `Assigned: Building #${unit.assignedBuilding}` : ''}
        ${unit.garrisonBuildingIndex !== null ? `Garrison: Building #${unit.garrisonBuildingIndex}` : ''}
      </div>
      <div style="margin-top:10px;">
        <button id="entity-unit-action" class="entity-action-btn">🎯 Assign / Move</button>
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