/**
 * S4WN Babylon.js/TypeScript - UI Manager
 * 
 * Manages the game's UI overlays, including the splash screen and main menu.
 */

import { ObjectExplorer } from './explorer/ObjectExplorer';
import { GameLoop } from '../game/GameLoop';

export class UIManager {
  private overlay: HTMLElement;
  private splashScreen!: HTMLElement;
  private mainMenu!: HTMLElement;
  private objectExplorer: ObjectExplorer;
  private gameLoop: GameLoop;

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
    this.overlay = document.getElementById('ui-overlay')!;
    this.objectExplorer = new ObjectExplorer(this, gameLoop);
    this.init();
  }

  private init(): void {
    this.createSplashScreen();
    this.createMainMenu();
    this.showSplashScreen();
  }

  private createSplashScreen(): void {
    this.splashScreen = document.createElement('div');
    this.splashScreen.className = 'ui-screen splash-screen active';
    this.splashScreen.innerHTML = `
      <div>
        <div class="splash-logo">S4WN</div>
        <div class="splash-loading">Loading the world...</div>
      </div>
    `;
    this.overlay.appendChild(this.splashScreen);

    // Transition to main menu after 3 seconds
    setTimeout(() => {
      this.showMainMenu();
    }, 3000);
  }

  private createMainMenu(): void {
    this.mainMenu = document.createElement('div');
    this.mainMenu.className = 'ui-screen';
    this.mainMenu.innerHTML = `
      <div class="main-menu-container">
        <div class="menu-title">S4WN</div>
        <button class="menu-button" id="btn-tutorial">Start Tutorial</button>
        <button class="menu-button" id="btn-new-game">Start New Game</button>
        <button class="menu-button" id="btn-load-game">Load Game</button>
        <button class="menu-button secondary" id="btn-explorer">Object Explorer</button>
        <button class="menu-button secondary" id="btn-editor">Map Editor</button>
        <button class="menu-button secondary" id="btn-multiplayer">Multiplayer</button>
      </div>
    `;
    this.overlay.appendChild(this.mainMenu);

    // Attach event listeners
    this.mainMenu.querySelector('#btn-new-game')?.addEventListener('click', () => this.startGame());
    this.mainMenu.querySelector('#btn-tutorial')?.addEventListener('click', () => this.startGame());
    this.mainMenu.querySelector('#btn-load-game')?.addEventListener('click', () => this.loadGame());
    this.mainMenu.querySelector('#btn-explorer')?.addEventListener('click', () => this.objectExplorer.toggle());
    this.mainMenu.querySelector('#btn-editor')?.addEventListener('click', () => this.startGame());
    this.mainMenu.querySelector('#btn-multiplayer')?.addEventListener('click', () => this.startGame());

    // Disable load button if no save exists
    if (!this.gameLoop.hasSave()) {
      const loadBtn = this.mainMenu.querySelector('#btn-load-game') as HTMLButtonElement;
      if (loadBtn) loadBtn.disabled = true;
    }
  }

  public showSplashScreen(): void {
    this.hideAll();
    this.splashScreen.classList.add('active');
  }

  public showMainMenu(): void {
    this.hideAll();
    this.mainMenu.classList.add('active');
  }

  public startGame(): void {
    this.hideAll();
    window.dispatchEvent(new CustomEvent('game-start'));
  }

  public loadGame(): void {
    if (this.gameLoop.load()) {
      this.hideAll();
      window.dispatchEvent(new CustomEvent('game-start'));
    } else {
      alert('No saved game found.');
    }
  }

  public saveGame(): boolean {
    return this.gameLoop.save();
  }

  public toggleExplorer(): void {
    this.objectExplorer.toggle();
  }

  private hideAll(): void {
    this.splashScreen.classList.remove('active');
    this.mainMenu.classList.remove('active');
  }
}