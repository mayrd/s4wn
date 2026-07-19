/**
 * S4WN Console Debug API
 *
 * Exposes a global `window.S4` object for debugging purposes, containing
 * references to GameApp, GameLoop, UIManager, and Map. Provides methods
 * for listing units, dumping game state, and other introspection tools.
 */

export interface ConsoleDebugAPI {
  gameApp?: any;
  gameLoop?: any;
  uiManager?: any;
  map?: any;
  
  // Methods
  listUnits(): Array<{ id: number; kind: number; x: number; y: number; hp: number; state?: string; }>;
  dumpGameState(): object;
}

/**
 * Setup the console debugging API on the window object.
 * Should be called once when the game is initialized.
 */
export function setupConsoleAPI(gameApp: any, uiManager?: any): void {
  const api: ConsoleDebugAPI = {
    gameApp,
    gameLoop: gameApp?.gameLoop,
    uiManager,
    map: gameApp?.map,
    
    listUnits(): Array<{ id: number; kind: number; x: number; y: number; hp: number; state?: string; }> {
      if (!api.gameLoop?.unitManager) {
        return [];
      }
      
      return api.gameLoop.unitManager.units
        .filter((u: any) => u.hp > 0 && u.dyingTimer === null)
        .map((u: any) => ({
          id: u.id,
          kind: u.kind,
          x: Math.floor(u.x),
          y: Math.floor(u.y),
          hp: u.hp,
          state: u.state,
        }));
    },
    
    dumpGameState(): object {
      if (!api.gameLoop) {
        return { error: 'GameLoop not available' };
      }
      
      return {
        gameTime: api.gameLoop.state?.gameTime,
        ticks: api.gameLoop.state?.ticks,
        isPaused: api.gameLoop.state?.isPaused,
        gameSpeed: api.gameLoop.state?.gameSpeed,
        dayPhase: api.gameLoop.state?.dayPhase,
        showFullMap: api.gameLoop.state?.showFullMap,
        mapWidth: api.map?.width,
        mapHeight: api.map?.height,
        resources: api.gameLoop.economy?.getResourceCounts ? api.gameLoop.economy.getResourceCounts() : [],
        buildingCount: api.gameLoop.economy?.getCompleteBuildings ? api.gameLoop.economy.getCompleteBuildings().length : 0,
        unitCount: api.gameLoop.unitManager?.getAliveUnits ? api.gameLoop.unitManager.getAliveUnits().length : 0,
      };
    },
  };
  
  (window as any).S4 = api;
}

/**
 * Get the current console API instance.
 */
export function getConsoleAPI(): ConsoleDebugAPI | undefined {
  return (window as any).S4;
}
