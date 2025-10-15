global.app = {
  send: jest.fn(),
  emit: jest.fn(),
  on: jest.fn()
};

global.props = {
  appID: 'test-app-id',
  enableDebugMode: false,
  targetNodeName: '',
  enableCollision: false,
  initialVisibility: true,
  destinationUrl: 'https://example.com',
  openInNewWindow: true,
  redirectControllerAcceptAnyEmitter: false,
  redirectControllerEventReceivers: '[]'
};

global.world = {
  isServer: false,
  isClient: true,
  on: jest.fn(),
  open: jest.fn()
};

const { RedirectController } = require('./redirect.js');

function generateTestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createFreshMocks() {
  const eventListeners = {};

  const mockApp = {
    send: jest.fn(),
    emit: jest.fn((eventName, data) => {
      if (eventListeners[eventName]) {
        eventListeners[eventName].forEach(listener => {
          listener(data);
        });
      }
    }),
    on: jest.fn((eventName, listener) => {
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(listener);
    })
  };

  const mockProps = { ...global.props };

  const mockWorld = {
    isServer: false,
    isClient: true,
    on: jest.fn((eventName, listener) => {
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(listener);
    }),
    open: jest.fn()
  };

  const mockNode = null;

  return {
    mockApp,
    mockProps,
    mockWorld,
    mockNode,
    eventListeners
  };
}

