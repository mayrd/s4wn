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
    // @babylonjs/loaders is ESM-only — redirect to a CommonJS stub
    // so Jest never tries to parse the real ESM export * syntax.
    '^@babylonjs/loaders$': '<rootDir>/__mocks__/@babylonjs/loaders.js',
  },
  // Provide import.meta polyfill for Vite/Babel compatibility
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Exclude node_modules from transformation — @babylonjs/loaders is ESM-only
  // and is already mocked with jest.mock(..., { virtual: true }) in tests.
  transformIgnorePatterns: ['/node_modules/'],
};
