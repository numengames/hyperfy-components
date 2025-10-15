global.app = {
  send: jest.fn(),
  emit: jest.fn(),
  on: jest.fn()
};

global.props = {
  appID: 'test-app-id',
  enableDebugMode: false,
  teleportControllerAcceptAnyEmitter: false,
  teleportControllerEventReceivers: '[]'
};

global.world = {
  isServer: false,
  isClient: true,
  on: jest.fn(),
  getPlayer: jest.fn((playerId) => ({
    id: playerId,
    teleport: jest.fn()
  }))
};

global.Vector3 = jest.fn((x, y, z) => ({ x, y, z }));

const { TeleportController } = require('./teleport.js');

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
    getPlayer: jest.fn((playerId) => ({
      id: playerId,
      teleport: jest.fn()
    }))
  };

  const mockNode = {
    matrixWorld: {
      toArray: jest.fn(() => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 1])
    }
  };

  return {
    mockApp,
    mockProps,
    mockWorld,
    mockNode,
    eventListeners
  };
}

describe('TeleportController Event Handling Use Cases', () => {
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
        teleportControllerEventReceivers: 'invalid-json'
      };

      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;
      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      new TeleportController({
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
        config: { actions: [{ type: 'teleport', params: {} }] }
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
        teleportControllerEventReceivers: invalidReceiverConfig
      };

      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      new TeleportController({
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
        ...mockProps,
        enableDebugMode: true,
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      const controller = new TeleportController({
        app: mockApp,
        node: mockNode,
        props: propsWithDebug,
        world: mockWorld
      });

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

  describe('Teleport functionality', () => {
    test('should teleport player when receiving valid teleport event', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'teleport',
          params: {}
        }]
      };

      const props = {
        ...mockProps,
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      const mockPlayer = { id: 'TdzHaGl5fN', teleport: jest.fn() };
      mockWorld.getPlayer.mockReturnValue(mockPlayer);

      new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: mockWorld
      });
      
      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({ playerId: 'TdzHaGl5fN' });
        });
      }

      expect(mockWorld.getPlayer).toHaveBeenCalledWith('TdzHaGl5fN');
      expect(mockPlayer.teleport).toHaveBeenCalledWith(expect.objectContaining({
        x: 10,
        y: 20,
        z: 30
      }));
    });

    test('should emit teleport-complete event after successful teleport', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'teleport',
          params: {}
        }]
      };

      const props = {
        ...mockProps,
        appID: 'test-teleport-123',
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: mockWorld
      });

      mockApp.emit.mockClear();

      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({ playerId: 'TdzHaGl5fN' });
        });
      }

      expect(mockApp.emit).toHaveBeenCalledWith('teleport-complete-test-teleport-123', expect.objectContaining({
        playerId: 'TdzHaGl5fN',
        destination: { x: 10, y: 20, z: 30 },
        timestamp: expect.any(Number)
      }));
    });

    test('should not teleport when playerId is missing', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'teleport',
          params: {}
        }]
      };

      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;

      const props = {
        ...mockProps,
        enableDebugMode: true,
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      new TeleportController({
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

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Teleport canceled: missing playerId'),
        type: 'warn'
      }));
      expect(mockWorld.getPlayer).not.toHaveBeenCalled();

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });

    test('should not teleport when player is not found', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'teleport',
          params: {}
        }]
      };

      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;

      const props = {
        ...mockProps,
        enableDebugMode: true,
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      const worldWithNoPlayer = {
        ...mockWorld,
        getPlayer: jest.fn(() => null)
      };

      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: worldWithNoPlayer
      });

      if (eventListeners[testId]) {
        eventListeners[testId].forEach(listener => {
          listener({ playerId: 'non-existent-player' });
        });
      }

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Teleport canceled: player with id non-existent-player not found'),
        type: 'warn'
      }));

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });
  });

  describe('[SERVER CONTEXT] Event listener initialization', () => {
    test('should register listeners when isServer is true and params.isServer is true', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'teleport',
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
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new TeleportController({
        app: mockApp,
        node: mockNode,
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
          type: 'teleport',
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
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      new TeleportController({
        app: mockApp,
        node: mockNode,
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
          type: 'teleport',
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
        teleportControllerEventReceivers: JSON.stringify([receiverConfig])
      };

      const controller = new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: serverWorld
      });

      expect(serverWorld.on).toHaveBeenCalledWith(testId, expect.any(Function));

      const handleEventSpy = jest.spyOn(controller, '_handleEvent');

      if (worldEventListeners[testId]) {
        worldEventListeners[testId].forEach(listener => {
          listener({ playerId: 'TdzHaGl5fN' });
        });
      }

      expect(handleEventSpy).toHaveBeenCalledWith('teleport', expect.objectContaining({
        isServer: true
      }), { playerId: 'TdzHaGl5fN' });

      handleEventSpy.mockRestore();
    });
  });

  describe('Accept any emitter', () => {
    test('should accept events emitted directly to appID when enabled (client context)', () => {
      const props = {
        ...mockProps,
        appID: 'test-app-id',
        teleportControllerAcceptAnyEmitter: true
      };

      const mockPlayer = { id: 'TdzHaGl5fN', teleport: jest.fn() };
      mockWorld.getPlayer.mockReturnValue(mockPlayer);

      new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: mockWorld
      });
      
      mockApp.emit('test-app-id', { playerId: 'TdzHaGl5fN' });

      expect(mockPlayer.teleport).toHaveBeenCalledWith(expect.objectContaining({
        x: 10,
        y: 20,
        z: 30
      }));
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
        teleportControllerAcceptAnyEmitter: true
      };

      new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: serverWorld
      });

      expect(serverWorld.on).toHaveBeenCalledWith('test-server-app', expect.any(Function));

      const worldOnCalls = serverWorld.on.mock.calls;
      const appIdListener = worldOnCalls.find(call => call[0] === 'test-server-app');
      
      if (appIdListener) {
        appIdListener[1]({ playerId: 'KpL9mN3qRt' });
      }

      expect(mockApp.send).toHaveBeenCalledWith('teleport-sc', { playerId: 'KpL9mN3qRt' });
    });

    test('should execute teleport when client receives server broadcast', () => {
      const props = {
        ...mockProps,
        appID: 'test-client-app',
        teleportControllerAcceptAnyEmitter: false
      };

      const mockPlayer = { id: 'Zx7Yw3Vn8M', teleport: jest.fn() };
      mockWorld.getPlayer.mockReturnValue(mockPlayer);

      new TeleportController({
        app: mockApp,
        node: mockNode,
        props,
        world: mockWorld
      });

      expect(mockApp.on).toHaveBeenCalledWith('teleport-sc', expect.any(Function));

      const appOnCalls = mockApp.on.mock.calls;
      const teleportScListener = appOnCalls.find(call => call[0] === 'teleport-sc');
      
      if (teleportScListener) {
        teleportScListener[1]({ playerId: 'Zx7Yw3Vn8M' });
      }

      expect(mockPlayer.teleport).toHaveBeenCalledWith(expect.objectContaining({
        x: 10,
        y: 20,
        z: 30
      }));
    });
  });
});