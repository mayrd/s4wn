/**
 * S4WN Error Overlay
 *
 * A non-intrusive in-game error overlay that presents critical errors
 * to the user gracefully, offering reload or return to menu options.
 */

export class ErrorOverlay {
  private static instance: ErrorOverlay | null = null;
  private container: HTMLElement | null = null;

  private constructor() {}

  public static getInstance(): ErrorOverlay {
    if (!ErrorOverlay.instance) {
      ErrorOverlay.instance = new ErrorOverlay();
    }
    return ErrorOverlay.instance;
  }

  /**
   * Show the error overlay with a message and optional stack trace.
   */
  public static show(message: string, stackTrace?: string): void {
    const self = ErrorOverlay.getInstance();
    self.createOverlay(message, stackTrace);
  }

  /**
   * Hide and remove the error overlay from the DOM.
   */
  public static hide(): void {
    const self = ErrorOverlay.getInstance();
    if (self.container) {
      self.container.remove();
      self.container = null;
    }
  }

  private createOverlay(message: string, stackTrace?: string): void {
    // Remove existing overlay if any
    const existing = document.querySelector('.error-overlay');
    existing?.remove();

    this.container = document.createElement('div');
    this.container.className = 'error-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ff6b6b;
      font-family: 'Courier New', monospace;
    `;

    const errorBox = document.createElement('div');
    errorBox.className = 'error-overlay-box';
    errorBox.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #ff6b6b;
      border-radius: 8px;
      padding: 30px;
      max-width: 80%;
      max-height: 80%;
      overflow: auto;
    `;

    const title = document.createElement('h1');
    title.className = 'error-overlay-title';
    title.textContent = '🚨 Critical Error';
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #ff6b6b;
      font-size: 1.5rem;
    `;

    const details = document.createElement('div');
    details.className = 'error-overlay-details';
    details.style.cssText = `
      background: #222;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      white-space: pre-wrap;
      font-size: 0.9rem;
      color: #fff;
    `;
    details.textContent = `${message}${stackTrace ? '\n\n' + stackTrace : ''}`;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
    `;

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = '🔄 Reload';
    reloadBtn.style.cssText = `
      background: #5d4037;
      border: 2px solid #d2b48c;
      border-radius: 6px;
      color: #f4e4bc;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 1rem;
    `;
    reloadBtn.onclick = () => location.reload();

    const menuBtn = document.createElement('button');
    menuBtn.textContent = '🏠 Return to Menu';
    menuBtn.style.cssText = `
      background: #5d4037;
      border: 2px solid #d2b48c;
      border-radius: 6px;
      color: #f4e4bc;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 1rem;
    `;
    menuBtn.onclick = () => location.reload();

    buttonContainer.appendChild(reloadBtn);
    buttonContainer.appendChild(menuBtn);

    errorBox.appendChild(title);
    errorBox.appendChild(details);
    errorBox.appendChild(buttonContainer);
    this.container.appendChild(errorBox);

    document.body.appendChild(this.container);
  }
}
