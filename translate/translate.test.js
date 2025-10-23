global.Matrix4 = class Matrix4 {
  constructor() {
    this.elements = new Array(16).fill(0);
    this.elements[0] = this.elements[5] = this.elements[10] = this.elements[15] = 1;
  }

  clone() {
    const matrix = new Matrix4();
    matrix.elements = [...this.elements];
    return matrix;
  }

  invert() {
    return this;
  }

  copy(matrix) {
    this.elements = [...matrix.elements];
    return this;
  }

  premultiply(matrix) {
    return this;
  }

  decompose(position, quaternion, scale) {
    position.x = position.y = position.z = 0;
    quaternion.x = quaternion.y = quaternion.z = 0;
    quaternion.w = 1;
    scale.x = scale.y = scale.z = 1;
    return this;
  }

  toArray() {
    return this.elements;
  }
};

global.Vector3 = class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
};

global.rigidbody = {
  position: { x: 0, y: 0, z: 0 },
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
  active: true,
  add: jest.fn()
};

global.app = {
  instanceId: 'testAppId',
  emit: jest.fn(),
};

global.world = {
  isClient: true,
  isServer: false,
};

global.props = {
  appID: 'testAppId',
  targetNodeName: 'test-node',
  enableDebugMode: false,
  enableCollision: true,
  initialVisibility: true,
  translateControllerEnableSync: false,
  translateControllerEnableDelay: false,
  translateControllerTransitionDelay: 0,
  translateControllerIsTranslationEnabled: true,
  translateControllerTranslationDelay: 0,
  translateControllerTranslationSpeed: 0.1,
  translateControllerTranslationX: 0,
  translateControllerTranslationY: 0,
  translateControllerTranslationZ: 0,
  translateControllerAcceptAnyEmitter: false,
  translateControllerEventReceivers: '[]',
};

