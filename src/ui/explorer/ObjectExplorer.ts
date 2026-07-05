/**
 * S4WN Babylon.js/TypeScript - Object Explorer
 * 
 * A side panel UI for inspecting game objects (units, buildings, etc.)
 */

import { UIManager } from '../UIManager';

export interface ExplorerObject {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
}

export class ObjectExplorer {
  private container: HTMLElement;
  private listElement!: HTMLElement;
  private detailsElement!: HTMLElement;
  private isOpen: boolean = false;

  constructor(_uiManager: UIManager) {
    this.container = document.createElement('div');
    this.container.className = 'ui-screen explorer-panel hidden';
    
    this.init();
  }

  private init(): void {
    this.container.innerHTML = `
      <div class="explorer-container">
        <div class="explorer-header">
          <span class="explorer-title">Object Explorer</span>
          <button class="explorer-close">&times;</button>
        </div>
        <div class="explorer-content">
          <div class="explorer-list-section">
            <div class="explorer-list-header">Objects</div>
            <div class="explorer-list" id="explorer-list"></div>
          </div>
          <div class="explorer-details-section">
            <div class="explorer-details-header">Details</div>
            <div class="explorer-details" id="explorer-details">
              <div class="explorer-empty-msg">Select an object to inspect</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.listElement = this.container.querySelector('#explorer-list') as HTMLElement;
    this.detailsElement = this.container.querySelector('#explorer-details') as HTMLElement;

    this.container.querySelector('.explorer-close')?.addEventListener('click', () => this.hide());
    
    // Add to the main UI overlay
    const overlay = document.getElementById('ui-overlay');
    if (overlay) {
      overlay.appendChild(this.container);
    }
  }

  public show(): void {
    this.container.classList.remove('hidden');
    this.container.classList.add('active');
    this.isOpen = true;
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.container.classList.remove('active');
    this.isOpen = false;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Updates the list of objects in the explorer.
   */
  public updateList(objects: ExplorerObject[]): void {
    this.listElement.innerHTML = '';
    
    objects.forEach(obj => {
      const item = document.createElement('div');
      item.className = 'explorer-item';
      item.innerHTML = `
        <span class="explorer-item-type">[${obj.type}]</span>
        <span class="explorer-item-name">${obj.name}</span>
      `;
      item.addEventListener('click', () => this.showDetails(obj));
      this.listElement.appendChild(item);
    });
  }

  private showDetails(obj: ExplorerObject): void {
    this.detailsElement.innerHTML = `
      <div class="explorer-detail-item"><strong>ID:</strong> ${obj.id}</div>
      <div class="explorer-detail-item"><strong>Type:</strong> ${obj.type}</div>
      <div class="explorer-detail-item"><strong>Name:</strong> ${obj.name}</div>
      <hr class="explorer-divider" />
      <div class="explorer-properties">
        ${Object.entries(obj.properties).map(([key, val]) => `
          <div class="explorer-prop-row">
            <span class="prop-key">${key}:</span>
            <span class="prop-val">${JSON.stringify(val)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}