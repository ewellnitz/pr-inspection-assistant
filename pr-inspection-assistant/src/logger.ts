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
        console.info(message, ...args);
        this.flushLogs();
    }

    public static error(message: string, ...args: any[]): void {
        console.error(message, ...args);
        this.flushLogs();
    }

    public static warn(message: string, ...args: any[]): void {
        console.warn(message, ...args);
        this.flushLogs();
    }

    public static debug(message: string, ...args: any[]): void {
        console.debug(message, ...args);
        this.flushLogs();
    }

    public static log(message: string, ...args: any[]): void {
        console.log(message, ...args);
        this.flushLogs();
    }
}