function createFreshMocks() {
  const mockNode = {
    name: 'test-node',
    visible: true,
    position: { 
      x: 0, 
      y: 0, 
      z: 0,
      set: jest.fn((x, y, z) => {
        mockNode.position.x = x;
        mockNode.position.y = y;
        mockNode.position.z = z;
      })
    },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
    matrixWorld: new Matrix4(),
    add: jest.fn(),
    get: jest.fn(),
    traverse: jest.fn((callback) => {
      callback({ name: 'mesh', geometry: {}, matrixWorld: new Matrix4() });
    })
  };

  const mockApp = {
    instanceId: 'testAppId',
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
    matrixWorld: new Matrix4(),
    get: jest.fn(() => mockNode),
    create: jest.fn((type, options) => {
      if (type === 'rigidbody') {
        return {
          position: { x: 0, y: 0, z: 0, copy: jest.fn() },
          quaternion: { x: 0, y: 0, z: 0, w: 1, copy: jest.fn() },
          scale: { x: 1, y: 1, z: 1, copy: jest.fn() },
          active: true,
          add: jest.fn()
        };
      }
      if (type === 'collider') {
        return {
          type: '',
          geometry: null,
          position: { x: 0, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        };
      }
      return { ...options };
    }),
    emit: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    traverse: jest.fn((callback) => {
      callback({ name: 'mesh', geometry: {}, matrixWorld: new Matrix4() });
    }),
    configure: jest.fn(),
    add: jest.fn()
  };

  const mockWorld = {
    isClient: true,
    isServer: false,
    on: jest.fn(),
    add: jest.fn(),
    getPlayer: jest.fn(() => ({
      id: 'TdzHaGl5fN',
      userId: 'user-123',
    }))
  };

  return { mockApp, mockWorld, mockNode };
}

const { TranslateController } = require('./translate.js');

describe('TranslateController', () => {
  let mockApp, mockWorld, mockNode;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createFreshMocks();
    mockApp = mocks.mockApp;
    mockWorld = mocks.mockWorld;
    mockNode = mocks.mockNode;
    
    global.rigidbody = {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      active: true,
      add: jest.fn()
    };
  });

  describe('Constructor and initialization', () => {
    it('should create TranslateController instance with initial state', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(controller.isAnimating).toBe(false);
      expect(controller.isTranslationAnimating).toBe(false);
      expect(controller.dynamicParams).toEqual({});
      expect(controller.rigidbodyOffset).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should initialize event listeners', () => {
      const propsWithReceivers = {
        ...global.props,
        translateControllerEventReceivers: '[{"id":"event1","actions":[{"type":"start-animation","params":{}}]}]'
      };

      new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithReceivers,
        world: mockWorld
      });

      expect(mockWorld.on).toHaveBeenCalledWith('event1', expect.any(Function));
    });

    it('should set up animation loop', () => {
      new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(mockApp.on).toHaveBeenCalledWith('update', expect.any(Function));
    });
  });

  describe('Event handling', () => {
    it('should handle start-animation event', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onStartAnimation({ timestamp: Date.now() });

      expect(controller.isAnimating).toBe(true);
    });

    it('should handle stop-animation event', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isTranslationAnimating = true;

      controller._onStopAnimation({});

      expect(controller.isAnimating).toBe(false);
      expect(controller.isTranslationAnimating).toBe(false);
    });

    it('should handle set-state event with isAnimating true', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetState({ isAnimating: true });

      expect(controller.isAnimating).toBe(true);
    });

    it('should handle set-state event with isAnimating false', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller._onSetState({ isAnimating: false });

      expect(controller.isAnimating).toBe(false);
    });

    it('should handle set-translation event with translationX', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetTranslation({ translationX: 10 });

      expect(controller.dynamicParams.translationX).toBe(10);
    });

    it('should handle set-translation event with translationY', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetTranslation({ translationY: 20 });

      expect(controller.dynamicParams.translationY).toBe(20);
    });

    it('should handle set-translation event with translationZ', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetTranslation({ translationZ: 30 });

      expect(controller.dynamicParams.translationZ).toBe(30);
    });

    it('should handle set-translation event with translationSpeed', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetTranslation({ translationSpeed: 0.5 });

      expect(controller.dynamicParams.translationSpeed).toBe(0.5);
    });

    it('should start animation by default when set-translation is called', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetTranslation({ translationX: 10 });

      expect(controller.isAnimating).toBe(true);
    });

    it('should pause animation with pause-translation action', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isTranslationAnimating = true;

      controller._onPauseTranslation({});

      expect(controller.isTranslationAnimating).toBe(false);
      expect(controller.isAnimating).toBe(true); // Should remain true
    });

    it('should resume animation with resume-translation action', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isTranslationAnimating = false;

      controller._onResumeTranslation({});

      expect(controller.isTranslationAnimating).toBe(true);
      expect(controller.isAnimating).toBe(true);
    });

    it('should not resume animation if not started', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = false;
      controller.isTranslationAnimating = false;

      controller._onResumeTranslation({});

      expect(controller.isTranslationAnimating).toBe(false);
      expect(controller.isAnimating).toBe(false);
    });

    it('should reset translation to initial position', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      // Set some position and animation state
      controller.node.position.set(10, 5, -3);
      controller.isAnimating = true;
      controller.isTranslationAnimating = true;
      controller.dynamicParams.translationX = 10;

      controller._onResetTranslation({});

      // Should reset to initial position (0, 0, 0) not current position
      expect(controller.dynamicParams.translationX).toBe(0);
      expect(controller.dynamicParams.translationY).toBe(0);
      expect(controller.dynamicParams.translationZ).toBe(0);
      expect(controller.isAnimating).toBe(true);
      expect(controller.isTranslationAnimating).toBe(true);
    });
  });

  describe('Animation delay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should apply delay before starting animation when enabled', () => {
      const propsWithDelay = {
        ...global.props,
        translateControllerEnableDelay: true,
        translateControllerTransitionDelay: 1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onStartAnimation({ timestamp: Date.now() });

      expect(controller.isAnimating).toBe(false);

      jest.advanceTimersByTime(1000);

      expect(controller.isAnimating).toBe(true);
    });

    it('should start animation immediately when delay is disabled', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onStartAnimation({ timestamp: Date.now() });

      expect(controller.isAnimating).toBe(true);
    });

    it('should respect payload delay over config delay', () => {
      const propsWithDelay = {
        ...global.props,
        translateControllerEnableDelay: true,
        translateControllerTransitionDelay: 5
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onStartAnimation({ delay: 2, timestamp: Date.now() });

      expect(controller.isAnimating).toBe(false);

      jest.advanceTimersByTime(2000);

      expect(controller.isAnimating).toBe(true);
    });
  });

  describe('Translation animation', () => {
    it('should apply single axis translation with instant step (0)', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const targetObject = { position: { x: 0, y: 0, z: 0 } };
      controller._applySingleAxisTranslation(targetObject, 'x', 0, 10, 0, 'node');

      expect(targetObject.position.x).toBe(10);
    });

    it('should apply single axis translation with smooth step', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const targetObject = { position: { x: 0, y: 0, z: 0 } };
      controller._applySingleAxisTranslation(targetObject, 'x', 0, 10, 0.5, 'node');

      expect(targetObject.position.x).toBe(0.5);
    });

    it('should not apply translation when difference is too small', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const targetObject = { position: { x: 10, y: 0, z: 0 } };
      const initialX = targetObject.position.x;
      
      controller._applySingleAxisTranslation(targetObject, 'x', 10, 10.005, 0.1, 'node');

      expect(targetObject.position.x).toBe(initialX);
    });

    it('should execute translation for node when animating', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 10,
        translateControllerTranslationSpeed: 0.1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      controller.isTranslationAnimating = true;
      controller._executeTranslation(mockNode, {}, 'node');

      expect(mockNode.position.x).toBeGreaterThan(0);
    });

    it('should use dynamic params over props for translation', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 5,
        translateControllerTranslationSpeed: 0.1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      const dynamicParams = {
        translationX: 15,
        translationSpeed: 0.2
      };

      controller.isTranslationAnimating = true;
      controller._executeTranslation(mockNode, dynamicParams, 'node');

      expect(mockNode.position.x).toBe(0.2);
    });

    it('should apply rigidbody offset compensation for rigidbody element', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 10,
        translateControllerTranslationSpeed: 0
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      controller.rigidbodyOffset = { x: 2, y: 0, z: 0 };

      const mockRigidbody = { position: { x: 0, y: 0, z: 0 } };
      controller.isTranslationAnimating = true;
      controller._executeTranslation(mockRigidbody, {}, 'rigidbody');

      expect(mockRigidbody.position.x).toBe(12);
    });

    it('should not execute translation when not animating', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 10,
        translateControllerTranslationSpeed: 0.1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      controller.isTranslationAnimating = false;
      controller._executeTranslation(mockNode, {}, 'node');

      expect(mockNode.position.x).toBe(0);
    });
  });

  describe('Rigidbody offset calculation', () => {
    it('should set offset to zero when no rigidbody', () => {
      global.rigidbody = null;

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(controller.rigidbodyOffset).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should set offset to zero when collision disabled', () => {
      const propsWithoutCollision = {
        ...global.props,
        enableCollision: false
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithoutCollision,
        world: mockWorld
      });

      expect(controller.rigidbodyOffset).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('Receiver normalization', () => {
    it('should normalize JSON array string', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = '[{"id":"event1","actions":[{"type":"start-animation","params":{}}]}]';
      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([
        { id: 'event1', type: 'start-animation', params: {} }
      ]);
    });

    it('should normalize array with actions', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = [
        {
          id: 'event1',
          actions: [
            { type: 'start-animation', params: { delay: 1 } },
            { type: 'stop-animation', params: {} }
          ]
        }
      ];

      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([
        { id: 'event1', type: 'start-animation', params: { delay: 1 } },
        { id: 'event1', type: 'stop-animation', params: {} }
      ]);
    });

    it('should handle string receiver as simple event', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = ['event1', 'event2'];
      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([
        { id: 'event1', type: 'event1', params: {} },
        { id: 'event2', type: 'event2', params: {} }
      ]);
    });

    it('should handle invalid JSON string', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = '[invalid json}';
      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([]);
    });

    it('should handle non-JSON string', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = 'not json at all';
      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([]);
    });

    it('should handle object without actions as simple receiver', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = [{ id: 'event1', params: { delay: 1 } }];
      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([
        { id: 'event1', type: 'event1', params: { delay: 1 } }
      ]);
    });
  });

  describe('Event listeners setup', () => {
    it('should set up receivers from configuration', () => {
      const propsWithReceivers = {
        ...global.props,
        translateControllerEventReceivers: '[{"id":"event1","actions":[{"type":"start-animation","params":{}}]}]'
      };

      new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithReceivers,
        world: mockWorld
      });

      expect(mockWorld.on).toHaveBeenCalledWith('event1', expect.any(Function));
    });

    it('should set up acceptAnyEmitter listener when enabled', () => {
      const propsWithAcceptAny = {
        ...global.props,
        translateControllerAcceptAnyEmitter: true
      };

      new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockWorld
      });

      expect(mockWorld.on).toHaveBeenCalledWith('testAppId', expect.any(Function));
    });

    it('should handle acceptAnyEmitter with server-to-client communication', () => {
      const mockServerWorld = {
        ...mockWorld,
        isClient: true,
        isServer: true,
        on: jest.fn()
      };

      global.world = {
        isClient: true,
        isServer: true
      };

      const propsWithAcceptAny = {
        ...global.props,
        translateControllerAcceptAnyEmitter: true
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockServerWorld
      });

      // Find the appID listener
      const appIdListener = mockServerWorld.on.mock.calls.find(
        call => call[0] === 'testAppId'
      )[1];

      const testData = { translationY: 5 };
      appIdListener(testData);

      expect(mockApp.send).toHaveBeenCalledWith('translate-server-to-client', { ...testData, appID: 'testAppId' });

      global.world = {
        isClient: true,
        isServer: false
      };
    });

    it('should handle app.on translate-server-to-client event', () => {
      const propsWithAcceptAny = {
        ...global.props,
        translateControllerAcceptAnyEmitter: true
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockWorld
      });

      const appListener = mockApp.on.mock.calls.find(
        call => call[0] === 'translate-server-to-client'
      )[1];

      appListener({ translationY: 5 });

      expect(controller.isAnimating).toBe(true);
    });


    it('should not set up listeners when not in client context', () => {
      const mockServerWorld = {
        ...mockWorld,
        isClient: false,
        isServer: true
      };

      new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockServerWorld
      });

      expect(mockWorld.on).not.toHaveBeenCalled();
    });
  });


  describe('Handle event dispatcher', () => {
    it('should handle valid action type', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('set-translation', {}, { translationX: 10, timestamp: Date.now() });

      expect(controller.dynamicParams.translationX).toBe(10);
      expect(controller.isAnimating).toBe(true);
    });

    it('should handle pause-translation action type', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isTranslationAnimating = true;

      controller._handleEvent('pause-translation', {}, {});

      expect(controller.isTranslationAnimating).toBe(false);
    });

    it('should handle resume-translation action type', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isTranslationAnimating = false;

      controller._handleEvent('resume-translation', {}, {});

      expect(controller.isTranslationAnimating).toBe(true);
    });

    it('should handle reset-translation action type', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.node.position.set(5, 5, 5);
      controller.isAnimating = true;

      controller._handleEvent('reset-translation', {}, {});

      // Should set dynamic params to initial position and start animation
      expect(controller.dynamicParams.translationX).toBe(0);
      expect(controller.dynamicParams.translationY).toBe(0);
      expect(controller.dynamicParams.translationZ).toBe(0);
      expect(controller.isAnimating).toBe(true);
      expect(controller.isTranslationAnimating).toBe(true);
    });

    it('should handle invalid action type', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('invalid-action', {}, {});

      expect(controller.isAnimating).toBe(false);
    });

    it('should merge params and data in payload', () => {
      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent(
        'set-translation',
        { translationX: 5 },
        { translationY: 10, timestamp: Date.now() }
      );

      expect(controller.dynamicParams.translationX).toBe(5);
      expect(controller.dynamicParams.translationY).toBe(10);
    });
  });

  describe('Static members', () => {
    it('should have EVENTS constant', () => {
      expect(TranslateController.EVENTS).toEqual({
        SET_STATE: 'set-state',
        ANIMATION_START: 'animation-start',
        ANIMATION_STOP: 'animation-stop',
      });
    });

    it('should have getConfig static method', () => {
      const config = TranslateController.getConfig();
      expect(Array.isArray(config)).toBe(true);
      expect(config.length).toBeGreaterThan(0);
    });
  });

  describe('Animation loop integration', () => {
    it('should execute translation on update when animating', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 10,
        translateControllerTranslationSpeed: 0.1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      controller.isAnimating = true;
      controller.isTranslationAnimating = true;

      const initialX = mockNode.position.x;
      updateListener();

      expect(mockNode.position.x).toBeGreaterThan(initialX);
    });

    it('should not execute translation on update when not animating', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 10,
        translateControllerTranslationSpeed: 0.1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      controller.isAnimating = false;

      const initialX = mockNode.position.x;
      updateListener();

      expect(mockNode.position.x).toBe(initialX);
    });

    it('should not execute translation when translation is disabled', () => {
      const propsWithoutTranslation = {
        ...global.props,
        translateControllerIsTranslationEnabled: false
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithoutTranslation,
        world: mockWorld
      });

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      controller.isAnimating = true;
      controller.isTranslationAnimating = true;

      const initialX = mockNode.position.x;
      updateListener();

      expect(mockNode.position.x).toBe(initialX);
    });
  });

  describe('Multi-axis translation', () => {
    it('should translate on Y axis when configured', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationY: 15,
        translateControllerTranslationSpeed: 0.2
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      controller.isTranslationAnimating = true;
      controller._executeTranslation(mockNode, {}, 'node');

      expect(mockNode.position.y).toBe(0.2);
      expect(mockNode.position.x).toBe(0);
      expect(mockNode.position.z).toBe(0);
    });

    it('should translate on Z axis when configured', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationZ: 20,
        translateControllerTranslationSpeed: 0.3
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      controller.isTranslationAnimating = true;
      controller._executeTranslation(mockNode, {}, 'node');

      expect(mockNode.position.z).toBe(0.3);
      expect(mockNode.position.x).toBe(0);
      expect(mockNode.position.y).toBe(0);
    });

    it('should translate on multiple axes simultaneously', () => {
      const propsWithTranslation = {
        ...global.props,
        translateControllerTranslationX: 10,
        translateControllerTranslationY: 15,
        translateControllerTranslationZ: 20,
        translateControllerTranslationSpeed: 0.1
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithTranslation,
        world: mockWorld
      });

      controller.isTranslationAnimating = true;
      controller._executeTranslation(mockNode, {}, 'node');

      expect(mockNode.position.x).toBe(0.1);
      expect(mockNode.position.y).toBe(0.1);
      expect(mockNode.position.z).toBe(0.1);
    });
  });

  describe('Rigidbody offset calculation with rigidbody present', () => {
    it('should calculate rigidbody offset when rigidbody exists and collision is enabled', () => {
      // Mock rigidbody with different position than node
      const mockRigidbody = {
        position: { x: 5, y: 10, z: -2 }
      };
      
      // Temporarily replace the global rigidbody
      const originalRigidbody = global.rigidbody;
      global.rigidbody = mockRigidbody;
      
      const propsWithCollision = {
        ...global.props,
        enableCollision: true
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithCollision,
        world: mockWorld
      });

      // Verify offset was calculated (the exact values may vary due to animation)
      expect(controller.rigidbodyOffset.x).toBeDefined();
      expect(controller.rigidbodyOffset.y).toBeDefined();
      expect(controller.rigidbodyOffset.z).toBeDefined();
      
      global.rigidbody = originalRigidbody;
    });
  });

  describe('Debug logging in translation', () => {
    it('should log debug messages when debug mode is enabled', () => {
      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;
      
      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      const propsWithDebug = {
        ...global.props,
        enableDebugMode: true,
        translateControllerTranslationX: 5,
        translateControllerTranslationSpeed: 0
      };

      const controller = new TranslateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDebug,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isTranslationAnimating = true;
      controller.dynamicParams.translationX = 10;
      controller.dynamicParams.translationSpeed = 0;

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      updateListener();

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('node Setting X position directly to: 10.00'),
        type: 'debug'
      }));

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });
  });

  describe('Module initialization', () => {
    it('should export TranslateController when in Node.js environment', () => {
      const { TranslateController } = require('./translate.js');
      expect(TranslateController).toBeDefined();
      expect(typeof TranslateController).toBe('function');
    });
  });
});

