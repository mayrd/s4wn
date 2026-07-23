/**
 * Stub for @babylonjs/loaders.
 *
 * @babylonjs/loaders is ESM-only (export * from ... syntax) which Jest/ts-jest
 * cannot parse. This stub replaces the real module entirely via moduleNameMapper
 * in jest.config.js so that tests importing it (even as a side-effect) get a
 * lightweight CommonJS-compatible stub instead of crashing.
 *
 * Individual test files override SceneLoader via:
 *   jest.mock('@babylonjs/loaders', () => ({ SceneLoader: { ... } }));
 */
const SceneLoader = {
  ImportMeshAsync: () => Promise.resolve({ meshes: [] }),
};

module.exports = { SceneLoader };