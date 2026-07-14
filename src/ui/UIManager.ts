/**
 * S4WN Babylon.js/TypeScript - UI Manager (Light Bootstrap)
 *
 * Manages the splash screen and main menu ONLY. This module is intentionally
 * lightweight: it must not import Babylon.js or any heavy game module so that
 * the initial page load (splash → main menu) stays fast.
 *
 * Heavy game initialization (Babylon engine, map, terrain, units, buildings)
 * happens later in GameApp, lazily, when the user actually starts or loads a
 * game. The splash screen is reused to bridge that heavier load if needed.
 */

import { ObjectExplorer } from './explorer/ObjectExplorer';
import { SaveManager } from '../core/SaveManager';
import { checkCapabilities, CapabilityResult } from '../core/CapabilityChecker';

export type StartMode = 'new' | 'load' | 'tutorial';

export class UIManager {
  private static instance: UIManager | null = null;
  private overlay: HTMLElement;
  private splashScreen!: HTMLElement;
  private mainMenu!: HTMLElement;
  public objectExplorer: ObjectExplorer;
  private gameLoop: GameLoop | null = null;
  /** Set when the user opens the Map Editor from the menu before a game is running. */
  private pendingEditorOpen = false;

  constructor(gameLoop?: GameLoop) {
    // Singleton: reuse the first-created instance so duplicate DOM elements
    // (with duplicate IDs) are never appended to the overlay.
    if (UIManager.instance) {
      this.overlay = UIManager.instance.overlay;
      this.splashScreen = UIManager.instance.splashScreen;
      this.mainMenu = UIManager.instance.mainMenu;
      this.gameLoop = gameLoop ?? UIManager.instance.gameLoop;
      UIManager.instance.gameLoop = this.gameLoop;
      // Share the objectExplorer reference
      this.objectExplorer = UIManager.instance.objectExplorer;
      // If we received a GameLoop now, connect it to enable live data
      if (gameLoop) {
        this.objectExplorer.connectGame(gameLoop);
      }
      return;
    }
    UIManager.instance = this;

    this.gameLoop = gameLoop ?? null;
    this.overlay = document.getElementById('ui-overlay')!;
    // ObjectExplorer works standalone (no GameLoop required) — shows static catalog.
    // It will be connected to live game data when a GameLoop becomes available.
    this.objectExplorer = new ObjectExplorer();
    if (this.gameLoop) {
      this.objectExplorer.connectGame(this.gameLoop);
    }
    this.init();
  }

  private init(): void {
    this.createSplashScreen();
    this.createMainMenu();
    this.showSplashScreen();
    // Fade in from black once the splash screen is visible.
    requestAnimationFrame(() => {
      const fade = document.getElementById('fade-layer');
      if (fade) fade.classList.add('clear');
    });
    this.runBootChecks();
  }

  /**
   * Fundamental, light checks that run on the splash screen.
   * No map, no engine, no textures are loaded here — only verification that
   * the browser/device can run the game.
   */
  private runBootChecks(): void {
    const result: CapabilityResult = checkCapabilities();

    // Surface non-fatal warnings on the splash screen.
    if (result.warnings.length > 0) {
      this.appendSplashNote(result.warnings.join(' '), 'warn');
    }

    if (!result.ok) {
      // Fatal: never show the menu, display the errors instead.
      this.showFatalError(result.errors);
      return;
    }

    // Capable — transition to the main menu after a brief splash.
    setTimeout(() => {
      this.showMainMenu();
    }, 2000);
  }

   private createSplashScreen(): void {
     this.splashScreen = document.createElement('div');
     this.splashScreen.className = 'ui-screen splash-screen active';
     this.splashScreen.innerHTML = `
       <div class="splash-loading">Checking your system...</div>
       <div class="splash-progress"><div class="splash-progress-bar"></div></div>
       <div class="splash-note"></div>
     `;
     this.overlay.appendChild(this.splashScreen);
   }

  private appendSplashNote(text: string, kind: 'warn' | 'error' = 'warn'): void {
    const note = this.splashScreen.querySelector('.splash-note') as HTMLElement | null;
    if (note) {
      note.classList.add(kind);
      note.textContent = text;
    }
  }

