export class Logger {
    private static flushLogs(): void {
        // Force console output to flush in Azure DevOps
        try {
            process.stdout?.write('');
            process.stderr?.write('');
        } catch (error) {
            // Ignore flush errors to prevent breaking the main flow
        }
    }

    public static info(message: string, ...args: any[]): void {
        // Info logs are always shown in Azure DevOps
        console.log(message, ...args);
        this.flushLogs();
    }

    public static error(message: string, ...args: any[]): void {
        // Azure DevOps error log command
        console.log(`##vso[task.logissue type=error]${message}`, ...args);
        this.flushLogs();
    }

    public static warn(message: string, ...args: any[]): void {
        // Azure DevOps warning log command
        console.log(`##vso[task.logissue type=warning]${message}`, ...args);
        this.flushLogs();
    }

    public static debug(message: string, ...args: any[]): void {
        // Only log debug if system.debug is true in Azure DevOps
        if (process.env['SYSTEM_DEBUG'] === 'true' || process.env['system.debug'] === 'true') {
            console.log(`##vso[task.debug]${message}`, ...args);
            this.flushLogs();
        }
    }

    public static log(message: string, ...args: any[]): void {
        // Generic log, always shown
        console.log(message, ...args);
        this.flushLogs();
    }
}
