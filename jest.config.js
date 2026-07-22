/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        // Use inline-source-map to handle ESM properly
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@game/(.*)$': '<rootDir>/src/game/$1',
    '^@rendering/(.*)$': '<rootDir>/src/rendering/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
  },
  // Provide import.meta polyfill for Vite/Babel compatibility
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Transform @babylonjs/loaders (ESM package) so Jest can parse it
  transformIgnorePatterns: ['/node_modules/(?!@babylonjs/loaders)'],
};
