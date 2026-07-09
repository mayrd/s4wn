/**
 * S4WN View Culler — Skip off-screen entities to improve performance.
 *
 * In a strategy game, units far from the camera don't need full simulation
 * every tick. The view culler determines which positions are "near" the
 * current view center and should be fully processed.
 */

export interface ViewCenter {
  x: number;
  y: number;
}

export class ViewCuller {
  /** Maximum distance from view center to fully simulate a position (map tiles). */
  private _radius: number = 30;

  /** Current view center (updated by camera). */
  private _center: ViewCenter = { x: 0, y: 0 };

  /** Number of ticks between full-simulation passes (no culling). */
  private static readonly FULL_TICK_INTERVAL = 30;

  constructor() {}

  /** Update the view center from the camera position. */
  setCenter(x: number, y: number): void {
    this._center.x = x;
    this._center.y = y;
  }

  setRadius(r: number): void {
    this._radius = Math.max(5, Math.min(200, r));
  }

  get center(): ViewCenter { return this._center; }
  get radius(): number { return this._radius; }

  /** Check if a map position is within the simulation radius. */
  isWithinView(x: number, y: number): boolean {
    const dx = x - this._center.x;
    const dy = y - this._center.y;
    return (dx * dx + dy * dy) <= (this._radius * this._radius);
  }

  /** Check if two ranges overlap for rectangle-based culling. */
  static rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
    return a1 <= b2 && a2 >= b1;
  }

  /** Get axis-aligned bounding box of the view area. */
  getBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    return {
      minX: this._center.x - this._radius,
      minY: this._center.y - this._radius,
      maxX: this._center.x + this._radius,
      maxY: this._center.y + this._radius,
    };
  }

  /** Returns true on a tick where no culling should be applied (full update). */
  isFullTick(tickNumber: number): boolean {
    return tickNumber % ViewCuller.FULL_TICK_INTERVAL === 0;
  }

  /** 
   * Calculate the number of entities that would be culled vs total,
   * for debugging and performance logging.
   */
  static cullStats(
    entities: Array<{ x: number; y: number }>,
    culler: ViewCuller
  ): { total: number; visible: number; culled: number } {
    let visible = 0;
    for (const e of entities) {
      if (culler.isWithinView(e.x, e.y)) visible++;
    }
    return { total: entities.length, visible, culled: entities.length - visible };
  }
}
