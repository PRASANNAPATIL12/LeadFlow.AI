import winston from 'winston';

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4, // Added verbose for more detailed operational logs not quite debug
    debug: 5,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
  },
};

// Add colors to Winston
winston.addColors(customLevels.colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info'; // Changed default prod level to info
};

// Custom format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }), // Colorize the entire output
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: [${info.service || 'App'}] ${info.message} ${info.stack ? '
Stack: ' + info.stack : ''} ${Object.keys(info).filter(key => !['level', 'message', 'timestamp', 'service', 'stack'].includes(key)).length > 0 ? '
Meta: ' + JSON.stringify(Object.fromEntries(Object.entries(info).filter(([key]) => !['level', 'message', 'timestamp', 'service', 'stack'].includes(key))), null, 2) : ''}`
  )
);

// Define transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: logFormat,
    level: level(), // Ensure console level respects environment
  }),
  // Add file transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()), // JSON format for file logs
  }),
  // Add file transport for all logs (optional)
  new winston.transports.File({
    filename: 'logs/all.log',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    level: 'debug', // Capture all logs in this file
  }),
];

// Create a logger instance
const winstonLogger = winston.createLogger({
  level: level(),
  levels: customLevels.levels,
  format: logFormat, // Default format, can be overridden by transport
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

export class Logger {
  private serviceName: string;
  private loggerInstance: winston.Logger;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    // Create a child logger for this service to automatically include serviceName
    this.loggerInstance = winstonLogger.child({ service: this.serviceName });
  }
  
  info(message: string, meta?: any): void {
    this.loggerInstance.info(message, meta);
  }
  
  error(message: string, error?: Error | any, meta?: any): void {
    // If an error object is passed, log its message and stack
    if (error instanceof Error) {
        this.loggerInstance.error(message, { ...meta, errorMessage: error.message, stack: error.stack });
    } else {
        this.loggerInstance.error(message, { ...meta, errorDetails: error });
    }
  }
  
  warn(message: string, meta?: any): void {
    this.loggerInstance.warn(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.loggerInstance.verbose(message, meta);
  }
  
  debug(message: string, meta?: any): void {
    this.loggerInstance.debug(message, meta);
  }
  
  http(message: string, meta?: any): void {
    this.loggerInstance.http(message, meta);
  }
}

// Example of a global/default logger if needed, though class-based is better for context
export const globalLogger = new Logger('Global');