describe('RedirectController Event Handling Use Cases', () => {
  let mockApp, mockProps, mockWorld, mockNode, eventListeners;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createFreshMocks();
    mockApp = mocks.mockApp;
    mockProps = mocks.mockProps;
    mockWorld = mocks.mockWorld;
    mockNode = mocks.mockNode;
    eventListeners = mocks.eventListeners;
  });

  describe('Configuration validation', () => {
    test('should not register listeners when configuration is invalid JSON', () => {
      const propsWithInvalidConfig = {
        ...mockProps,
        redirectControllerEventReceivers: 'invalid-json'
      };

      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;
      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      new RedirectController({
        app: mockApp,
        node: mockNode,
        props: propsWithInvalidConfig,
        world: mockWorld
      });

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Failed to parse JSON string'),
        type: 'warn'
      }));

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });

    test.each([
      { 
        description: 'missing id',
        config: { actions: [{ type: 'redirect', params: {} }] }
      },
      { 
        description: 'missing actions',
        config: { id: 'test-event' }
      },
      { 
        description: 'actions is not an array',
        config: { id: 'test-event', actions: 'not-an-array' }
      }
    ])('should not register listeners when receiver config has $description', ({ config }) => {
      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;

      const invalidReceiverConfig = JSON.stringify([config]);
      const propsWithInvalidReceiver = {
        ...mockProps,
        redirectControllerEventReceivers: invalidReceiverConfig
      };

      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      new RedirectController({
        app: mockApp,
        node: mockNode,
        props: propsWithInvalidReceiver,
        world: mockWorld
      });

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Invalid receiver config: expected {id, actions[]}'),
        type: 'warn'
      }));

      if (config.id) {
        expect(mockWorld.on).not.toHaveBeenCalledWith(config.id, expect.any(Function));
      }

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });

    test('should not execute action when type is not defined', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'unknown-action-type',
          params: {}
        }]
      };

      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;

      const propsWithDebug = {
        enableDebugMode: true,
        appID: 'test-unknown-action'
      };

      const controller = new RedirectController({
        app: mockApp,
        node: mockNode,
        props: {
          ...mockProps,
          ...propsWithDebug,
          redirectControllerEventReceivers: JSON.stringify([receiverConfig])
        },
        world: mockWorld
      });

      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({});
        });
      }

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Unhandled action: unknown-action-type'),
        type: 'warn'
      }));

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });
  });

  describe('Redirect functionality', () => {
    test('should redirect to external URL when receiving valid redirect event', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'redirect',
          params: {}
        }]
      };

      const props = {
        ...mockProps,
        redirectControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new RedirectController({
        app: mockApp,
        props,
        world: mockWorld
      });
      
      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({});
        });
      }

      expect(mockWorld.open).toHaveBeenCalledWith('https://example.com', true);
    });

    test('should send redirect-complete event to server after successful redirect', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'redirect',
          params: {}
        }]
      };

      const props = {
        ...mockProps,
        appID: 'test-redirect-complete',
        redirectControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new RedirectController({
        app: mockApp,
        node: mockNode,
        props,
        world: mockWorld
      });
      
      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({});
        });
      }

      expect(mockApp.send).toHaveBeenCalledWith('redirect-complete-cs-test-redirect-complete', {
        url: 'https://example.com',
        openInNewWindow: true,
        timestamp: expect.any(Number)
      });
    });

    test('should broadcast redirect-complete event when server receives completion', () => {
      const serverWorld = {
        ...mockWorld,
        isServer: true,
        isClient: false,
        on: jest.fn()
      };

      const props = {
        ...mockProps,
        appID: 'test-server-broadcast'
      };

      new RedirectController({
        app: mockApp,
        node: mockNode,
        props,
        world: serverWorld
      });

      expect(mockApp.on).toHaveBeenCalledWith('redirect-complete-cs-test-server-broadcast', expect.any(Function));

      const appOnCalls = mockApp.on.mock.calls;
      const redirectCompleteListener = appOnCalls.find(call => call[0] === 'redirect-complete-cs-test-server-broadcast');
      
      if (redirectCompleteListener) {
        const completionData = {
          url: 'https://example.com',
          openInNewWindow: true,
          timestamp: Date.now()
        };
        redirectCompleteListener[1](completionData);
      }

      expect(mockApp.emit).toHaveBeenCalledWith('redirect-complete-test-server-broadcast', {
        url: 'https://example.com',
        openInNewWindow: true,
        timestamp: expect.any(Number)
      });
    });

    test('should not redirect when destination URL is missing', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'redirect',
          params: {}
        }]
      };

      const props = {
        ...mockProps,
        destinationUrl: '',
        redirectControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new RedirectController({
        app: mockApp,
        props,
        world: mockWorld
      });
      
      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({});
        });
      }

      expect(mockWorld.open).not.toHaveBeenCalled();
    });
  });

  describe('[SERVER CONTEXT] Event listener initialization', () => {
    test('should register listeners when isServer is true and params.isServer is true', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'redirect',
          params: {
            isServer: true
          }
        }]
      };

      const serverWorld = {
        ...mockWorld,
        isServer: true,
        isClient: false,
        on: jest.fn()
      };

      const props = {
        ...mockProps,
        redirectControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new RedirectController({
        app: mockApp,
        props,
        world: serverWorld
      });

      expect(serverWorld.on).toHaveBeenCalledWith(testId, expect.any(Function));
    });

    test('should NOT register listeners when isServer is true but params.isServer is false', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'redirect',
          params: {
            isServer: false
          }
        }]
      };

      const serverWorld = {
        ...mockWorld,
        isServer: true,
        isClient: false,
        on: jest.fn()
      };

      const props = {
        ...mockProps,
        redirectControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new RedirectController({
        app: mockApp,
        props,
        world: serverWorld
      });

      expect(serverWorld.on).not.toHaveBeenCalledWith(testId, expect.any(Function));
    });

    test('should handle event when server receives it', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'redirect',
          params: {
            isServer: true
          }
        }]
      };

      const worldEventListeners = {};
      const serverWorld = {
        ...mockWorld,
        isServer: true,
        isClient: false,
        on: jest.fn((eventName, listener) => {
          if (!worldEventListeners[eventName]) {
            worldEventListeners[eventName] = [];
          }
          worldEventListeners[eventName].push(listener);
        })
      };

      const props = {
        ...mockProps,
        redirectControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      const controller = new RedirectController({
        app: mockApp,
        props,
        world: serverWorld
      });

      expect(serverWorld.on).toHaveBeenCalledWith(testId, expect.any(Function));

      const handleEventSpy = jest.spyOn(controller, '_handleEvent');

      if (worldEventListeners[testId]) {
        worldEventListeners[testId].forEach(listener => {
          listener({});
        });
      }

      expect(handleEventSpy).toHaveBeenCalledWith('redirect', expect.objectContaining({
        isServer: true
      }), {});

      handleEventSpy.mockRestore();
    });
  });

  describe('Accept any emitter', () => {
    test('should accept events emitted directly to appID when enabled (client context)', () => {
      const props = {
        ...mockProps,
        appID: 'test-app-id',
        redirectControllerAcceptAnyEmitter: true
      };

      new RedirectController({
        app: mockApp,
        props,
        world: mockWorld
      });
      
      mockApp.emit('test-app-id', {});

      expect(mockWorld.open).toHaveBeenCalledWith('https://example.com', true);
    });

    test('should broadcast to clients when server receives event with acceptAnyEmitter enabled', () => {
      const serverWorld = {
        ...mockWorld,
        isServer: true,
        isClient: false,
        on: jest.fn()
      };

      const props = {
        ...mockProps,
        appID: 'test-server-app',
        redirectControllerAcceptAnyEmitter: true
      };

      new RedirectController({
        app: mockApp,
        props,
        world: serverWorld
      });

      expect(serverWorld.on).toHaveBeenCalledWith('test-server-app', expect.any(Function));

      const worldOnCalls = serverWorld.on.mock.calls;
      const appIdListener = worldOnCalls.find(call => call[0] === 'test-server-app');
      
      if (appIdListener) {
        appIdListener[1]({});
      }

      expect(mockApp.send).toHaveBeenCalledWith('redirect-sc', {});
    });

    test('should execute redirect when client receives server broadcast', () => {
      const props = {
        ...mockProps,
        appID: 'test-client-app',
        redirectControllerAcceptAnyEmitter: false
      };

      new RedirectController({
        app: mockApp,
        props,
        world: mockWorld
      });

      expect(mockApp.on).toHaveBeenCalledWith('redirect-sc', expect.any(Function));

      const appOnCalls = mockApp.on.mock.calls;
      const redirectScListener = appOnCalls.find(call => call[0] === 'redirect-sc');
      
      if (redirectScListener) {
        redirectScListener[1]({});
      }

      expect(mockWorld.open).toHaveBeenCalledWith('https://example.com', true);
    });
  });
});

