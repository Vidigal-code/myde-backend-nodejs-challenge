import type { Config } from 'jest';

/**
 * Testes unitários ficam em tests/unit. Usamos ts-jest com os mesmos paths do tsconfig
 * (@/ -> src/) para que os specs importem o código de produção sem caminhos relativos longos.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts', '!src/worker.ts'],
};

export default config;
