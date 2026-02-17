export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

const LOG_LEVEL_STORAGE_KEY = 'ttpe-log-level';
const SHOW_CALLER_INFO_STORAGE_KEY = 'ttpe-show-caller-info';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  // Note: enableRemote removed until remote logging is actually implemented
  // When adding remote logging, expose via environment variable or Settings panel
  showCallerInfo?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    // Initialize with default config
    const defaultConfig: LoggerConfig = {
      level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
      enableConsole: true,
      showCallerInfo: false // Opt-in: set via logger.setShowCallerInfo(true) to avoid stack trace overhead
    };

    // Try to load log level from localStorage
    let savedLevel: LogLevel | null = null;
    let savedShowCallerInfo: boolean | null = null;
    try {
      const saved = localStorage.getItem(LOG_LEVEL_STORAGE_KEY);
      if (saved !== null) {
        const parsedLevel = parseInt(saved, 10);
        if (parsedLevel >= LogLevel.DEBUG && parsedLevel <= LogLevel.ERROR) {
          savedLevel = parsedLevel as LogLevel;
        }
      }

      const savedCallerInfo = localStorage.getItem(SHOW_CALLER_INFO_STORAGE_KEY);
      if (savedCallerInfo === 'true' || savedCallerInfo === 'false') {
        savedShowCallerInfo = savedCallerInfo === 'true';
      }
    } catch (_error) {
      // Ignore localStorage errors
    }

    this.config = {
      ...defaultConfig,
      ...(savedLevel !== null ? { level: savedLevel } : {}),
      ...(savedShowCallerInfo !== null ? { showCallerInfo: savedShowCallerInfo } : {}),
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private getCallerInfo(): string {
    try {
      // Create an error to get the stack trace
      const stack = new Error().stack;
      if (!stack) return '';

      const stackLines = stack.split('\n');
      
      // Find the first line that's not part of the logger itself
      // We need to skip the logger's internal methods to get to the actual caller
      for (let i = 1; i < stackLines.length; i++) {
        const line = stackLines[i];
        if (!line || line.includes('Logger.') || line.includes('getCallerInfo') || line.includes('formatMessage')) {
          continue;
        }

        // Extract file path and line number from stack trace
        // Different browsers have different formats, so we handle multiple patterns:
        // Chrome/Node: "    at functionName (file:///path/to/file.ts:line:column)"
        // Firefox: "functionName@file:///path/to/file.ts:line:column"
        // Safari: "functionName@file:///path/to/file.ts:line:column"
        
        let match = line.match(/at\s+(?:([^(]+)\s+\()?(?:.*\/)?([^/:()]+(?:\.[jt]sx?))(?:\?[^:]*)?:(\d+):(\d+)/);
        if (!match) {
          // Try Firefox/Safari format
          match = line.match(/([^@]*)@(?:.*\/)?([^/:()]+(?:\.[jt]sx?))(?:\?[^:]*)?:(\d+):(\d+)/);
        }
        
        if (match) {
          const [, functionName, fileName, lineNumber] = match;
          const func = functionName ? functionName.trim() : '';
          
          // Skip if it's still pointing to logger internals
          if (func.includes('debug') || func.includes('info') || func.includes('warn') || func.includes('error')) {
            continue;
          }
          
          // Create a clean caller info string
          let result = `${fileName}:${lineNumber}`;
          if (func && func !== 'anonymous' && func !== '') {
            result += ` (${func})`;
          }
          
          return result;
        }
      }
    } catch (_error) {
      // If stack trace extraction fails, silently continue without caller info
    }
    return '';
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date().toISOString();
    
    // Use cached showCallerInfo value — updated via setConfig / setShowCallerInfo
    const callerInfo = this.config.showCallerInfo ? this.getCallerInfo() : '';
    
    const prefix = `[${timestamp}] [${level}]${callerInfo ? ` [${callerInfo}]` : ''}`;
    
    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, ...args);
        break;
      case 'INFO':
        console.info(prefix, message, ...args);
        break;
      case 'WARN':
        console.warn(prefix, message, ...args);
        break;
      case 'ERROR':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('WARN', message, ...args);
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (error instanceof Error) {
        this.formatMessage('ERROR', `${message}: ${error.message}`, error.stack, ...args);
      } else {
        this.formatMessage('ERROR', message, error, ...args);
      }

      // TODO: When implementing remote error tracking (Sentry, etc.),
      // add enableRemote config flag and check:
      // if (this.config.enableRemote && process.env.NODE_ENV === 'production') { ... }
    }
  }

  /** Update logger configuration at runtime. */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Persist changed values to localStorage.
    if (config.level !== undefined || config.showCallerInfo !== undefined) {
      try {
        if (config.level !== undefined) {
          localStorage.setItem(LOG_LEVEL_STORAGE_KEY, config.level.toString());
        }
        if (config.showCallerInfo !== undefined) {
          localStorage.setItem(SHOW_CALLER_INFO_STORAGE_KEY, String(config.showCallerInfo));
        }
      } catch (_error) {
        // Ignore localStorage errors in case it's not available
      }
    }
  }

  /** Set whether to show caller information in log output. */
  setShowCallerInfo(showCallerInfo: boolean): void {
    this.config.showCallerInfo = showCallerInfo;
    
    // Persist showCallerInfo to localStorage.
    try {
      localStorage.setItem(SHOW_CALLER_INFO_STORAGE_KEY, String(showCallerInfo));
    } catch (_error) {
      // Ignore errors
    }
  }

  /** Get whether caller information is shown in log output. */
  getShowCallerInfo(): boolean {
    return this.config.showCallerInfo || false;
  }

  /** Get the current log level. */
  getLogLevel(): LogLevel {
    return this.config.level;
  }
}

/** Singleton logger instance. */
export const logger = new Logger();
