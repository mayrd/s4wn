/**
 * S4WN Babylon.js/TypeScript - Border Post
 *
 * Border posts are placed by Pioneer settlers at territorial boundaries.
 * Each nation has a distinct color-coded post with a pennant flag.
 *
 * Model: assets/models/borderpost_{nation}.obj
 * Nation colors: Roman #CC3333, Viking #3366CC, Mayan #33CC33, Trojan #CC9933, Dark #9933CC
 */

import { NationType } from './Nation';

export interface BorderPostData {
  id: number;
  x: number;
  y: number;
  nationId: number;
  placedBy?: number | null; // Pioneer unit ID that placed it
}

/** OBJ model filename stem for each nation */
export function borderPostModelName(nationId: number): string {
  const names: Record<number, string> = {
    [NationType.Romans]: 'borderpost_roman',
    [NationType.Vikings]: 'borderpost_viking',
    [NationType.Mayans]: 'borderpost_mayan',
    [NationType.Trojans]: 'borderpost_trojan',
    [NationType.DarkTribe]: 'borderpost_dark',
  };
  return names[nationId] ?? 'borderpost_roman';
}

/** Nation color hex for UI display */
export function borderPostColor(nationId: number): string {
  const colors: Record<number, string> = {
    [NationType.Romans]: '#CC3333',
    [NationType.Vikings]: '#3366CC',
    [NationType.Mayans]: '#33CC33',
    [NationType.Trojans]: '#CC9933',
    [NationType.DarkTribe]: '#9933CC',
  };
  return colors[nationId] ?? '#CC3333';
}

/** Nation display name */
export function borderPostNationName(nationId: number): string {
  const names: Record<number, string> = {
    [NationType.Romans]: 'Romans',
    [NationType.Vikings]: 'Vikings',
    [NationType.Mayans]: 'Mayans',
    [NationType.Trojans]: 'Trojans',
    [NationType.DarkTribe]: 'Dark Tribe',
  };
  return names[nationId] ?? 'Unknown';
}

export class BorderPost {
  id: number;
  x: number;
  y: number;
  nationId: number;
  placedBy: number | null;

  constructor(data: BorderPostData) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.nationId = data.nationId;
    this.placedBy = data.placedBy ?? null;
  }

  getModelName(): string {
    return borderPostModelName(this.nationId);
  }

  getColor(): string {
    return borderPostColor(this.nationId);
  }

  getNationName(): string {
    return borderPostNationName(this.nationId);
  }
}

/** Manager for border post entities placed on the map */
export class BorderPostManager {
  posts: BorderPost[] = [];
  private nextId: number = 1;

  /** Get all border posts (optionally filter by nation) */
  getPosts(nationId?: number): BorderPost[] {
    if (nationId !== undefined) {
      return this.posts.filter(p => p.nationId === nationId);
    }
    return [...this.posts];
  }

  /**
   * Place a border post at (x, y) for a nation.
   * Returns the new post or null if one already exists at that tile.
   */
  placePost(x: number, y: number, nationId: number, pioneerUnitId: number | null = null): BorderPost | null {
    // Don't place duplicates at the same tile
    const existing = this.posts.find(p => p.x === x && p.y === y);
    if (existing) return null;

    const post = new BorderPost({
      id: this.nextId++,
      x: Math.floor(x),
      y: Math.floor(y),
      nationId,
      placedBy: pioneerUnitId,
    });
    this.posts.push(post);
    return post;
  }

  /** Remove all border posts for a given nation (used on territory reset) */
  clearNation(nationId: number): void {
    this.posts = this.posts.filter(p => p.nationId !== nationId);
  }

  /** Get post count per nation */
  getCountByNation(): Map<number, number> {
    const counts = new Map<number, number>();
    for (const p of this.posts) {
      counts.set(p.nationId, (counts.get(p.nationId) ?? 0) + 1);
    }
    return counts;
  }

  /** Remove a specific border post by ID */
  removePost(id: number): boolean {
    const idx = this.posts.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.posts.splice(idx, 1);
    return true;
  }
}
