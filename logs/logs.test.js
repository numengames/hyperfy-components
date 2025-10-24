/**
 * Tests for LogsController component
 */

const { LogsController } = require('./logs.js');

// Mock global objects
global.app = {
  on: jest.fn(),
  send: jest.fn(),
  configure: jest.fn()
};

global.world = {
  on: jest.fn(),
  isServer: false,
  isClient: true
};

global.config = {
  logsControllerServerLogsInClient: false
};

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

Object.assign(console, mockConsole);

describe('LogsController', () => {
  let mockApp, mockWorld, mockProps;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockApp = {
      on: jest.fn(),
      send: jest.fn(),
      configure: jest.fn()
    };
    
    mockWorld = {
      on: jest.fn(),
      isServer: false,
      isClient: true
    };
    
    mockProps = {
      logsControllerServerLogsInClient: false
    };
  });

  describe('Constructor and initialization', () => {
    it('should create LogsController instance', () => {
      const controller = new LogsController({
        app: mockApp,
        world: mockWorld,
        props: mockProps
      });

      expect(controller).toBeDefined();
      expect(controller.app).toBe(mockApp);
      expect(controller.world).toBe(mockWorld);
      expect(controller.props).toBe(mockProps);
    });

    it('should initialize event listeners', () => {
      new LogsController({
        app: mockApp,
        world: mockWorld,
        props: mockProps
      });

      expect(mockWorld.on).toHaveBeenCalledWith('log', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('logDebug', expect.any(Function));
    });

    it('should not set up client listener when not in client context', () => {
      mockWorld.isClient = false;
      
      new LogsController({
        app: mockApp,
        world: mockWorld,
        props: mockProps
      });

      expect(mockWorld.on).toHaveBeenCalledWith('log', expect.any(Function));
      expect(mockApp.on).not.toHaveBeenCalledWith('logDebug', expect.any(Function));
    });
  });

  describe('Log message handling', () => {
    let controller;

    beforeEach(() => {
      controller = new LogsController({
        app: mockApp,
        world: mockWorld,
        props: mockProps
      });
    });

    it('should log info message correctly', () => {
      controller._logMessage('Test message', 'info');
      
      expect(console.info).toHaveBeenCalledWith('[INFO] Test message');
    });

    it('should log warning message correctly', () => {
      controller._logMessage('Warning message', 'warn');
      
      expect(console.warn).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log error message correctly', () => {
      controller._logMessage('Error message', 'error');
      
      expect(console.error).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log debug message as console.log', () => {
      controller._logMessage('Debug message', 'debug');
      
      expect(console.log).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should fallback to console.log for invalid log type', () => {
      controller._logMessage('Unknown message', 'invalid');
      
      expect(console.log).toHaveBeenCalledWith('[LOG] Unknown message');
    });

    it('should fallback to console.log when console method is not available', () => {
      // Mock console.info to be undefined
      const originalInfo = console.info;
      console.info = undefined;
      
      controller._logMessage('Test message', 'info');
      
      expect(console.log).toHaveBeenCalledWith('[INFO] Test message');
      
      // Restore console.info
      console.info = originalInfo;
    });
  });

  describe('Event handling', () => {
    let controller;

    beforeEach(() => {
      controller = new LogsController({
        app: mockApp,
        world: mockWorld,
        props: mockProps
      });
    });

    it('should handle log event in client context', () => {
      mockWorld.isServer = false;
      
      // Get the event handler that was registered
      const logHandler = mockWorld.on.mock.calls.find(call => call[0] === 'log')[1];
      
      logHandler({ message: 'Client message', type: 'info' });
      
      expect(console.info).toHaveBeenCalledWith('[INFO] Client message');
    });

    it('should handle log event in server context', () => {
      mockWorld.isServer = true;
      
      // Get the event handler that was registered
      const logHandler = mockWorld.on.mock.calls.find(call => call[0] === 'log')[1];
      
      logHandler({ message: 'Server message', type: 'warn' });
      
      expect(console.warn).toHaveBeenCalledWith('[WARN] Server message');
    });

    it('should send server logs to client when enabled', () => {
      mockWorld.isServer = true;
      mockProps.logsControllerServerLogsInClient = true;
      
      controller.props = mockProps;
      
      // Get the event handler that was registered
      const logHandler = mockWorld.on.mock.calls.find(call => call[0] === 'log')[1];
      
      logHandler({ message: 'Server message', type: 'error' });
      
      expect(console.error).toHaveBeenCalledWith('[ERROR] Server message');
      expect(mockApp.send).toHaveBeenCalledWith('logDebug', {
        message: '[Server Side] - Server message',
        type: 'error'
      });
    });

    it('should not send server logs to client when disabled', () => {
      mockWorld.isServer = true;
      mockProps.logsControllerServerLogsInClient = false;
      
      controller.props = mockProps;
      
      // Get the event handler that was registered
      const logHandler = mockWorld.on.mock.calls.find(call => call[0] === 'log')[1];
      
      logHandler({ message: 'Server message', type: 'error' });
      
      expect(console.error).toHaveBeenCalledWith('[ERROR] Server message');
      expect(mockApp.send).not.toHaveBeenCalled();
    });

    it('should handle logDebug event from client', () => {
      // Get the logDebug handler that was registered
      const logDebugHandler = mockApp.on.mock.calls.find(call => call[0] === 'logDebug')[1];
      
      logDebugHandler({ message: 'Debug message', type: 'debug' });
      
      expect(console.log).toHaveBeenCalledWith('[DEBUG] Debug message');
    });
  });

  describe('Static members', () => {
    it('should have LOG_TYPES constant', () => {
      expect(LogsController.LOG_TYPES).toEqual(['log', 'info', 'warn', 'error', 'debug']);
    });

    it('should have getConfig static method', () => {
      const config = LogsController.getConfig();
      
      expect(Array.isArray(config)).toBe(true);
      expect(config.length).toBeGreaterThan(0);
      
      // Check for logs section
      const logsSection = config.find(item => item.key === 'logsSection');
      expect(logsSection).toBeDefined();
      expect(logsSection.label).toBe('Logs Settings');
      
      // Check for server logs toggle
      const serverLogsToggle = config.find(item => item.key === 'logsControllerServerLogsInClient');
      expect(serverLogsToggle).toBeDefined();
      expect(serverLogsToggle.type).toBe('toggle');
      expect(serverLogsToggle.initial).toBe(false);
    });
  });

  describe('Module initialization', () => {
    it('should export LogsController when in Node.js environment', () => {
      expect(typeof LogsController).toBe('function');
    });
  });
});
