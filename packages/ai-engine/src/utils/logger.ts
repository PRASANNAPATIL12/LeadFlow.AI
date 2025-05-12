export class Logger {
    private service: string;

    constructor(service: string) {
        this.service = service;
    }

    info(message: string, ...args: any[]): void {
        console.info(`[${new Date().toISOString()}] [INFO] ${this.service}: ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[${new Date().toISOString()}] [WARN] ${this.service}: ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[${new Date().toISOString()}] [ERROR] ${this.service}: ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (process.env.DEBUG) {
            console.debug(`[${new Date().toISOString()}] [DEBUG] ${this.service}: ${message}`, ...args);
        }
    }
}
