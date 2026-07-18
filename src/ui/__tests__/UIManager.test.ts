/**
 * @jest-environment jsdom
 */

import { UIManager } from '../UIManager';

describe('UIManager', () => {
  beforeEach(() => {
    // Reset singleton instance if we have one
    (UIManager as any).instance = null;
    
    // Clear document
    document.body.innerHTML = `
      <div id="ui-overlay"></div>
      <div id="fade-layer"></div>
    `;
    
    new UIManager();
  });

  it('should render main menu initially', () => {
    const mainMenu = document.querySelector('.main-menu-screen') as HTMLElement;
    expect(mainMenu).not.toBeNull();
    // main menu will have active class or not depending on timing, but splash screen is active initially.
  });

  it('should show nation selection on new game click', () => {
    const newGameBtn = document.querySelector('#btn-new-game') as HTMLButtonElement;
    expect(newGameBtn).not.toBeNull();
    
    newGameBtn.click();
    
    // The nation selection screen should become active
    const nationScreens = document.querySelectorAll('.main-menu-screen');
    const nationSelection = Array.from(nationScreens).find(el => el.innerHTML.includes('Select Your Nation')) as HTMLElement;
    expect(nationSelection).not.toBeUndefined();
    expect(nationSelection.classList.contains('active')).toBe(true);
  });

  it('should dispatch game-start with nation when a nation is clicked', () => {
    const newGameBtn = document.querySelector('#btn-new-game') as HTMLButtonElement;
    newGameBtn.click();
    
    let eventDispatched = false;
    let dispatchedNation = -1;
    let dispatchedMode = '';
    
    window.addEventListener('game-start', (e: Event) => {
      eventDispatched = true;
      const detail = (e as CustomEvent).detail;
      dispatchedMode = detail.mode;
      dispatchedNation = detail.nation;
    }, { once: true });
    
    const nationBtn = document.querySelector('.menu-button[data-nation="1"]') as HTMLButtonElement;
    expect(nationBtn).not.toBeNull();
    nationBtn.click();
    
    expect(eventDispatched).toBe(true);
    expect(dispatchedMode).toBe('new');
    expect(dispatchedNation).toBe(1);
  });

  it('marks tutorial finished and returns to main menu on tutorial-complete', () => {
    new UIManager();
    let exitDispatched = false;
    window.addEventListener('game-exit', () => { exitDispatched = true; }, { once: true });

    // Simulate tutorial completion
    window.dispatchEvent(new CustomEvent('tutorial-complete'));

    expect(exitDispatched).toBe(true);
    expect(UIManager.isTutorialFinished()).toBe(true);

    // Main menu should be visible again
    const mainMenu = document.querySelector('.main-menu-screen') as HTMLElement;
    expect(mainMenu.classList.contains('active')).toBe(true);
  });

  it('returnToMenu dispatches game-exit and shows main menu', () => {
    const ui = new UIManager();
    let exitDispatched = false;
    window.addEventListener('game-exit', () => { exitDispatched = true; }, { once: true });

    ui.returnToMenu();

    expect(exitDispatched).toBe(true);
    const mainMenu = document.querySelector('.main-menu-screen') as HTMLElement;
    expect(mainMenu.classList.contains('active')).toBe(true);
  });
});
