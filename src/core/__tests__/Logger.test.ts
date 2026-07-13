/**
 * TypeScript tests for the Logger module
 */

import { logger, LogLevel } from '../Logger';

describe('Logger', () => {
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.setLevel(LogLevel.DEBUG); // reset to most verbose for each test
    logSpy.mockClear(); // clear the "Log level set" message
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('is a singleton', () => {
    const { logger: logger2 } = require('../Logger');
    expect(logger2).toBe(logger);
  });

  test('debug() writes via console.debug when level allows', () => {
    logger.debug('TestCat', 'debug message');
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy.mock.calls[0][0]).toContain('[DEBUG]');
    expect(debugSpy.mock.calls[0][0]).toContain('[TestCat]');
    expect(debugSpy.mock.calls[0][0]).toContain('debug message');
  });

  test('info() writes via console.info', () => {
    logger.info('TestCat', 'info message');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0][0]).toContain('[INFO]');
  });

  test('warn() writes via console.warn', () => {
    logger.warn('TestCat', 'warn message');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('[WARN]');
  });

  test('error() and fatal() both write via console.error', () => {
    logger.error('TestCat', 'error message');
    logger.fatal('TestCat', 'fatal message');
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[0][0]).toContain('[ERROR]');
    expect(errorSpy.mock.calls[1][0]).toContain('[FATAL]');
  });

  test('setLevel suppresses messages below the configured severity', () => {
    logger.setLevel(LogLevel.WARN);
    logSpy.mockClear();
    logger.debug('TestCat', 'should be suppressed');
    logger.info('TestCat', 'should be suppressed');
    logger.warn('TestCat', 'should show');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test('setLevel prints a confirmation via console.log', () => {
    logger.setLevel(LogLevel.ERROR);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
  });

  test('includes optional context object in the log call', () => {
    logger.setLevel(LogLevel.DEBUG);
    const ctx = { foo: 'bar' };
    logger.info('TestCat', 'with context', ctx);
    expect(infoSpy.mock.calls[0][1]).toBe(ctx);
  });
});
