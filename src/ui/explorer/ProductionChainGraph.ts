// Module: ProductionChainGraph

// Interactive production chain visualizer using DAG layout
class ProductionChainGraph {
  private container: HTMLElement;
  private nodes: Map<string, ProductionNode> = new Map();
  private links: ProductionLink[] = [];
  private svg: SVGSVGElement | null = null;
  private nodeClickCallbacks: Map<string, (node: ProductionNode) => void> = new Map();
  private currentData: ProductionNode[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.initSVG();
  }

  private initSVG(): void {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";
    this.container.appendChild(this.svg);
  }

  public loadEconomyData(_economy: any): void {
    // Parse building types and production chains from Economy
    // Clear existing
    this.nodes.clear();
    this.links = [];
    // Build DAG from economy.productionChains or similar
    // This is a placeholder - actual implementation will read from Economy module
  }

  public setData(nodes: ProductionNode[]): void {
    this.currentData = nodes;
    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
  }

  public render(): void {
    if (!this.svg) return;
    // Clear any existing rendered content
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    for (const node of this.currentData) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-prod-node", node.id);
      g.setAttribute("transform", `translate(${node.position.x}, ${node.position.y})`);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "120");
      rect.setAttribute("height", "40");
      rect.setAttribute("rx", "6");
      const fill = node.type === "building" ? "#d4a95c" : "#7cb57c";
      rect.setAttribute("fill", fill);
      g.appendChild(rect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "60");
      text.setAttribute("y", "24");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#1a1a1a");
      text.textContent = node.name;
      g.appendChild(text);

      // Wire the click handler if a callback was registered for this node id
      const callback = this.nodeClickCallbacks.get(node.id);
      if (callback) {
        g.style.cursor = "pointer";
        g.addEventListener("click", () => callback(node));
      }

      this.svg.appendChild(g);
    }

    // Draw links as SVG lines (simple DAG edges)
    for (const link of this.links) {
      const source = this.nodes.get(link.source);
      const target = this.nodes.get(link.target);
      if (!source || !target) continue;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(source.position.x + 60));
      line.setAttribute("y1", String(source.position.y + 40));
      line.setAttribute("x2", String(target.position.x + 60));
      line.setAttribute("y2", String(target.position.y));
      line.setAttribute("stroke", "#8b6b3d");
      line.setAttribute("stroke-width", String(1 + link.throughput));
      this.svg.appendChild(line);
    }
  }

  public onNodeClick(nodeId: string, callback: (node: ProductionNode) => void): void {
    // Store the callback keyed by node id; render() wires it to the SVG node.
    this.nodeClickCallbacks.set(nodeId, callback);
  }
}

interface ProductionNode {
  id: string;
  name: string;
  type: "building" | "resource";
  position: { x: number; y: number };
  data: any;
}

interface ProductionLink {
  source: string;
  target: string;
  throughput: number;
}

export { ProductionChainGraph };
export type { ProductionNode, ProductionLink };