const fs = require('fs');
const path = require('path');

/**
 * Logging utility with file and console output
 */
class Logger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info'; // 'debug', 'info', 'warn', 'error'
        this.logToFile = options.logToFile !== false;
        this.logToConsole = options.logToConsole !== false;
        this.logFile = null;
        this.logStream = null;

        if (this.logToFile) {
            const logDir = options.logDir || path.join(process.cwd(), 'logs');

            // Ensure log directory exists
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const logFileName = options.logFileName || `copy-${timestamp}.log`;
            this.logFile = path.join(logDir, logFileName);
            this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
        }
    }

    /**
     * Log levels with priority
     */
    static LEVELS = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    /**
     * Check if a message should be logged based on level
     */
    shouldLog(level) {
        return Logger.LEVELS[level] >= Logger.LEVELS[this.logLevel];
    }

    /**
     * Format a log message
     */
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelStr = level.toUpperCase().padEnd(5);
        const formattedArgs = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        const fullMessage = formattedArgs
            ? `${message} ${formattedArgs}`
            : message;

        return {
            console: `[${levelStr}] ${fullMessage}`,
            file: `[${timestamp}] [${levelStr}] ${fullMessage}`,
        };
    }

    /**
     * Write log message to outputs
     */
    log(level, message, ...args) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formatted = this.formatMessage(level, message, ...args);

        if (this.logToConsole) {
            const consoleMethod = level === 'error' ? console.error : console.log;
            consoleMethod(formatted.console);
        }

        if (this.logToFile && this.logStream) {
            this.logStream.write(formatted.file + '\n');
        }
    }

    /**
     * Log debug message
     */
    debug(message, ...args) {
        this.log('debug', message, ...args);
    }

    /**
     * Log info message
     */
    info(message, ...args) {
        this.log('info', message, ...args);
    }

    /**
     * Log warning message
     */
    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    /**
     * Log error message
     */
    error(message, ...args) {
        this.log('error', message, ...args);
    }

    /**
     * Get log file path
     */
    getLogFilePath() {
        return this.logFile;
    }

    /**
     * Close log stream
     */
    close() {
        return new Promise((resolve) => {
            if (this.logStream) {
                this.logStream.end(() => resolve());
            } else {
                resolve();
            }
        });
    }
}

module.exports = Logger;
