/**
 * Logs Component for Hyperfy
 * 
 * A centralized logging system that handles debug messages across all components.
 * Supports different log levels and server-client synchronization.
 */

class LogsController {
  constructor({ app, world, props }) {
    this.app = app;
    this.world = world;
    this.props = props;
    
    // Initialize logging system
    this._initLogging();
  }

  /**
   * Valid log types supported by the system
   */
  static LOG_TYPES = ['log', 'info', 'warn', 'error', 'debug'];

  /**
   * Initialize the logging system
   * @private
   */
  _initLogging() {
    // Set up world event listener for log events
    this.world.on('log', (payload) => {
      this._handleLogEvent(payload);
    });

    // Set up client-side log debug listener
    if (this.world.isClient) {
      this.app.on('logDebug', (payload) => {
        this._handleLogEvent(payload);
      });
    }
  }

  /**
   * Handle incoming log events
   * @param {Object} payload - Log event payload
   * @param {string} payload.message - The log message
   * @param {string} payload.type - The log type
   * @private
   */
  _handleLogEvent(payload) {
    const { message, type } = payload;
    
    if (this.world.isServer) {
      this._logMessage(message, type);
      
      // Send to client if enabled
      if (this.props.logsControllerServerLogsInClient) {
        this.app.send('logDebug', { 
          message: `[Server Side] - ${message}`, 
          type 
        });
      }
    } else {
      this._logMessage(message, type);
    }
  }

  /**
   * Log a message to the console
   * @param {string} message - The message to log
   * @param {string} type - The log type
   * @private
   */
  _logMessage(message, type) {
    const logType = LogsController.LOG_TYPES.includes(type) ? type : 'log';
    const consoleType = logType === 'debug' ? 'log' : logType;
    
    if (typeof console[consoleType] === 'function') {
      console[consoleType](`[${logType.toUpperCase()}] ${message}`);
    } else {
      console.log(`[${logType.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get configuration for the logs component
   * @returns {Array} Configuration array
   */
  static getConfig() {
    return [
      {
        type: 'section',
        key: 'logsSection',
        label: 'Logs Settings'
      },
      {
        key: 'logsControllerServerLogsInClient',
        type: 'toggle',
        label: 'Server Logs in Client',
        initial: false,
        hint: 'Enable this if you want to see server logs in the client'
      }
    ];
  }
}

// Initialize the logs system when the module loads
if (typeof module === 'undefined') {
  // Browser/Hyperfy environment
  const logsController = new LogsController({ app, world, props });

  app.configure(LogsController.getConfig());
} else {
  // Node.js environment (for testing)
  module.exports = { LogsController };
}
