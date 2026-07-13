/**
 * TypeScript tests for the ErrorHandler module
 * @jest-environment jsdom
 */

import { errorHandler, ErrorHandler } from '../ErrorHandler';
import { logger } from '../Logger';

describe('ErrorHandler', () => {
  let fatalSpy: jest.SpyInstance;

  beforeEach(() => {
    fatalSpy = jest.spyOn(logger, 'fatal').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('is a singleton', () => {
    expect(ErrorHandler.getInstance()).toBe(errorHandler);
  });

  test('init() installs window.onerror and window.onunhandledrejection handlers', () => {
    errorHandler.init();
    expect(typeof window.onerror).toBe('function');
    expect(typeof window.onunhandledrejection).toBe('function');
  });

  test('handleError logs a fatal entry with message and stack for Error instances', () => {
    const err = new Error('boom');
    errorHandler.handleError('TestType', err);

    expect(fatalSpy).toHaveBeenCalledTimes(1);
    const [category, message, context] = fatalSpy.mock.calls[0];
    expect(category).toBe('Error:TestType');
    expect(message).toBe('boom');
    expect(context.stack).toBeDefined();
  });

  test('handleError stringifies non-Error values', () => {
    errorHandler.handleError('TestType', 'plain string error');
    const [, message, context] = fatalSpy.mock.calls[0];
    expect(message).toBe('plain string error');
    expect(context.stack).toBe('No stack trace available');
  });

  test('handleError merges additional context into the logged payload', () => {
    errorHandler.handleError('TestType', new Error('x'), { source: 'unit-test.ts', lineno: 42 });
    const [, , context] = fatalSpy.mock.calls[0];
    expect(context.source).toBe('unit-test.ts');
    expect(context.lineno).toBe(42);
  });

  test('window.onerror invokes handleError and does not swallow default browser reporting', () => {
    errorHandler.init();
    const result = window.onerror!('Something broke', 'file.ts', 10, 5, new Error('inner'));
    expect(fatalSpy).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
