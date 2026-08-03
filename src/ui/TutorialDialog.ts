/**
 * S4WN Tutorial Dialog — Visual tutorial prompt with pulsing highlights.
 *
 * Enhanced with:
 * - Pulsing highlight effect for targeted UI elements
 * - Arrow pointer overlay
 * - Auto-dismiss on step completion
 */

export class TutorialDialog {
  private container: HTMLElement;
  private textElement: HTMLElement;
  private highlightElement: HTMLElement | null = null;
  private arrowElement: HTMLElement | null = null;
  private pulseAnimation: number | null = null;

  constructor(private document: Document = globalThis.document) {
    this.container = this.document.createElement('div');
    this.container.id = 'tutorial-dialog';
    this.container.style.position = 'absolute';
    this.container.style.bottom = '140px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.container.style.color = '#fff';
    this.container.style.padding = '18px 24px';
    this.container.style.borderRadius = '10px';
    this.container.style.fontFamily = 'Georgia, serif';
    this.container.style.fontSize = '17px';
    this.container.style.lineHeight = '1.5';
    this.container.style.zIndex = '1000';
    this.container.style.display = 'none';
    this.container.style.maxWidth = '520px';
    this.container.style.textAlign = 'center';
    this.container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
    this.container.style.border = '2px solid #8B6914';

    this.textElement = this.document.createElement('p');
    this.textElement.style.margin = '0';
    this.container.appendChild(this.textElement);

    this.document.body.appendChild(this.container);

    // Create highlight overlay element (hidden by default)
    this.highlightElement = this.document.createElement('div');
    this.highlightElement.id = 'tutorial-highlight';
    this.highlightElement.style.position = 'absolute';
    this.highlightElement.style.zIndex = '999';
    this.highlightElement.style.pointerEvents = 'none';
    this.highlightElement.style.display = 'none';
    this.highlightElement.style.border = '3px solid #FFD700';
    this.highlightElement.style.borderRadius = '8px';
    this.highlightElement.style.boxShadow = '0 0 15px 5px rgba(255, 215, 0, 0.7)';
    this.document.body.appendChild(this.highlightElement);

    // Create arrow pointer (hidden by default)
    this.arrowElement = this.document.createElement('div');
    this.arrowElement.id = 'tutorial-arrow';
    this.arrowElement.style.position = 'absolute';
    this.arrowElement.style.zIndex = '1001';
    this.arrowElement.style.pointerEvents = 'none';
    this.arrowElement.style.display = 'none';
    this.arrowElement.style.width = '0';
    this.arrowElement.style.height = '0';
    this.arrowElement.style.borderLeft = '12px solid transparent';
    this.arrowElement.style.borderRight = '12px solid transparent';
    this.arrowElement.style.borderBottom = '18px solid #FFD700';
    this.document.body.appendChild(this.arrowElement);

    // Start pulse animation loop
    this.startPulseLoop();
  }

  /** Start the continuous pulsing animation for the highlight box. */
  private startPulseLoop(): void {
    let phase = 0;
    const animate = () => {
      if (this.highlightElement && this.highlightElement.style.display !== 'none') {
        phase += 0.05;
        const alpha = 0.5 + 0.5 * Math.sin(phase);
        const glow = 8 + 7 * Math.sin(phase);
        this.highlightElement.style.boxShadow = `0 0 ${glow}px ${5 + 5 * Math.sin(phase)}px rgba(255, 215, 0, ${0.4 + 0.4 * alpha})`;
        this.highlightElement.style.borderColor = `rgba(255, 215, 0, ${0.6 + 0.4 * alpha})`;
      }
      this.pulseAnimation = requestAnimationFrame(animate);
    };
    this.pulseAnimation = requestAnimationFrame(animate);
  }

