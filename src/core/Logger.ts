/**
 * S4WN Structured Logging Framework
 * Provides consistent logging across the application with severity levels.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  context?: any;
}

class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
    console.log(`[Logger] Log level set to ${LogLevel[level]}`);
  }

  private log(level: LogLevel, category: string, message: string, context?: any): void {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context,
    };

    const levelName = LogLevel[level];
    const formattedMessage = `[${entry.timestamp}] [${levelName}] [${category}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, context || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, context || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage, context || '');
        break;
    }
  }

  public debug(category: string, message: string, context?: any): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  public info(category: string, message: string, context?: any): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  public warn(category: string, message: string, context?: any): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  public error(category: string, message: string, context?: any): void {
    this.log(LogLevel.ERROR, category, message, context);
  }

  public fatal(category: string, message: string, context?: any): void {
    this.log(LogLevel.FATAL, category, message, context);
  }
}

export const logger = Logger.getInstance();