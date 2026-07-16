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

  start(): void {
    if (this.steps.length === 0) return;
    this.isActive = true;
    this.currentStepIndex = 0;
    this.executeCurrentStep();
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
