/**
 * S4WN Global Error Handling Framework
 * Captures unhandled exceptions and promise rejections, logging them via the Logger.
 */
import { logger } from './Logger';

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Initializes global listeners for unhandled errors.
   */
  public init(): void {
    // Handle synchronous unhandled exceptions
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError('Unhandled Exception', error || message, {
        source,
        lineno,
        colno,
      });
      return false; // Let the error propagate to the console as well
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason, {
        promise: event.promise,
      });
    };

    logger.info('Core', 'Global ErrorHandler initialized');
  }

  /**
   * Central method to process and log errors.
   */
  public handleError(type: string, error: any, context?: any): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : 'No stack trace available';

    const errorContext = {
      ...context,
      stack,
    };

    logger.fatal(`Error:${type}`, message, errorContext);

    // In development, we might want to alert the user or show a crash screen
    if (import.meta.env.DEV) {
      console.group('%c 🚨 S4WN CRITICAL ERROR ', 'background: #ff0000; color: #ffffff; font-weight: bold; font-size: 14px;');
      console.error(`Type: ${type}`);
      console.error(`Message: ${message}`);
      console.error(`Stack: ${stack}`);
      console.groupEnd();
    }
  }
}

export const errorHandler = ErrorHandler.getInstance();