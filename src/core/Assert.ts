/**
 * S4WN Assertion Module
 *
 * Provides assertion functions for logic validation in debug builds.
 * These help fail fast on invalid state during development.
 */

/**
 * Assert a condition is true. In development mode, throws if the condition is false.
 * In production, assertions are no-ops to avoid performance overhead.
 * 
 * @param condition - The condition to check
 * @param message - Optional error message
 */
export function assert(condition: boolean, message: string = 'Assertion failed'): void {
  if (process.env.NODE_ENV !== 'production' && !condition) {
    throw new Error(message);
  }
}

/**
 * Debug-only assertion that always throws in development builds,
 * regardless of the condition. Useful for marking unreachable code paths.
 * In release builds, this is a no-op.
 * 
 * @param condition - Ignored in development
 * @param message - Error message (always shown in development)
 */
export function assertDebug(_condition: boolean, message: string = 'Debug assertion'): void {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(message);
  }
}

/**
 * Release-only assertion that always throws in production builds,
 * regardless of the condition. In debug builds, this is a no-op.
 * Useful for releasing only in production but not in development.
 * 
 * @param condition - Ignored in production
 * @param message - Error message (always shown in production)
 */
export function assertRelease(_condition: boolean, message: string = 'Release assertion failed'): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }
}
