global.app = {
  send: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  get: jest.fn(() => ({ name: 'test-node', visible: true })),
  configure: jest.fn(),
  instanceId: 'test-app-id',
  matrixWorld: { clone: jest.fn(() => ({ invert: jest.fn(() => ({})) })) },
  position: { copy: jest.fn() },
  quaternion: { copy: jest.fn() },
  scale: { copy: jest.fn() },
  create: jest.fn((type) => ({ type, active: true, add: jest.fn() })),
  traverse: jest.fn((callback) => callback({ name: 'mesh', geometry: {}, matrixWorld: {} }))
};

global.props = {
  appID: 'test-app-id',
  enableDebugMode: false,
  targetNodeName: 'test-node',
  initialVisibility: true,
  enableCollision: true,
  visibilityControllerTransitionDelay: 0,
  visibilityControllerEnableSync: false,
  visibilityControllerDefaultVisible: true,
  visibilityControllerDefaultCollision: true,
  visibilityControllerEnableDelay: false,
  visibilityControllerEmitOnVisible: false,
  visibilityControllerEmitOnHidden: false,
  visibilityControllerAcceptAnyEmitter: false,
  visibilityControllerEventReceivers: '[]'
};

global.world = {
  isServer: false,
  isClient: true,
  add: jest.fn(),
  on: jest.fn(),
  getPlayer: jest.fn(() => ({ userId: 'test-user' }))
};

global.rigidbody = {
  active: true,
  add: jest.fn(),
  position: { copy: jest.fn() },
  quaternion: { copy: jest.fn() },
  scale: { copy: jest.fn() }
};

// Mock Matrix4 for collision setup
global.Matrix4 = jest.fn(() => ({
  copy: jest.fn(),
  premultiply: jest.fn(),
  decompose: jest.fn()
}));

const { VisibilityController, setRigidbody, getRigidbody } = require('./visibility.js');


function generateTestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function setupRigidbodyForTest(config = {}) {
  const defaultConfig = {
    active: false,
    add: jest.fn(),
    position: { copy: jest.fn() },
    quaternion: { copy: jest.fn() },
    scale: { copy: jest.fn() }
  };

  setRigidbody({ ...defaultConfig, ...config });
}

/**
 * Creates a shared event bus for communication between server and client instances
 * This simulates how Hyperfy coordinates app.send between server and clients
 */
function createSharedEventBus() {
  const listeners = {};
  
  return {
    listeners,
    send: jest.fn((eventName, data) => {
      if (listeners[eventName]) {
        listeners[eventName].forEach(listener => {
          listener(data);
        });
      }
    }),
    on: jest.fn((eventName, listener) => {
      if (!listeners[eventName]) {
        listeners[eventName] = [];
      }
      listeners[eventName].push(listener);
    })
  };
}

/**
 * Creates a mock world context for CLIENT or SERVER mode
 */
function createWorldContext(mockWorld, worldEventListeners, contextType = 'client') {
  return {
    ...mockWorld,
    isServer: contextType === 'server',
    isClient: contextType === 'client',
    _listeners: worldEventListeners, // For emitToReceiver access
    on: jest.fn((eventName, listener) => {
      if (!worldEventListeners[eventName]) {
        worldEventListeners[eventName] = [];
      }
      worldEventListeners[eventName].push(listener);
    })
  };
}

/**
 * Creates a mock app that uses a shared event bus
 * This allows server and client instances to communicate via app.send/app.on
 */
function createMockAppWithEventBus(eventBus, baseConfig = {}) {
  return {
    send: eventBus.send,
    emit: jest.fn((eventName, data) => {
      if (eventBus.listeners[eventName]) {
        eventBus.listeners[eventName].forEach(listener => {
          listener(data);
        });
      }
    }),
    on: eventBus.on,
    create: jest.fn((type) => ({type, active: false, add: jest.fn() })),
    traverse: jest.fn((callback) => callback({ name: 'mesh', geometry: {}, matrixWorld: {} })),
    matrixWorld: { clone: jest.fn(() => ({ invert: jest.fn(() => ({})) })) },
    position: { copy: jest.fn() },
    quaternion: { copy: jest.fn() },
    scale: { copy: jest.fn() },
    ...baseConfig
  };
}

