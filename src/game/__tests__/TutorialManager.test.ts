/**
 * @jest-environment jsdom
 */

import { TutorialManager, TutorialStep } from '../TutorialManager';
import { GameApp } from '../../GameApp';
import { UIManager } from '../../ui/UIManager';
import { TutorialDialog } from '../../ui/TutorialDialog';

describe('TutorialManager', () => {
  let app: unknown;
  let ui: unknown;
  let dialog: unknown;
  let manager: TutorialManager;

  beforeEach(() => {
    app = {};
    ui = {};
    dialog = {
      show: jest.fn(),
      hide: jest.fn()
    };
    manager = new TutorialManager(app as GameApp, ui as UIManager, dialog as TutorialDialog);
  });

  test('starts tutorial and executes first step', () => {
    const onStart = jest.fn();
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart, isComplete: () => false }
    ]);
    manager.start();
    expect(dialog.show).toHaveBeenCalledWith('Step 1');
    expect(onStart).toHaveBeenCalledWith(app, ui);
  });

  test('update progresses to next step when complete', () => {
    const onStart1 = jest.fn();
    const onStart2 = jest.fn();
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart: onStart1, isComplete: () => true },
      { id: '2', narrative: 'Step 2', onStart: onStart2, isComplete: () => false }
    ]);
    manager.start();
    manager.update(); // Step 1 is complete, should move to 2
    expect(dialog.show).toHaveBeenCalledWith('Step 2');
    expect(onStart2).toHaveBeenCalledWith(app, ui);
  });

  test('completes tutorial', () => {
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart: jest.fn(), isComplete: () => true }
    ]);
    manager.start();
    manager.update(); // Step 1 is complete, end of list
    expect(dialog.hide).toHaveBeenCalled();
  });
});
