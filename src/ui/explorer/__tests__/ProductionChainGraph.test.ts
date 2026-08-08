/**
 * ProductionChainGraph unit tests.
 *
 * @jest-environment jsdom
 */
import { ProductionChainGraph } from '../ProductionChainGraph';

describe('ProductionChainGraph', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('stores a node click callback via onNodeClick', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const graph = new ProductionChainGraph(container);
    const callback = jest.fn();
    graph.onNodeClick('resource.wood', callback);
    // If the callback was stored, invoking it through the graph's stored
    // handler should deliver the node. We trigger the svg node click which
    // the render() implementation wires to the stored callback.
    graph.setData([
      {
        id: 'resource.wood',
        name: 'Wood',
        type: 'resource',
        position: { x: 0, y: 0 },
        data: {},
      },
    ]);
    graph.render();
    const svg = container.querySelector('svg');
    const node = svg?.querySelector('[data-prod-node="resource.wood"]');
    expect(node).toBeTruthy();
    (node as HTMLElement).dispatchEvent(new Event('click'));
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resource.wood', name: 'Wood' })
    );
  });

  it('does not throw when no callback is registered', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const graph = new ProductionChainGraph(container);
    graph.setData([
      {
        id: 'building.sawmill',
        name: 'Sawmill',
        type: 'building',
        position: { x: 10, y: 10 },
        data: {},
      },
    ]);
    expect(() => graph.render()).not.toThrow();
  });
});