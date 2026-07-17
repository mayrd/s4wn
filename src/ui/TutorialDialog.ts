export class TutorialDialog {
    private container: HTMLElement;
    private textElement: HTMLElement;

    constructor(private document: Document = globalThis.document) {
        this.container = this.document.createElement('div');
        this.container.id = 'tutorial-dialog';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '140px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.color = '#fff';
        this.container.style.padding = '20px';
        this.container.style.borderRadius = '8px';
        this.container.style.fontFamily = 'Georgia, serif';
        this.container.style.fontSize = '18px';
        this.container.style.zIndex = '1000';
        this.container.style.display = 'none';

        this.textElement = this.document.createElement('p');
        this.textElement.style.margin = '0';
        this.container.appendChild(this.textElement);

        this.document.body.appendChild(this.container);
    }

    public show(text: string): void {
        this.textElement.textContent = text;
        this.container.style.display = 'block';
    }

    public hide(): void {
        this.container.style.display = 'none';
    }

    public dispose(): void {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
}
