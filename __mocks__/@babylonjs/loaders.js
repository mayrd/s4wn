// Mock for @babylonjs/loaders - ESM module stub for Jest
module.exports = {
  SceneLoader: {
    ImportMeshAsync: () => Promise.resolve({ meshes: [] }),
  },
};