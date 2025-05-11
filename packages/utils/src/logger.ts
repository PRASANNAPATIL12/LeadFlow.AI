// packages/utils/src/logger.ts
import winston from 'winston';

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4, 
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

winston.addColors(customLevels.colors);

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: [${info.service || 'App'}] ${info.message} ${info.stack ? '
Stack: ' + info.stack : ''} ${Object.keys(info).filter(key => !['level', 'message', 'timestamp', 'service', 'stack'].includes(key)).length > 0 ? '
Meta: ' + JSON.stringify(Object.fromEntries(Object.entries(info).filter(([key]) => !['level', 'message', 'timestamp', 'service', 'stack'].includes(key))), null, 2) : ''}`
  )
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: logFormat,
    level: level(), 
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    level: 'debug', 
  }),
];

const winstonLogger = winston.createLogger({
  level: level(),
  levels: customLevels.levels,
  format: logFormat, 
  transports,
  exitOnError: false, 
});

export class Logger {
  private serviceName: string;
  private loggerInstance: winston.Logger;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.loggerInstance = winstonLogger.child({ service: this.serviceName });
  }
  
  info(message: string, meta?: any): void {
    this.loggerInstance.info(message, meta);
  }
  
  error(message: string, error?: Error | any, meta?: any): void {
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

export const logger = new Logger('Global'); // Export a default global logger instance
