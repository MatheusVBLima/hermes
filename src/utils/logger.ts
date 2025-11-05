/**
 * Logger Utility
 * Provides structured logging with timestamps and color-coded levels
 */

enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
    DEBUG = 'DEBUG',
}

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
} as const;

/**
 * Formats timestamp for log entries
 */
function getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Gets color for log level
 */
function getColor(level: LogLevel): string {
    switch (level) {
        case LogLevel.INFO:
            return colors.blue;
        case LogLevel.WARN:
            return colors.yellow;
        case LogLevel.ERROR:
            return colors.red;
        case LogLevel.SUCCESS:
            return colors.green;
        case LogLevel.DEBUG:
            return colors.magenta;
        default:
            return colors.white;
    }
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
    const timestamp = getTimestamp();
    const color = getColor(level);
    const levelStr = level.padEnd(7);

    console.log(
        `${colors.gray}[${timestamp}]${colors.reset} ${color}${levelStr}${colors.reset} ${message}`,
        ...args
    );
}

/**
 * Logger instance with methods for different log levels
 */
export const logger = {
    /**
     * Log informational message
     */
    info(message: string, ...args: unknown[]): void {
        log(LogLevel.INFO, message, ...args);
    },

    /**
     * Log warning message
     */
    warn(message: string, ...args: unknown[]): void {
        log(LogLevel.WARN, message, ...args);
    },

    /**
     * Log error message
     */
    error(message: string, error?: Error | unknown, ...args: unknown[]): void {
        log(LogLevel.ERROR, message, ...args);
        if (error instanceof Error) {
            console.error(colors.dim + error.stack + colors.reset);
        } else if (error) {
            console.error(colors.dim, error, colors.reset);
        }
    },

    /**
     * Log success message
     */
    success(message: string, ...args: unknown[]): void {
        log(LogLevel.SUCCESS, message, ...args);
    },

    /**
     * Log debug message (only in development)
     */
    debug(message: string, ...args: unknown[]): void {
        if (process.env.NODE_ENV === 'development') {
            log(LogLevel.DEBUG, message, ...args);
        }
    },

    /**
     * Log command execution
     */
    command(user: string, command: string, guild?: string): void {
        const location = guild ? `in ${guild}` : 'in DM';
        log(LogLevel.INFO, `Command executed: ${colors.cyan}/${command}${colors.reset} by ${colors.bright}${user}${colors.reset} ${location}`);
    },

    /**
     * Log event
     */
    event(eventName: string, details?: string): void {
        const message = details
            ? `Event: ${colors.cyan}${eventName}${colors.reset} - ${details}`
            : `Event: ${colors.cyan}${eventName}${colors.reset}`;
        log(LogLevel.INFO, message);
    },
};
