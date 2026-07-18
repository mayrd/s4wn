import { GameApp } from '../GameApp';
import { UIManager } from '../ui/UIManager';
import { TutorialDialog } from '../ui/TutorialDialog';

export interface TutorialStep {
  id: string;
  narrative: string;
  onStart: (app: GameApp, ui: UIManager) => void;
  isComplete: (app: GameApp) => boolean;
}

export class TutorialManager {
  private app: GameApp;
  private ui: UIManager;
  private dialog: TutorialDialog;
  
  private steps: TutorialStep[] = [];
  private currentStepIndex: number = 0;
  private isActive: boolean = false;

  constructor(app: GameApp, ui: UIManager, dialog: TutorialDialog) {
    this.app = app;
    this.ui = ui;
    this.dialog = dialog;
  }

  setSteps(steps: TutorialStep[]): void {
    this.steps = steps;
  }

  /** Whether the tutorial is currently running. */
  get active(): boolean {
    return this.isActive;
  }

  /** The id of the currently active step, or null if inactive. */
  get currentStepId(): string | null {
    if (!this.isActive || this.currentStepIndex >= this.steps.length) return null;
    return this.steps[this.currentStepIndex].id;
  }

  /** Total number of steps in the tutorial. */
  get totalSteps(): number {
    return this.steps.length;
  }

  /** 1-based index of the current step (for UI display), or 0 if inactive. */
  get currentStepNumber(): number {
    return this.isActive ? this.currentStepIndex + 1 : 0;
  }

  start(): void {
    if (this.steps.length === 0) return;
    this.isActive = true;
    this.currentStepIndex = 0;
    this.executeCurrentStep();
    this.emitProgress();
  }

  /** Restart the tutorial from the first step. */
  reset(): void {
    if (this.steps.length === 0) return;
    this.isActive = true;
    this.currentStepIndex = 0;
    this.executeCurrentStep();
    this.emitProgress();
  }

  /** Skip the entire tutorial and mark it as finished. */
  skip(): void {
    if (!this.isActive) return;
    this.complete();
  }

  private emitProgress(): void {
    window.dispatchEvent(new CustomEvent('tutorial-progress', {
      detail: {
        stepIndex: this.currentStepIndex,
        stepId: this.currentStepId,
        stepNumber: this.currentStepNumber,
        totalSteps: this.totalSteps,
      },
    }));
  }

  private executeCurrentStep(): void {
    if (!this.isActive || this.currentStepIndex >= this.steps.length) return;
    
    const step = this.steps[this.currentStepIndex];
    this.dialog.show(step.narrative);
    step.onStart(this.app, this.ui);
  }

  update(): void {
    if (!this.isActive) return;
    if (this.currentStepIndex >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.currentStepIndex];
    if (step.isComplete(this.app)) {
      this.nextStep();
    }
  }

  nextStep(): void {
    this.currentStepIndex++;
    if (this.currentStepIndex < this.steps.length) {
      this.executeCurrentStep();
      this.emitProgress();
    } else {
      this.complete();
    }
  }

  complete(): void {
    this.isActive = false;
    this.dialog.hide();
    
    // Dispatch an event so UIManager can listen for completion
    window.dispatchEvent(new CustomEvent('tutorial-complete'));
  }
}