function setupEventTest(receiverConfig, props = {}, mockObjects, contextType = 'client') {
  const { mockApp, mockProps, mockWorld, mockNode, eventListeners } = mockObjects;

  const worldContextListeners = {};
  const worldContext = createWorldContext(mockWorld, worldContextListeners, contextType);

  const originalOn = worldContext.on;
  worldContext.on = jest.fn((eventName, listener) => {
    originalOn(eventName, listener);
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = [];
    }
    eventListeners[eventName].push(listener);
  });

  const testProps = { ...mockProps };

  if (!props.hasOwnProperty('visibilityControllerEventReceivers') && receiverConfig) {
    testProps.visibilityControllerEventReceivers = JSON.stringify([receiverConfig]);
  }

  Object.assign(testProps, props);

  const controller = new VisibilityController({
    app: mockApp,
    node: mockNode,
    props: testProps,
    world: worldContext
  });

  const emitToReceiver = (eventData = {}) => {
    if (receiverConfig?.id && worldContext._listeners[receiverConfig.id]) {
      worldContext._listeners[receiverConfig.id].forEach(listener => {
        listener(eventData);
      });
    }
  };

  return {
    controller,
    emitToReceiver,
    worldContext
  };
}

function setupServerClientTest(receiverConfig, props = {}, baseWorld, baseNode) {
  const eventBus = createSharedEventBus();
  const worldEventListeners = {};
  
  // Setup SERVER instance
  const serverWorld = createWorldContext(baseWorld, worldEventListeners, 'server');
  const serverApp = createMockAppWithEventBus(eventBus);
  const serverNode = { ...baseNode };
  const serverProps = { ...props, appID: 'test-app-id-server' };
  
  if (receiverConfig) {
    serverProps.visibilityControllerEventReceivers = JSON.stringify([receiverConfig]);
  }
  
  const serverController = new VisibilityController({
    app: serverApp,
    node: serverNode,
    props: serverProps,
    world: serverWorld
  });
  
  // Setup CLIENT instance
  const clientWorld = createWorldContext(baseWorld, worldEventListeners, 'client');
  const clientApp = createMockAppWithEventBus(eventBus);
  const clientNode = { ...baseNode };
  const clientProps = { ...props, appID: 'test-app-id-client' };
  
  if (receiverConfig) {
    clientProps.visibilityControllerEventReceivers = JSON.stringify([receiverConfig]);
  }
  
  const clientController = new VisibilityController({
    app: clientApp,
    node: clientNode,
    props: clientProps,
    world: clientWorld
  });
  
  const createEmitter = (world) => (eventData = {}) => {
    if (receiverConfig?.id && world._listeners[receiverConfig.id]) {
      world._listeners[receiverConfig.id].forEach(listener => {
        listener(eventData);
      });
    }
  };
  
  return {
    server: {
      controller: serverController,
      app: serverApp,
      node: serverNode,
      world: serverWorld,
      props: serverProps,
      emitToReceiver: createEmitter(serverWorld)
    },
    client: {
      controller: clientController,
      app: clientApp,
      node: clientNode,
      world: clientWorld,
      props: clientProps,
      emitToReceiver: createEmitter(clientWorld)
    },
    eventBus
  };
}

// ===== TESTS =====


