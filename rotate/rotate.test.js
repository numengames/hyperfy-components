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
  rotation: { x: 0, y: 0, z: 0 },
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
  rotateControllerEnableSync: false,
  rotateControllerEnableDelay: false,
  rotateControllerTransitionDelay: 0,
  rotateControllerIsRotationEnabled: true,
  rotateControllerRotationDelay: 0,
  rotateControllerRotationSpeed: 0.01,
  rotateControllerRotationX: 0,
  rotateControllerRotationY: 0,
  rotateControllerRotationZ: 0,
  rotateControllerAcceptAnyEmitter: false,
  rotateControllerEventReceivers: '[]',
};

function createFreshMocks() {
  const mockNode = {
    name: 'test-node',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { 
      x: 0, 
      y: 0, 
      z: 0,
      set: jest.fn((x, y, z) => {
        mockNode.rotation.x = x;
        mockNode.rotation.y = y;
        mockNode.rotation.z = z;
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

const { RotateController } = require('./rotate.js');

describe('RotateController', () => {
  let mockApp, mockWorld, mockNode;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createFreshMocks();
    mockApp = mocks.mockApp;
    mockWorld = mocks.mockWorld;
    mockNode = mocks.mockNode;
    
    global.rigidbody = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      active: true,
      add: jest.fn()
    };
  });

  describe('Constructor and initialization', () => {
    it('should create RotateController instance with initial state', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(controller.isAnimating).toBe(false);
      expect(controller.isRotationAnimating).toBe(false);
      expect(controller.isContinuousRotation).toBe(false);
      expect(controller.dynamicParams).toEqual({});
      expect(controller.rigidbodyOffset).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should initialize event listeners', () => {
      const propsWithReceivers = {
        ...global.props,
        rotateControllerEventReceivers: '[{"id":"event1","actions":[{"type":"start-rotation","params":{}}]}]'
      };

      new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithReceivers,
        world: mockWorld
      });

      expect(mockWorld.on).toHaveBeenCalledWith('event1', expect.any(Function));
    });

    it('should set up animation loop', () => {
      new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(mockApp.on).toHaveBeenCalledWith('update', expect.any(Function));
    });
  });

  describe('Event handling', () => {
    it('should handle start-rotation event', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onStartRotation({ timestamp: Date.now() });

      expect(controller.isAnimating).toBe(true);
    });

    it('should handle stop-rotation event', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isRotationAnimating = true;

      controller._onStopRotation({});

      expect(controller.isAnimating).toBe(false);
      expect(controller.isRotationAnimating).toBe(false);
    });

    it('should handle set-state event with isAnimating true', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetState({ isAnimating: true });

      expect(controller.isAnimating).toBe(true);
    });

    it('should handle set-state event with isAnimating false', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller._onSetState({ isAnimating: false });

      expect(controller.isAnimating).toBe(false);
    });

    it('should handle set-rotation event with rotationX', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetRotation({ rotationX: 90 });

      expect(controller.dynamicParams.rotationX).toBe(90);
    });

    it('should handle set-rotation event with rotationY', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetRotation({ rotationY: 180 });

      expect(controller.dynamicParams.rotationY).toBe(180);
    });

    it('should handle set-rotation event with rotationZ', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetRotation({ rotationZ: 270 });

      expect(controller.dynamicParams.rotationZ).toBe(270);
    });

    it('should handle set-rotation event with rotationSpeed', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetRotation({ rotationSpeed: 0.05 });

      expect(controller.dynamicParams.rotationSpeed).toBe(0.05);
    });

    it('should start animation by default when set-rotation is called', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onSetRotation({ rotationX: 90 });

      expect(controller.isAnimating).toBe(true);
    });

    it('should pause animation with pause-rotation action', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isRotationAnimating = true;

      controller._onPauseRotation({});

      expect(controller.isRotationAnimating).toBe(false);
      expect(controller.isAnimating).toBe(true);
    });

    it('should resume animation with resume-rotation action', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isRotationAnimating = false;

      controller._onResumeRotation({});

      expect(controller.isRotationAnimating).toBe(true);
      expect(controller.isAnimating).toBe(true);
    });

    it('should not resume animation if not started', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = false;
      controller.isRotationAnimating = false;

      controller._onResumeRotation({});

      expect(controller.isRotationAnimating).toBe(false);
      expect(controller.isAnimating).toBe(false);
    });

    it('should reset rotation to initial rotation', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.node.rotation.set(1.57, 0.78, -0.5);
      controller.isAnimating = true;
      controller.isRotationAnimating = true;
      controller.dynamicParams.rotationX = 90;

      controller._onResetRotation({});

      expect(controller.dynamicParams.rotationX).toBe(0);
      expect(controller.dynamicParams.rotationY).toBe(0);
      expect(controller.dynamicParams.rotationZ).toBe(0);
      expect(controller.isAnimating).toBe(true);
      expect(controller.isRotationAnimating).toBe(true);
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
        rotateControllerEnableDelay: true,
        rotateControllerTransitionDelay: 1
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onStartRotation({ timestamp: Date.now() });

      expect(controller.isAnimating).toBe(false);

      jest.advanceTimersByTime(1000);

      expect(controller.isAnimating).toBe(true);
    });

    it('should start animation immediately when delay is disabled', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onStartRotation({ timestamp: Date.now() });

      expect(controller.isAnimating).toBe(true);
    });

    it('should respect payload delay over config delay', () => {
      const propsWithDelay = {
        ...global.props,
        rotateControllerEnableDelay: true,
        rotateControllerTransitionDelay: 5
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onStartRotation({ delay: 2, timestamp: Date.now() });

      expect(controller.isAnimating).toBe(false);

      jest.advanceTimersByTime(2000);

      expect(controller.isAnimating).toBe(true);
    });
  });

  describe('Rotation animation', () => {
    it('should apply single axis rotation with instant step (0)', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const targetObject = { rotation: { x: 0, y: 0, z: 0 } };
      controller._applySingleAxisRotation(targetObject, 'x', 0, 1.57, 0, 'node');

      expect(targetObject.rotation.x).toBe(1.57);
    });

    it('should apply single axis rotation with smooth step', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const targetObject = { rotation: { x: 0, y: 0, z: 0 } };
      controller._applySingleAxisRotation(targetObject, 'x', 0, 1.57, 0.1, 'node');

      expect(targetObject.rotation.x).toBe(0.1);
    });

    it('should not apply rotation when difference is too small', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const targetObject = { rotation: { x: 1.57, y: 0, z: 0 } };
      const initialX = targetObject.rotation.x;
      
      controller._applySingleAxisRotation(targetObject, 'x', 1.57, 1.575, 0.01, 'node');

      expect(targetObject.rotation.x).toBe(initialX);
    });

    it('should execute rotation for node when animating', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationX: 90,
        rotateControllerRotationSpeed: 0.01
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      controller.isRotationAnimating = true;
      controller._executeRotation(mockNode, {}, 'node');

      expect(mockNode.rotation.x).toBeGreaterThan(0);
    });

    it('should use dynamic params over props for rotation', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationX: 45,
        rotateControllerRotationSpeed: 0.01
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      const dynamicParams = {
        rotationX: 90,
        rotationSpeed: 0.02
      };

      controller.isRotationAnimating = true;
      controller._executeRotation(mockNode, dynamicParams, 'node');

      expect(mockNode.rotation.x).toBe(0.02);
    });

    it('should not execute rotation when not animating', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationX: 90,
        rotateControllerRotationSpeed: 0.01
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      controller.isRotationAnimating = false;
      controller._executeRotation(mockNode, {}, 'node');

      expect(mockNode.rotation.x).toBe(0);
    });
  });

  describe('Rigidbody offset calculation', () => {
    it('should set offset to zero when no rigidbody', () => {
      global.rigidbody = null;

      const controller = new RotateController({
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

      const controller = new RotateController({
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
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = '[{"id":"event1","actions":[{"type":"start-rotation","params":{}}]}]';
      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([
        { id: 'event1', type: 'start-rotation', params: {} }
      ]);
    });

    it('should normalize array with actions', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const receivers = [
        {
          id: 'event1',
          actions: [
            { type: 'start-rotation', params: { delay: 1 } },
            { type: 'stop-rotation', params: {} }
          ]
        }
      ];

      const normalized = controller._normalizeReceivers(receivers);

      expect(normalized).toEqual([
        { id: 'event1', type: 'start-rotation', params: { delay: 1 } },
        { id: 'event1', type: 'stop-rotation', params: {} }
      ]);
    });

    it('should handle string receiver as simple event', () => {
      const controller = new RotateController({
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
      const controller = new RotateController({
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
      const controller = new RotateController({
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
      const controller = new RotateController({
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
        rotateControllerEventReceivers: '[{"id":"event1","actions":[{"type":"start-rotation","params":{}}]}]'
      };

      new RotateController({
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
        rotateControllerAcceptAnyEmitter: true
      };

      new RotateController({
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
        rotateControllerAcceptAnyEmitter: true
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockServerWorld
      });

      // Find the appID listener
      const appIdListener = mockServerWorld.on.mock.calls.find(
        call => call[0] === 'testAppId'
      )[1];

      const testData = { rotationY: 90 };
      appIdListener(testData);

      expect(mockApp.send).toHaveBeenCalledWith('rotate-server-to-client', { ...testData, appID: 'testAppId' });

      global.world = {
        isClient: true,
        isServer: false
      };
    });

    it('should handle app.on rotate-server-to-client event', () => {
      const propsWithAcceptAny = {
        ...global.props,
        rotateControllerAcceptAnyEmitter: true
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockWorld
      });

      const appListener = mockApp.on.mock.calls.find(
        call => call[0] === 'rotate-server-to-client'
      )[1];

      appListener({ rotationY: 90 });

      expect(controller.isAnimating).toBe(true);
    });


    it('should not set up listeners when not in client context', () => {
      const mockServerWorld = {
        ...mockWorld,
        isClient: false,
        isServer: true
      };

      new RotateController({
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
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('set-rotation', {}, { rotationX: 90, timestamp: Date.now() });

      expect(controller.dynamicParams.rotationX).toBe(90);
      expect(controller.isAnimating).toBe(true);
    });

    it('should handle pause-rotation action type', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isRotationAnimating = true;

      controller._handleEvent('pause-rotation', {}, {});

      expect(controller.isRotationAnimating).toBe(false);
    });

    it('should handle resume-rotation action type', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isRotationAnimating = false;

      controller._handleEvent('resume-rotation', {}, {});

      expect(controller.isRotationAnimating).toBe(true);
    });

    it('should handle reset-rotation action type', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.node.rotation.set(1.57, 0.78, -0.5);
      controller.isAnimating = true;

      controller._handleEvent('reset-rotation', {}, {});

      expect(controller.dynamicParams.rotationX).toBe(0);
      expect(controller.dynamicParams.rotationY).toBe(0);
      expect(controller.dynamicParams.rotationZ).toBe(0);
      expect(controller.isAnimating).toBe(true);
      expect(controller.isRotationAnimating).toBe(true);
    });

    it('should handle invalid action type', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('invalid-action', {}, {});

      expect(controller.isAnimating).toBe(false);
    });

    it('should handle continuous-rotation action type', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('continuous-rotation', {}, {
        continuousSpeedX: 0.01,
        continuousSpeedY: 0.02,
        continuousSpeedZ: 0.03
      });

      expect(controller.isAnimating).toBe(true);
      expect(controller.isContinuousRotation).toBe(true);
      expect(controller.isRotationAnimating).toBe(false);
      expect(controller.dynamicParams.continuousSpeedX).toBe(0.01);
      expect(controller.dynamicParams.continuousSpeedY).toBe(0.02);
      expect(controller.dynamicParams.continuousSpeedZ).toBe(0.03);
    });

    it('should handle stop-continuous-rotation action type', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isContinuousRotation = true;
      controller.dynamicParams.continuousSpeedX = 0.01;

      controller._handleEvent('stop-continuous-rotation', {}, {});

      expect(controller.isAnimating).toBe(false);
      expect(controller.isContinuousRotation).toBe(false);
      expect(controller.isRotationAnimating).toBe(false);
      expect(controller.dynamicParams.continuousSpeedX).toBeUndefined();
    });
  });

  describe('Static members', () => {
    it('should have EVENTS constant', () => {
      expect(RotateController.EVENTS).toEqual({
        SET_STATE: 'set-state',
        ROTATION_START: 'rotation-start',
        ROTATION_STOP: 'rotation-stop',
      });
    });

    it('should have getConfig static method', () => {
      const config = RotateController.getConfig();
      expect(Array.isArray(config)).toBe(true);
      expect(config.length).toBeGreaterThan(0);
    });
  });

  describe('Animation loop integration', () => {
    it('should execute rotation on update when animating', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationX: 90,
        rotateControllerRotationSpeed: 0.01
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      controller.isAnimating = true;
      controller.isRotationAnimating = true;

      const initialX = mockNode.rotation.x;
      updateListener();

      expect(mockNode.rotation.x).toBeGreaterThan(initialX);
    });

    it('should not execute rotation on update when not animating', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationX: 90,
        rotateControllerRotationSpeed: 0.01
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      controller.isAnimating = false;

      const initialX = mockNode.rotation.x;
      updateListener();

      expect(mockNode.rotation.x).toBe(initialX);
    });

    it('should not execute rotation when rotation is disabled', () => {
      const propsWithoutRotation = {
        ...global.props,
        rotateControllerIsRotationEnabled: false
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithoutRotation,
        world: mockWorld
      });

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      controller.isAnimating = true;
      controller.isRotationAnimating = true;

      const initialX = mockNode.rotation.x;
      updateListener();

      expect(mockNode.rotation.x).toBe(initialX);
    });
  });

  describe('Multi-axis rotation', () => {
    it('should rotate on Y axis when configured', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationY: 180,
        rotateControllerRotationSpeed: 0.02
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      controller.isRotationAnimating = true;
      controller._executeRotation(mockNode, {}, 'node');

      expect(mockNode.rotation.y).toBe(0.02);
      expect(mockNode.rotation.x).toBe(0);
      expect(mockNode.rotation.z).toBe(0);
    });

    it('should rotate on Z axis when configured', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationZ: 90,
        rotateControllerRotationSpeed: 0.03
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      controller.isRotationAnimating = true;
      controller._executeRotation(mockNode, {}, 'node');

      expect(mockNode.rotation.z).toBe(0.03);
      expect(mockNode.rotation.x).toBe(0);
      expect(mockNode.rotation.y).toBe(0);
    });

    it('should rotate on multiple axes simultaneously', () => {
      const propsWithRotation = {
        ...global.props,
        rotateControllerRotationX: 90,
        rotateControllerRotationY: 180,
        rotateControllerRotationZ: 90,
        rotateControllerRotationSpeed: 0.01
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithRotation,
        world: mockWorld
      });

      controller.isRotationAnimating = true;
      controller._executeRotation(mockNode, {}, 'node');

      expect(mockNode.rotation.x).toBe(0.01);
      expect(mockNode.rotation.y).toBe(0.01);
      expect(mockNode.rotation.z).toBe(0.01);
    });
  });

  describe('Rigidbody offset calculation with rigidbody present', () => {
    it('should calculate rigidbody offset when rigidbody exists and collision is enabled', () => {
      const mockRigidbody = {
        position: { x: 5, y: 10, z: -2 }
      };
      
      const originalRigidbody = global.rigidbody;
      global.rigidbody = mockRigidbody;
      
      const propsWithCollision = {
        ...global.props,
        enableCollision: true
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithCollision,
        world: mockWorld
      });

      expect(controller.rigidbodyOffset.x).toBeDefined();
      expect(controller.rigidbodyOffset.y).toBeDefined();
      expect(controller.rigidbodyOffset.z).toBeDefined();
      
      global.rigidbody = originalRigidbody;
    });
  });

  describe('Debug logging in rotation', () => {
    it('should log debug messages when debug mode is enabled', () => {
      const originalDebugMode = global.props.enableDebugMode;
      global.props.enableDebugMode = true;
      
      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      const propsWithDebug = {
        ...global.props,
        enableDebugMode: true,
        rotateControllerRotationX: 90,
        rotateControllerRotationSpeed: 0
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDebug,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isRotationAnimating = true;
      controller.dynamicParams.rotationX = 90;
      controller.dynamicParams.rotationSpeed = 0;

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      updateListener();

      expect(globalAppEmitSpy).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('node Setting X rotation directly to:'),
        type: 'debug'
      }));

      global.props.enableDebugMode = originalDebugMode;
      globalAppEmitSpy.mockRestore();
    });
  });

  describe('Continuous rotation', () => {
    it('should execute continuous rotation on update when enabled', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isContinuousRotation = true;
      controller.dynamicParams.continuousSpeedX = 0.01;
      controller.dynamicParams.continuousSpeedY = 0.02;

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      const initialX = mockNode.rotation.x;
      const initialY = mockNode.rotation.y;
      updateListener();

      expect(mockNode.rotation.x).toBe(initialX + 0.01);
      expect(mockNode.rotation.y).toBe(initialY + 0.02);
    });

    it('should not execute continuous rotation when not enabled', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isContinuousRotation = false;

      const updateListener = mockApp.on.mock.calls.find(
        call => call[0] === 'update'
      )[1];

      const initialX = mockNode.rotation.x;
      updateListener();

      expect(mockNode.rotation.x).toBe(initialX);
    });

    it('should handle continuous rotation with delay', () => {
      jest.useFakeTimers();

      const propsWithDelay = {
        ...global.props,
        rotateControllerEnableDelay: true
      };

      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onContinuousRotation({
        continuousSpeedX: 0.01,
        delay: 1
      });

      expect(controller.isAnimating).toBe(false);
      expect(controller.isContinuousRotation).toBe(false);

      jest.advanceTimersByTime(1000);

      expect(controller.isAnimating).toBe(true);
      expect(controller.isContinuousRotation).toBe(true);
      expect(controller.dynamicParams.continuousSpeedX).toBe(0.01);

      jest.useRealTimers();
    });

    it('should execute continuous rotation on multiple axes', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isContinuousRotation = true;
      controller.dynamicParams.continuousSpeedX = 0.01;
      controller.dynamicParams.continuousSpeedY = 0.02;
      controller.dynamicParams.continuousSpeedZ = 0.03;

      controller._executeContinuousRotationStep(mockNode, controller.dynamicParams, 'node');

      expect(mockNode.rotation.x).toBe(0.01);
      expect(mockNode.rotation.y).toBe(0.02);
      expect(mockNode.rotation.z).toBe(0.03);
    });

    it('should stop continuous rotation and clear parameters', () => {
      const controller = new RotateController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.isAnimating = true;
      controller.isContinuousRotation = true;
      controller.dynamicParams.continuousSpeedX = 0.01;
      controller.dynamicParams.continuousSpeedY = 0.02;

      controller._onStopContinuousRotation({});

      expect(controller.isAnimating).toBe(false);
      expect(controller.isContinuousRotation).toBe(false);
      expect(controller.isRotationAnimating).toBe(false);
      expect(controller.dynamicParams.continuousSpeedX).toBeUndefined();
      expect(controller.dynamicParams.continuousSpeedY).toBeUndefined();
    });
  });

  describe('Module initialization', () => {
    it('should export RotateController when in Node.js environment', () => {
      const { RotateController } = require('./rotate.js');
      expect(RotateController).toBeDefined();
      expect(typeof RotateController).toBe('function');
    });
  });
});