  /**
   * Highlight a target DOM element with a pulsing gold border.
   * @param selector - CSS selector for the element to highlight
   * @param arrowSide - optional side for arrow pointer ('top', 'bottom', 'left', 'right')
   */
  public highlightElement(selector: string, arrowSide?: 'top' | 'bottom' | 'left' | 'right'): void {
    if (!this.highlightElement || !this.arrowElement) return;

    const target = this.document.querySelector(selector) as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const pad = 6;

    this.highlightElement.style.display = 'block';
    this.highlightElement.style.top = `${rect.top - pad}px`;
    this.highlightElement.style.left = `${rect.left - pad}px`;
    this.highlightElement.style.width = `${rect.width + pad * 2}px`;
    this.highlightElement.style.height = `${rect.height + pad * 2}px`;

    if (arrowSide) {
      this.arrowElement.style.display = 'block';
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      switch (arrowSide) {
        case 'top':
          this.arrowElement.style.top = `${rect.top - 22}px`;
          this.arrowElement.style.left = `${cx - 12}px`;
          this.arrowElement.style.borderBottom = '18px solid #FFD700';
          this.arrowElement.style.borderLeft = '12px solid transparent';
          this.arrowElement.style.borderRight = '12px solid transparent';
          this.arrowElement.style.borderTop = '0';
          break;
        case 'bottom':
          this.arrowElement.style.bottom = `${window.innerHeight - rect.bottom - 22}px`;
          this.arrowElement.style.left = `${cx - 12}px`;
          this.arrowElement.style.borderTop = '18px solid #FFD700';
          this.arrowElement.style.borderLeft = '12px solid transparent';
          this.arrowElement.style.borderRight = '12px solid transparent';
          this.arrowElement.style.borderBottom = '0';
          break;
        case 'left':
          this.arrowElement.style.top = `${cy - 12}px`;
          this.arrowElement.style.left = `${rect.left - 26}px`;
          this.arrowElement.style.borderRight = '18px solid #FFD700';
          this.arrowElement.style.borderTop = '12px solid transparent';
          this.arrowElement.style.borderBottom = '12px solid transparent';
          this.arrowElement.style.borderLeft = '0';
          break;
        case 'right':
          this.arrowElement.style.top = `${cy - 12}px`;
          this.arrowElement.style.right = `${window.innerWidth - rect.right - 26}px`;
          this.arrowElement.style.borderLeft = '18px solid #FFD700';
          this.arrowElement.style.borderTop = '12px solid transparent';
          this.arrowElement.style.borderBottom = '12px solid transparent';
          this.arrowElement.style.borderRight = '0';
          break;
      }
    } else {
      this.arrowElement.style.display = 'none';
    }
  }

  /** Remove the highlight and arrow overlays. */
  public clearHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.style.display = 'none';
    }
    if (this.arrowElement) {
      this.arrowElement.style.display = 'none';
    }
  }

  /**
   * Smoothly pan the camera to a target map position.
   * @param camera - The Babylon.js ArcRotateCamera
   * @param targetX - Map X coordinate
   * @param targetZ - Map Z coordinate (y in map coords)
   * @param duration - Animation duration in seconds (default 1.2s)
   */
  public static panCamera(camera: any, targetX: number, targetZ: number, duration = 1.2): void {
    if (!camera || !camera.setTarget) return;
    const start = { x: camera.target.x, z: camera.target.z };
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / (duration * 1000));
      // Ease in-out
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const x = start.x + (targetX - start.x) * ease;
      const z = start.z + (targetZ - start.z) * ease;
      camera.setTarget(new (window as any).BABYLON.Vector3(x, 0, z));
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  public show(text: string): void {
    this.textElement.textContent = text;
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.style.display = 'none';
    this.clearHighlight();
  }

  public dispose(): void {
    this.hide();
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    if (this.highlightElement?.parentElement) {
      this.highlightElement.parentElement.removeChild(this.highlightElement);
    }
    if (this.arrowElement?.parentElement) {
      this.arrowElement.parentElement.removeChild(this.arrowElement);
    }
    if (this.pulseAnimation !== null) {
      cancelAnimationFrame(this.pulseAnimation);
    }
  }
}