/** @jest-environment jsdom */
import { TutorialDialog } from '../ui/TutorialDialog';

describe('TutorialDialog', () => {
    let dialog: TutorialDialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        dialog = new TutorialDialog(document);
    });

    afterEach(() => {
        if (dialog) dialog.dispose();
    });

    test('creates dialog container in DOM', () => {
        const container = document.getElementById('tutorial-dialog');
        expect(container).not.toBeNull();
        expect(container?.style.display).toBe('none');
    });

    test('show() updates text and makes dialog visible', () => {
        dialog.show('Hello Tutorial');
        const container = document.getElementById('tutorial-dialog');
        expect(container?.style.display).toBe('block');
        expect(container?.textContent).toContain('Hello Tutorial');
    });

    test('hide() makes dialog invisible', () => {
        dialog.show('Hello');
        dialog.hide();
        const container = document.getElementById('tutorial-dialog');
        expect(container?.style.display).toBe('none');
    });

    test('dispose() removes from DOM', () => {
        dialog.dispose();
        const container = document.getElementById('tutorial-dialog');
        expect(container).toBeNull();
    });
});