  private showFatalError(errors: string[]): void {
    const loading = this.splashScreen.querySelector('.splash-loading') as HTMLElement | null;
    if (loading) {
      loading.textContent = 'Cannot start S4WN';
    }
    this.appendSplashNote(errors.join(' '), 'error');
  }

  private createMainMenu(): void {
    this.mainMenu = document.createElement('div');
    this.mainMenu.className = 'ui-screen main-menu-screen';
    this.mainMenu.innerHTML = `
      <div class="main-menu-container">
        <img class="menu-logo" src="/images/logo-1024.png" alt="S4WN" />
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
    this.mainMenu.querySelector('#btn-new-game')?.addEventListener('click', () => this.startGame('new'));
    this.mainMenu.querySelector('#btn-tutorial')?.addEventListener('click', () => this.startGame('tutorial'));
    this.mainMenu.querySelector('#btn-load-game')?.addEventListener('click', () => this.loadGame());
    this.mainMenu.querySelector('#btn-explorer')?.addEventListener('click', () => this.toggleExplorer());
    this.mainMenu.querySelector('#btn-editor')?.addEventListener('click', () => this.toggleEditor());
    this.mainMenu.querySelector('#btn-multiplayer')?.addEventListener('click', () => this.startGame('new'));

    // Disable load button if no save exists
    if (!SaveManager.hasSave()) {
      const loadBtn = this.mainMenu.querySelector('#btn-load-game') as HTMLButtonElement;
      if (loadBtn) loadBtn.disabled = true;
    }
  }

  public showSplashScreen(): void {
    this.hideAll();
    this.splashScreen.classList.add('active');
  }

  /**
   * Re-show the splash screen to bridge the (heavy) game initialization.
   * Used by main.ts between the menu click and the engine being ready.
   */
  public showLoading(text: string = 'Loading the world...'): void {
    this.hideAll();
    const loading = this.splashScreen.querySelector('.splash-loading') as HTMLElement | null;
    if (loading) loading.textContent = text;
    const note = this.splashScreen.querySelector('.splash-note') as HTMLElement | null;
    if (note) note.textContent = '';
    this.splashScreen.classList.add('active');
  }

  public showMainMenu(): void {
    this.hideAll();
    this.mainMenu.classList.add('active');
  }

  public startGame(mode: StartMode = 'new'): void {
    this.hideAll();
    window.dispatchEvent(new CustomEvent('game-start', { detail: { mode } }));
  }

  public loadGame(): void {
    // Actual loading is performed by GameApp once it is constructed.
    this.startGame('load');
  }

  public saveGame(): boolean {
    return this.gameLoop ? this.gameLoop.save() : false;
  }

  /**
   * Toggle the Object Explorer. Works standalone (no game required) to show
   * the static asset catalog. If a game is running, also shows live runtime data.
   */
  public toggleExplorer(): void {
    // ObjectExplorer works standalone — no need to start a game to open it
    this.objectExplorer.toggle();
  }

  /** Toggle the in-game Map Editor (only available once a game runs). */
  public toggleEditor(): void {
    if (this.gameLoop) {
      window.dispatchEvent(new CustomEvent('ui-editor-toggle'));
    } else {
      this.pendingEditorOpen = true;
      this.startGame('new');
    }
  }

  /**
   * Called by the bootstrap (main.ts) once the heavy GameApp has been
   * constructed. Opens any panel the user requested from the menu before the
   * game had started (e.g. Map Editor).
   */
  public onGameReady(): void {
    if (this.pendingEditorOpen) {
      this.pendingEditorOpen = false;
      window.dispatchEvent(new CustomEvent('ui-editor-toggle'));
    }
  }

  public hideAll(): void {
    this.splashScreen.classList.remove('active');
    this.mainMenu.classList.remove('active');
  }

  /**
   * Update the loading progress bar and message.
   * Called by GameApp during heavy asset loading.
   */
  public updateProgress(message: string, percent: number): void {
    const loading = this.splashScreen.querySelector('.splash-loading') as HTMLElement | null;
    if (loading) loading.textContent = message;
    
    const progressBar = this.splashScreen.querySelector('.splash-progress-bar') as HTMLElement | null;
    if (progressBar) {
      progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }
}

// Forward type import for the optional GameLoop parameter
type GameLoop = import('../game/GameLoop').GameLoop;