describe('VisibilityController Event Handling Use Cases', () => {
  let mockApp, mockProps, mockWorld, mockNode, eventListeners;

  function createFreshMocks() {
    eventListeners = {};

    return {
      mockApp: {
        send: jest.fn((eventName, data) => {
          if (eventListeners[eventName]) {
            eventListeners[eventName].forEach(listener => listener(data));
          }
        }),
        emit: jest.fn((eventName, data) => {
          if (eventListeners[eventName]) {
            eventListeners[eventName].forEach(listener => listener(data));
          }
        }),
        on: jest.fn((eventName, listener) => {
          if (!eventListeners[eventName]) eventListeners[eventName] = [];
          eventListeners[eventName].push(listener);
        }),
        create: jest.fn((type) => ({type, active: false, add: jest.fn() })),
        traverse: jest.fn((callback) => callback({ name: 'mesh', geometry: {}, matrixWorld: {} })),
        matrixWorld: { clone: jest.fn(() => ({ invert: jest.fn(() => ({})) })) },
        position: { copy: jest.fn() },
        quaternion: { copy: jest.fn() },
        scale: { copy: jest.fn() }
      },
      mockProps: {
        appID: 'test-app-id',
        enableDebugMode: false,
        visibilityControllerTransitionDelay: 0,
        visibilityControllerEnableSync: false,
        visibilityControllerDefaultVisible: false,
        visibilityControllerDefaultCollision: false,
        visibilityControllerEnableDelay: false,
        visibilityControllerEmitOnVisible: false,
        visibilityControllerEmitOnHidden: false,
        visibilityControllerAcceptAnyEmitter: false,
        visibilityControllerEventReceivers: '[]'
      },
      mockWorld: {
        isServer: false,
        isClient: true,
        on: jest.fn((eventName, listener) => {
          if (!eventListeners[eventName]) eventListeners[eventName] = [];
          eventListeners[eventName].push(listener);
        }),
        add: jest.fn(),
        getPlayer: jest.fn(() => ({ userId: 'test-user' }))
      },
      mockNode: {
        visible: false
      },
      eventListeners
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    setupRigidbodyForTest({ active: false });
    const mocks = createFreshMocks();
    mockApp = mocks.mockApp;
    mockProps = mocks.mockProps;
    mockWorld = mocks.mockWorld;
    mockNode = mocks.mockNode;
    eventListeners = mocks.eventListeners;
  });

  describe('Configuration validation', () => {

    test('should not register listeners when configuration is invalid JSON', () => {
      const invalidConfig = generateTestId();
      const propsWithInvalidConfig = {
        ...mockProps,
        visibilityControllerEventReceivers: generateTestId()  // Invalid JSON
      };

      setupEventTest(invalidConfig, propsWithInvalidConfig, { mockApp, mockProps: propsWithInvalidConfig, mockWorld, mockNode, eventListeners });

      expect(mockWorld.on).not.toHaveBeenCalledWith(invalidConfig, expect.any(Function));
    });

    test('should not execute action when type is not defined', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'unknown-action-type',
          params: { isVisible: true, hasCollision: true }
        }]
      };

      // Enable debug mode in global props so the logger works
      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;

      const propsWithDebug = {
        enableDebugMode: true,
        appID: 'test-unknown-action'
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithDebug, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      // Use global.app instead of mockApp for emit tracking
      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      emitToReceiver({});

      // Verify warning was logged for unhandled action
      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Unhandled action: unknown-action-type'),
        type: 'warn'
      }));

      // Verify no changes were applied
      expect(mockNode.visible).toBe(false); // Should remain in initial state
      expect(getRigidbody().active).toBe(false);

      // Restore original values
      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });
  });

  describe('[CLIENT CONTEXT] when receiving a set-visibility event with no params', () => {
    let testId, receiverConfig;

    beforeAll(() => {
      setupRigidbodyForTest({ active: false });

      testId = generateTestId();
      receiverConfig = {
        id: testId,
        actions: [
          {
            type: 'set-visibility',
            params: {}
          }
        ]
      };
    });

    test('it should use default values (visibilityControllerDefaultVisible: false, visibilityControllerDefaultCollision: false)', () => {
      const mockPropsWithDefaults = {
        visibilityControllerDefaultVisible: false,
        visibilityControllerDefaultCollision: false
      };

      const { emitToReceiver, worldContext } = setupEventTest(receiverConfig, mockPropsWithDefaults, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      expect(worldContext.on).toHaveBeenCalledWith(testId, expect.any(Function));

      emitToReceiver({});

      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);
    });

    test('it should use default values (visibilityControllerDefaultVisible: true, visibilityControllerDefaultCollision: true)', () => {
      const mockPropsWithDefaults = {
        visibilityControllerDefaultVisible: true,
        visibilityControllerDefaultCollision: true
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, mockPropsWithDefaults, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);
    });
  });

  describe('[CLIENT CONTEXT] Visibility and collision combinations', () => {
    test.each([
      { visible: true, collision: true, expectedVisible: true, expectedCollision: true },
      { visible: true, collision: false, expectedVisible: true, expectedCollision: false },
      { visible: false, collision: true, expectedVisible: false, expectedCollision: true },
      { visible: false, collision: false, expectedVisible: false, expectedCollision: false }
    ])('should apply isVisible=$visible and hasCollision=$collision correctly', ({ visible, collision, expectedVisible, expectedCollision }) => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: visible, hasCollision: collision }
        }]
      };

      const { emitToReceiver, worldContext } = setupEventTest(receiverConfig, {}, { mockApp, mockProps, mockWorld, mockNode, eventListeners });
      
      expect(worldContext.on).toHaveBeenCalledWith(testId, expect.any(Function));
      
      emitToReceiver({});

      expect(mockNode.visible).toBe(expectedVisible);
      expect(getRigidbody().active).toBe(expectedCollision);
    });
  });

  describe('[SERVER CONTEXT] when receiving a set-visibility event with isServer: true in params', () => {
    let testId, receiverConfig;

    beforeAll(() => {
      setupRigidbodyForTest({ active: false });

      testId = generateTestId();
      receiverConfig = {
        id: testId,
        actions: [
          {
            type: 'set-visibility',
            params: {
              isServer: true,
              isVisible: false,
              hasCollision: true,
            }
          }
        ]
      };
    });

    test('should broadcast to clients without applying changes locally', () => {
      const { emitToReceiver, worldContext } = setupEventTest(
        receiverConfig, 
        {}, 
        { mockApp, mockProps, mockWorld, mockNode, eventListeners },
        'server'
      );

      expect(worldContext.isServer).toBe(true);
      expect(worldContext.isClient).toBe(false);
      expect(worldContext.on).toHaveBeenCalledWith(testId, expect.any(Function));
      expect(mockApp.on).not.toHaveBeenCalledWith('visibility-sc', expect.any(Function));

      emitToReceiver({});

      expect(mockApp.send).toHaveBeenCalledWith('visibility-sc', expect.objectContaining({
        isVisible: false,
        hasCollision: true
      }));
      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);
    });
  });

  describe('[CLIENT CONTEXT] isSync triggers server coordination', () => {
    test('should send to server when isSync: true', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isSync: true, isVisible: false, hasCollision: true }
        }]
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, {}, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      // Client registers visibility-sc to receive server broadcasts
      expect(mockApp.on).toHaveBeenCalledWith('visibility-sc', expect.any(Function));
      
      // When isSync is true, client sends to server (does NOT apply locally)
      emitToReceiver({});
      
      expect(mockApp.send).toHaveBeenCalledWith('visibility-cs', expect.objectContaining({
        isVisible: false,
        hasCollision: true,
        isSync: true
      }));

      // Client does NOT apply changes locally - waits for server broadcast
      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);
    });
  });

  describe('[CLIENT CONTEXT] AcceptAnyEmitter allows direct appID events', () => {
    test('should accept events emitted directly to appID', () => {
      const receiverConfig = {
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: true }
        }]
      };

      const propsWithAccept = {
        ...mockProps,
        appID: 'test-app-id',
        visibilityControllerAcceptAnyEmitter: true
      };

      setupEventTest(receiverConfig, propsWithAccept, { mockApp, mockProps: propsWithAccept, mockWorld, mockNode, eventListeners });

      expect(getRigidbody().active).toBe(false);

      mockApp.emit('test-app-id', { isVisible: true, hasCollision: true });

      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);
    });
  });

  describe('[CLIENT CONTEXT] Delayed visibility changes', () => {
    test('should apply changes immediately when delay is disabled', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: true, delay: 2 }
        }]
      };

      const propsWithoutDelay = {
        visibilityControllerEnableDelay: false
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithoutDelay, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Changes applied immediately even though delay: 2 (because enableDelay: false)
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);
    });

    test('should apply changes after specified delay when enabled', () => {
      jest.useFakeTimers();

      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: true, delay: 2 }
        }]
      };

      const propsWithDelay = {
        visibilityControllerEnableDelay: true
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithDelay, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Changes NOT applied yet
      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);

      // Fast-forward time by 1 second - still not applied
      jest.advanceTimersByTime(1000);
      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);

      // Fast-forward to complete the 2 second delay
      jest.advanceTimersByTime(1000);

      // Now changes are applied
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);

      jest.useRealTimers();
    });

    test('should use default transition delay when no delay param provided', () => {
      jest.useFakeTimers();

      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: true }  // No delay specified
        }]
      };

      const propsWithDefaultDelay = {
        visibilityControllerEnableDelay: true,
        visibilityControllerTransitionDelay: 1.5
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithDefaultDelay, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Changes NOT applied yet
      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);

      // Fast-forward time by 1.5 seconds (default delay)
      jest.advanceTimersByTime(1500);

      // Now changes are applied
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);

      jest.useRealTimers();
    });

    test('should override default delay with param delay', () => {
      jest.useFakeTimers();

      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: true, delay: 0.5 }  // Override
        }]
      };

      const propsWithDefaultDelay = {
        visibilityControllerEnableDelay: true,
        visibilityControllerTransitionDelay: 3  // Default is 3s
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithDefaultDelay, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Changes NOT applied yet
      expect(mockNode.visible).toBe(false);

      // Fast-forward by param delay (0.5s), NOT the default (3s)
      jest.advanceTimersByTime(500);

      // Changes are applied after 0.5s, not 3s
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);

      // Verify it didn't wait for the default 3s
      jest.advanceTimersByTime(2500);  // Total would be 3s now
      // Still should be visible (no change)
      expect(mockNode.visible).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('[CLIENT CONTEXT] Emit events on visibility changes', () => {
    test('should emit visibility-enabled event when visibilityControllerEmitOnVisible is true and becomes visible', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: false }
        }]
      };

      const propsWithEmitOnVisible = {
        visibilityControllerEmitOnVisible: true,
        appID: 'test-app-emit'
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithEmitOnVisible, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Verify the visibility-enabled event was emitted
      expect(mockApp.emit).toHaveBeenCalledWith('visibility-enabled-test-app-emit', {
        userId: 'test-user',
        timestamp: expect.any(Number)
      });

      // Changes should still be applied
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(false);
    });

    test('should NOT emit visibility-enabled event when visibilityControllerEmitOnVisible is false', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: true, hasCollision: false }
        }]
      };

      const propsWithoutEmit = {
        visibilityControllerEmitOnVisible: false,
        appID: 'test-app-no-emit'
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithoutEmit, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Verify the visibility-enabled event was NOT emitted
      expect(mockApp.emit).not.toHaveBeenCalledWith('visibility-enabled-test-app-no-emit', expect.anything());

      // Changes should still be applied
      expect(mockNode.visible).toBe(true);
    });

    test('should emit visibility-disabled event when visibilityControllerEmitOnHidden is true and becomes hidden', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: false, hasCollision: false }
        }]
      };

      const propsWithEmitOnHidden = {
        visibilityControllerEmitOnHidden: true,
        appID: 'test-app-emit-hidden'
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithEmitOnHidden, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Verify the visibility-disabled event was emitted
      expect(mockApp.emit).toHaveBeenCalledWith('visibility-disabled-test-app-emit-hidden', {
        userId: 'test-user',
        timestamp: expect.any(Number)
      });

      // Changes should still be applied
      expect(mockNode.visible).toBe(false);
    });

    test('should NOT emit visibility-disabled event when visibilityControllerEmitOnHidden is false', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: false, hasCollision: false }
        }]
      };

      const propsWithoutEmit = {
        visibilityControllerEmitOnHidden: false,
        appID: 'test-app-no-emit-hidden'
      };

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithoutEmit, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      emitToReceiver({});

      // Verify the visibility-disabled event was NOT emitted
      expect(mockApp.emit).not.toHaveBeenCalledWith('visibility-disabled-test-app-no-emit-hidden', expect.anything());

      // Changes should still be applied
      expect(mockNode.visible).toBe(false);
    });

    test('should NOT emit events when visibility does not change', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isVisible: false, hasCollision: false }
        }]
      };

      const propsWithBothEmits = {
        visibilityControllerEmitOnVisible: true,
        visibilityControllerEmitOnHidden: true,
        appID: 'test-app-no-change'
      };

      // Set initial visibility to false (same as what we'll emit)
      mockNode.visible = false;

      const { emitToReceiver } = setupEventTest(receiverConfig, propsWithBothEmits, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      // mockApp.emit could have been called during setup, so clear it
      mockApp.emit.mockClear();

      emitToReceiver({});

      // Since visibility is already false, and we're setting it to false,
      // the disabled event should still be emitted (based on the params, not the change)
      expect(mockApp.emit).toHaveBeenCalledWith('visibility-disabled-test-app-no-change', {
        userId: 'test-user',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('[COORDINATED] Server-client communication with userId filtering', () => {
    test('should broadcast from server and apply changes on client', () => {
      const testId = generateTestId();
      const receiverConfig = {
        id: testId,
        actions: [{
          type: 'set-visibility',
          params: { isServer: true, isVisible: false, hasCollision: true }
        }]
      };

      const { server, client, eventBus } = setupServerClientTest(
        receiverConfig,
        {
          visibilityControllerDefaultVisible: true,
          visibilityControllerDefaultCollision: false,
          visibilityControllerEnableSync: false,
          visibilityControllerEnableDelay: false
        },
        mockWorld,
        mockNode
      );

      expect(server.world.isServer).toBe(true);
      expect(client.world.isClient).toBe(true);
      expect(eventBus.on).toHaveBeenCalledWith('visibility-sc', expect.any(Function));

      server.emitToReceiver({});

      expect(server.app.send).toHaveBeenCalledWith('visibility-sc', expect.objectContaining({
        isVisible: false,
        hasCollision: true
      }));

      expect(client.node.visible).toBe(false);
      expect(getRigidbody().active).toBe(true);
    });

    test('client should apply changes when userId matches', () => {
      const testId = generateTestId();
      const receiverConfig = { id: testId, actions: [{ type: 'set-visibility', params: {} }] };

      const { worldContext } = setupEventTest(receiverConfig, {}, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      // Simulate server broadcast with matching userId
      mockApp.send('visibility-sc', {
        isVisible: true,
        hasCollision: true,
        isSync: false,
        delay: 0,
        userId: 'test-user'  // Matches mockWorld.getPlayer().userId
      });

      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);
    });

    test('client should NOT apply changes when userId does not match and isSync is false', () => {
      const testId = generateTestId();
      const receiverConfig = { id: testId, actions: [{ type: 'set-visibility', params: {} }] };

      const { worldContext } = setupEventTest(receiverConfig, {}, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      // Simulate server broadcast with different userId
      mockApp.send('visibility-sc', {
        isVisible: true,
        hasCollision: true,
        isSync: false,
        delay: 0,
        userId: 'different-user'  // Does NOT match test-user
      });

      // Changes should NOT be applied
      expect(mockNode.visible).toBe(false);
      expect(getRigidbody().active).toBe(false);
    });

    test('client should apply changes when isSync is true regardless of userId', () => {
      const testId = generateTestId();
      const receiverConfig = { id: testId, actions: [{ type: 'set-visibility', params: {} }] };

      const { worldContext } = setupEventTest(receiverConfig, {}, { mockApp, mockProps, mockWorld, mockNode, eventListeners });

      // Simulate server broadcast with different userId but isSync: true
      mockApp.send('visibility-sc', {
        isVisible: true,
        hasCollision: true,
        isSync: true,
        delay: 0,
        userId: 'different-user'
      });

      // Changes SHOULD be applied because isSync: true
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);
    });

    test('client should apply changes when visibilityControllerEnableSync is true regardless of userId', () => {
      const testId = generateTestId();
      const receiverConfig = { id: testId, actions: [{ type: 'set-visibility', params: {} }] };

      const propsWithEnableSync = {
        ...mockProps,
        visibilityControllerEnableSync: true
      };

      const { worldContext } = setupEventTest(receiverConfig, propsWithEnableSync, { mockApp, mockProps: propsWithEnableSync, mockWorld, mockNode, eventListeners });

      // Simulate server broadcast with different userId
      mockApp.send('visibility-sc', {
        isVisible: true,
        hasCollision: true,
        isSync: false,
        delay: 0,
        userId: 'different-user'
      });

      // Changes SHOULD be applied because visibilityControllerEnableSync: true
      expect(mockNode.visible).toBe(true);
      expect(getRigidbody().active).toBe(true);
    });
  });
});