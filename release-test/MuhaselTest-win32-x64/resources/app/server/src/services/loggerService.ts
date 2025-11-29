import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

/**
 * Logger service for application-wide logging
 * Supports console logging and file logging with different log levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  logFilePrefix: string;
  maxLogFileSizeBytes: number;
  maxLogFiles: number;
}

class Logger {
  private config: LoggerConfig;
  private currentLogFile: string;
  private currentLogSize: number;
  
  constructor() {
    // Default configuration
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      logDir: path.join(process.cwd(), 'logs'),
      logFilePrefix: 'app',
      maxLogFileSizeBytes: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5
    };
    
    // Override with environment variables if present
    if (process.env.LOG_LEVEL) {
      this.config.level = parseInt(process.env.LOG_LEVEL) as LogLevel;
    }
    
    if (process.env.LOG_ENABLE_CONSOLE) {
      this.config.enableConsole = process.env.LOG_ENABLE_CONSOLE === 'true';
    }
    
    if (process.env.LOG_ENABLE_FILE) {
      this.config.enableFile = process.env.LOG_ENABLE_FILE === 'true';
    }
    
    if (process.env.LOG_DIR) {
      this.config.logDir = process.env.LOG_DIR;
    }
    
    // Initialize logging
    this.initializeLogging();
  }
  
  /**
   * Initialize logging system
   */
  private initializeLogging(): void {
    if (this.config.enableFile) {
      // Create log directory if it doesn't exist
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
      
      // Set current log file
      const timestamp = format(new Date(), 'yyyy-MM-dd');
      this.currentLogFile = path.join(
        this.config.logDir, 
        `${this.config.logFilePrefix}-${timestamp}.log`
      );
      
      // Check if file exists and get its size
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        this.currentLogSize = stats.size;
      } else {
        this.currentLogSize = 0;
      }
      
      // Rotate logs if needed
      this.rotateLogsIfNeeded();
    }
  }
  
  /**
   * Rotate log files if current log file exceeds max size
   */
  private rotateLogsIfNeeded(): void {
    if (this.currentLogSize >= this.config.maxLogFileSizeBytes) {
      const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
      const newLogFile = path.join(
        this.config.logDir, 
        `${this.config.logFilePrefix}-${timestamp}.log`
      );
      
      this.currentLogFile = newLogFile;
      this.currentLogSize = 0;
      
      // Clean up old log files if we have too many
      this.cleanupOldLogFiles();
    }
  }
  
  /**
   * Clean up old log files if we have more than maxLogFiles
   */
  private cleanupOldLogFiles(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(file => file.startsWith(this.config.logFilePrefix))
        .map(file => path.join(this.config.logDir, file));
      
      // Sort by modification time (oldest first)
      files.sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statA.mtime.getTime() - statB.mtime.getTime();
      });
      
      // Delete oldest files if we have too many
      while (files.length > this.config.maxLogFiles) {
        const oldestFile = files.shift();
        if (oldestFile) {
          fs.unlinkSync(oldestFile);
          console.log(`Deleted old log file: ${oldestFile}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old log files:', error);
    }
  }
  
  /**
   * Format a log message
   */
  private formatLogMessage(level: string, message: string): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  /**
   * Write to log file
   */
  private writeToFile(message: string): void {
    if (!this.config.enableFile) return;
    
    try {
      // Append to current log file
      fs.appendFileSync(this.currentLogFile, message + '\n');
      
      // Update current log size
      this.currentLogSize += message.length + 1; // +1 for newline
      
      // Check if we need to rotate logs
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
  
  /**
   * Log an error message
   */
  public error(message: string, error?: any): void {
    if (this.config.level >= LogLevel.ERROR) {
      let fullMessage = message;
      
      if (error) {
        if (error instanceof Error) {
          fullMessage += `\n${error.stack || error.message}`;
        } else {
          fullMessage += `\n${JSON.stringify(error)}`;
        }
      }
      
      const formattedMessage = this.formatLogMessage('ERROR', fullMessage);
      
      if (this.config.enableConsole) {
        console.error(formattedMessage);
      }
      
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string): void {
    if (this.config.level >= LogLevel.WARN) {
      const formattedMessage = this.formatLogMessage('WARN', message);
      
      if (this.config.enableConsole) {
        console.warn(formattedMessage);
      }
      
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log an info message
   */
  public info(message: string): void {
    if (this.config.level >= LogLevel.INFO) {
      const formattedMessage = this.formatLogMessage('INFO', message);
      
      if (this.config.enableConsole) {
        console.info(formattedMessage);
      }
      
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string): void {
    if (this.config.level >= LogLevel.DEBUG) {
      const formattedMessage = this.formatLogMessage('DEBUG', message);
      
      if (this.config.enableConsole) {
        console.debug(formattedMessage);
      }
      
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log an HTTP request
   */
  public logRequest(req: any, res: any, responseTime?: number): void {
    if (this.config.level >= LogLevel.INFO) {
      const method = req.method;
      const url = req.originalUrl || req.url;
      const status = res.statusCode;
      const userAgent = req.get('user-agent') || '-';
      const ip = req.ip || req.connection.remoteAddress;
      
      let message = `${method} ${url} ${status} - ${ip}`;
      
      if (responseTime) {
        message += ` - ${responseTime}ms`;
      }
      
      if (this.config.level >= LogLevel.DEBUG) {
        message += ` - ${userAgent}`;
      }
      
      this.info(message);
    }
  }
}

// Create and export a singleton instance
export const logger = new Logger();

/**
 * Express middleware for request logging
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Log when the request completes
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.logRequest(req, res, responseTime);
  });
  
  next();
};