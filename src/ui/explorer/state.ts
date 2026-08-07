// State Management for Object Explorer

interface ExplorerState {
  selectedNation: string | null;
  selectedAsset: string | null;
  animation_playback_speed: number;
  view_mode: "3d" | "graph" | "textures";
  filters: { search: string; missing_assets: boolean };
}

const initialState: ExplorerState = {
  selectedNation: null,
  selectedAsset: null,
  animation_playback_speed: 1,
  view_mode: "3d",
  filters: { search: "", missing_assets: false }
};

// Store singleton
const state: ExplorerState = initialState;

// Expose
export { state as default };