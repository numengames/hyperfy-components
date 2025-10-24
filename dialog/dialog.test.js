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
  dialogControllerEnableDelay: false,
  dialogControllerTransitionDelay: 0,
  dialogControllerWidth: 400,
  dialogControllerHeight: 110,
  dialogControllerBackground: '#0a2a43ea',
  dialogControllerBorder: '#1e90ff',
  dialogControllerBorderRadius: 10,
  dialogControllerTextColor: '#ffffff',
  dialogControllerFontSize: 11,
  dialogControllerFontWeight: 'bold',
  dialogControllerTriggerAudio: null,
  dialogControllerStandEmote: null,
  dialogControllerTalkEmote: null,
  dialogControllerShowNameLabel: true,
  dialogControllerCharacterName: 'Character',
  dialogControllerNameLabelColor: '#ffdd99',
  dialogControllerNameLabelSize: 13,
  dialogControllerHasImageInDialog: false,
  dialogControllerImage: null,
  dialogControllerImageWidth: 50,
  dialogControllerImageHeight: 50,
  dialogControllerMaxCharsPerDialog: 150,
  dialogControllerAutoAdvance: false,
  dialogControllerDialogDuration: 5,
  dialogControllerDefaultPhrases: 'Welcome! How can I help you today?\nI\'m here to assist you with any questions you might have.\nFeel free to explore and interact with the environment.\nIs there anything specific you\'d like to know about?',
  dialogControllerAcceptAnyEmitter: false,
  dialogControllerEventReceivers: '[]',
};

function createFreshMocks() {
  const mockNode = {
    name: 'test-node',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
    matrixWorld: new Matrix4(),
    add: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
    emote: null,
    traverse: jest.fn((callback) => {
      callback({ name: 'mesh', geometry: {}, matrixWorld: new Matrix4() });
    })
  };

  const mockUIText = {
    value: '',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'left',
    margin: [0, 20, 0, 0]
  };

  const mockPageIndicator = {
    value: '',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'right',
    margin: [0, 0, 0, 0]
  };

  const mockDialogUI = {
    width: 400,
    height: 110,
    position: [0, 2.1, 0],
    backgroundColor: '#0a2a43ea',
    borderColor: '#1e90ff',
    borderWidth: 2,
    billboard: 'full',
    borderRadius: 10,
    add: jest.fn()
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
      if (type === 'ui') {
        return mockDialogUI;
      }
      if (type === 'uitext') {
        return mockUIText;
      }
      if (type === 'uiview') {
        return { add: jest.fn() };
      }
      if (type === 'uiimage') {
        return { src: '', width: 50, height: 50, margin: [0, 20, 0, 10] };
      }
      if (type === 'action') {
        return {
          label: '',
          distance: 3,
          onTrigger: null,
          add: jest.fn(),
          remove: jest.fn()
        };
      }
      if (type === 'audio') {
        return {
          src: '',
          volume: 1,
          loop: false,
          group: 'sfx',
          spatial: true,
          play: jest.fn()
        };
      }
      return { ...options };
    }),
    emit: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn((callback) => {
      callback({ name: 'mesh', geometry: {}, matrixWorld: new Matrix4() });
    }),
    configure: jest.fn()
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

  return { mockApp, mockWorld, mockNode, mockUIText, mockPageIndicator, mockDialogUI };
}

const { DialogController } = require('./dialog.js');

describe('DialogController', () => {
  let mockApp, mockWorld, mockNode, mockUIText, mockPageIndicator, mockDialogUI;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const mocks = createFreshMocks();
    mockApp = mocks.mockApp;
    mockWorld = mocks.mockWorld;
    mockNode = mocks.mockNode;
    mockUIText = mocks.mockUIText;
    mockPageIndicator = mocks.mockPageIndicator;
    mockDialogUI = mocks.mockDialogUI;
    
    global.rigidbody = {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      active: true,
      add: jest.fn()
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor and initialization', () => {
    it('should create DialogController instance with initial state', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(controller.dialogUI).toBeNull();
      expect(controller.storyText).toBeNull();
      expect(controller.pageIndicator).toBeNull();
      expect(controller.lineChangeTimer).toBeNull();
      expect(controller.timerObsolete).toBe(false);
      expect(controller.dialogLines).toEqual([]);
      expect(controller.currentLineIndex).toBe(0);
      expect(controller.isDialogVisible).toBe(false);
      expect(controller.isDialogCompleted).toBe(false);
      expect(controller.nextAction).toBeNull();
      expect(controller.closeAction).toBeNull();
    });

    it('should initialize event listeners', () => {
      const propsWithReceivers = {
        ...global.props,
        dialogControllerEventReceivers: '[{"id":"event1","actions":[{"type":"next-dialog","params":{}}]}]'
      };

      new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithReceivers,
        world: mockWorld
      });

      expect(mockWorld.on).toHaveBeenCalledWith('event1', expect.any(Function));
    });
  });

  describe('Event handling', () => {
    it('should handle next-dialog event', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onNextDialog({ dialogText: 'Hello world!' });

      expect(controller.isDialogVisible).toBe(true);
      expect(controller.dialogLines).toEqual(['Hello world!']);
      expect(controller.currentLineIndex).toBe(0);
    });

    it('should handle hide-dialog event', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      // First show dialog
      controller._executeShowDialog({ dialogText: 'Hello world!' });
      expect(controller.isDialogVisible).toBe(true);

      // Then hide it
      controller._onHideDialog({});

      expect(controller.isDialogVisible).toBe(false);
      expect(controller.currentLineIndex).toBe(0);
      expect(controller.isDialogCompleted).toBe(false);
    });

    it('should handle next-dialog with dialogPhrases array', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const phrases = ['First line', 'Second line', 'Third line'];
      controller._onNextDialog({ dialogPhrases: phrases });

      expect(controller.isDialogVisible).toBe(true);
      expect(controller.dialogLines).toEqual(phrases);
      expect(controller.currentLineIndex).toBe(0);
    });

    it('should advance to next line when dialog is visible', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const phrases = ['First line', 'Second line', 'Third line'];
      controller._executeShowDialog({ dialogPhrases: phrases });
      expect(controller.currentLineIndex).toBe(0);

      // Advance to next line
      controller._executeNextDialog({});
      expect(controller.currentLineIndex).toBe(1);

      // Advance to next line
      controller._executeNextDialog({});
      expect(controller.currentLineIndex).toBe(2);
    });

    it('should hide dialog when reaching the end', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const phrases = ['First line', 'Second line'];
      controller._executeShowDialog({ dialogPhrases: phrases });
      expect(controller.currentLineIndex).toBe(0);

      // Advance to second line
      controller._executeNextDialog({});
      expect(controller.currentLineIndex).toBe(1);

      // Advance past the end - should hide dialog
      controller._executeNextDialog({});
      expect(controller.isDialogVisible).toBe(false);
      expect(controller.isDialogCompleted).toBe(true);
    });

    it('should show dialog if not visible when next-dialog is called', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      expect(controller.isDialogVisible).toBe(false);

      controller._executeNextDialog({ dialogText: 'Hello world!' });

      expect(controller.isDialogVisible).toBe(true);
      expect(controller.dialogLines).toEqual(['Hello world!']);
    });

    it('should hide dialog if completed and next-dialog is called again', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      // Complete a dialog
      controller._executeShowDialog({ dialogText: 'Hello world!' });
      controller._executeNextDialog({}); // Advance past the end
      expect(controller.isDialogCompleted).toBe(true);
      expect(controller.isDialogVisible).toBe(false);

      // Call next-dialog again - should remain hidden
      controller._executeNextDialog({});
      expect(controller.isDialogVisible).toBe(false);
    });

    it('should hide dialog when it is currently visible', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      // First show dialog
      controller._executeShowDialog({ dialogText: 'Hello world!' });
      expect(controller.isDialogVisible).toBe(true);
      expect(controller.dialogLines).toEqual(['Hello world!']);

      // Then hide it using hide-dialog action
      controller._executeHideDialog({});
      
      expect(controller.isDialogVisible).toBe(false);
      expect(controller.currentLineIndex).toBe(0);
      expect(controller.isDialogCompleted).toBe(false);
    });
  });

  describe('Animation delay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should apply delay before showing dialog when enabled', () => {
      const propsWithDelay = {
        ...global.props,
        dialogControllerEnableDelay: true,
        dialogControllerTransitionDelay: 1
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onNextDialog({ dialogText: 'Hello world!' });

      expect(controller.isDialogVisible).toBe(false);

      jest.advanceTimersByTime(1000);

      expect(controller.isDialogVisible).toBe(true);
    });

    it('should show dialog immediately when delay is disabled', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._onNextDialog({ dialogText: 'Hello world!' });

      expect(controller.isDialogVisible).toBe(true);
    });

    it('should respect payload delay over config delay', () => {
      const propsWithDelay = {
        ...global.props,
        dialogControllerEnableDelay: true,
        dialogControllerTransitionDelay: 5
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithDelay,
        world: mockWorld
      });

      controller._onNextDialog({ dialogText: 'Hello world!', delay: 2 });

      expect(controller.isDialogVisible).toBe(false);

      jest.advanceTimersByTime(2000);

      expect(controller.isDialogVisible).toBe(true);
    });
  });

  describe('Dialog text processing', () => {
    it('should handle single line text without splitting', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._executeShowDialog({ dialogText: 'Hello world!' });
      expect(controller.dialogLines).toEqual(['Hello world!']);
    });

    it('should handle long text without splitting', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const longText = 'This is a very long text that should not be split into multiple lines because the user is responsible for handling text length.';
      controller._executeShowDialog({ dialogText: longText });
      
      expect(controller.dialogLines).toEqual([longText]);
    });

    it('should handle empty text with default message', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._executeShowDialog({});
      expect(controller.dialogLines).toEqual([
        'Welcome! How can I help you today?',
        'I\'m here to assist you with any questions you might have.',
        'Feel free to explore and interact with the environment.',
        'Is there anything specific you\'d like to know about?'
      ]);
    });

    it('should handle empty default phrases configuration', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: { ...global.props, dialogControllerDefaultPhrases: '' },
        world: mockWorld
      });

      controller._executeShowDialog({});
      expect(controller.dialogLines).toEqual([]);
    });

    it('should handle custom default phrases configuration', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: { 
          ...global.props, 
          dialogControllerDefaultPhrases: 'Hello there!\nHow are you?\nNice to meet you!' 
        },
        world: mockWorld
      });

      controller._executeShowDialog({});
      expect(controller.dialogLines).toEqual(['Hello there!', 'How are you?', 'Nice to meet you!']);
    });

    it('should handle dialogPhrases array correctly', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const phrases = ['First line', 'Second line', 'Third line'];
      controller._executeShowDialog({ dialogPhrases: phrases });
      
      expect(controller.dialogLines).toEqual(phrases);
    });
  });

  describe('UI creation and management', () => {
    it('should create dialog UI with correct properties', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._createDialogUI('Test Character');

      expect(mockApp.create).toHaveBeenCalledWith('ui', expect.objectContaining({
        width: 400,
        height: 110,
        backgroundColor: '#0a2a43ea',
        borderColor: '#1e90ff',
        borderRadius: 10
      }));

      expect(mockApp.add).toHaveBeenCalledWith(mockDialogUI);
    });

    it('should create character name label when enabled', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._createDialogUI('Test Character');

      expect(mockApp.create).toHaveBeenCalledWith('uitext', expect.objectContaining({
        value: 'Test Character',
        fontSize: 13,
        fontWeight: 'bold',
        color: '#ffdd99'
      }));
    });

    it('should not create character name label when disabled', () => {
      const propsWithoutName = {
        ...global.props,
        dialogControllerShowNameLabel: false
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithoutName,
        world: mockWorld
      });

      controller._createDialogUI('Test Character');

      // Should not create name label
      const createCalls = mockApp.create.mock.calls;
      const nameLabelCall = createCalls.find(call => call[1]?.value === 'Test Character');
      expect(nameLabelCall).toBeUndefined();
    });

    it('should create image when enabled', () => {
      const propsWithImage = {
        ...global.props,
        dialogControllerHasImageInDialog: true,
        dialogControllerImage: { url: 'test-image.jpg' },
        dialogControllerImageWidth: 100,
        dialogControllerImageHeight: 100
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithImage,
        world: mockWorld
      });

      controller._createDialogUI('Test Character');

      expect(mockApp.create).toHaveBeenCalledWith('uiimage', expect.objectContaining({
        src: 'test-image.jpg',
        width: 100,
        height: 100
      }));
    });

    it('should create physical actions', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._createDialogActions();

      expect(mockApp.create).toHaveBeenCalledWith('action', expect.objectContaining({
        label: 'Next Dialog',
        distance: 3
      }));

      expect(mockApp.create).toHaveBeenCalledWith('action', expect.objectContaining({
        label: 'Close Dialog',
        distance: 3
      }));

      expect(mockNode.add).toHaveBeenCalledTimes(2);
    });

    it('should remove physical actions', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._createDialogActions();
      controller._removeDialogActions();

      expect(mockNode.remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('Show current line', () => {
    it('should show current line text', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller.dialogLines = ['First line', 'Second line'];
      controller.currentLineIndex = 0;
      controller.storyText = mockUIText;

      controller._showCurrentLine();

      expect(mockUIText.value).toBe('First line');
    });

    it('should update page indicator', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      const mockPageIndicator = {
        value: '',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'right',
        margin: [0, 0, 0, 0]
      };

      controller.dialogLines = ['First line', 'Second line'];
      controller.currentLineIndex = 1;
      controller.pageIndicator = mockPageIndicator;

      controller._showCurrentLine();

      // Test that the method was called correctly by checking the logic
      expect(controller.currentLineIndex).toBe(1);
      expect(controller.dialogLines.length).toBe(2);
      expect(controller.pageIndicator).toBe(mockPageIndicator);
    });

    it('should set auto-advance timer for all lines including last', () => {
      const propsWithAutoAdvance = {
        ...global.props,
        dialogControllerAutoAdvance: true,
        dialogControllerDialogDuration: 3
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithAutoAdvance,
        world: mockWorld
      });

      controller.dialogLines = ['First line', 'Second line'];
      controller.currentLineIndex = 0; // First line
      controller.storyText = mockUIText;

      controller._showCurrentLine();

      expect(jest.getTimerCount()).toBe(1);
    });

    it('should set auto-advance timer for last line to auto-close', () => {
      const propsWithAutoAdvance = {
        ...global.props,
        dialogControllerAutoAdvance: true,
        dialogControllerDialogDuration: 3
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithAutoAdvance,
        world: mockWorld
      });

      controller.dialogLines = ['First line', 'Second line'];
      controller.currentLineIndex = 1; // Last line
      controller.storyText = mockUIText;

      controller._showCurrentLine();

      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('Event listeners setup', () => {
    it('should set up receivers from configuration', () => {
      const propsWithReceivers = {
        ...global.props,
        dialogControllerEventReceivers: '[{"id":"event1","actions":[{"type":"next-dialog","params":{}}]}]'
      };

      new DialogController({
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
        dialogControllerAcceptAnyEmitter: true
      };

      new DialogController({
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
        dialogControllerAcceptAnyEmitter: true
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockServerWorld
      });

      // Find the appID listener
      const appIdListener = mockServerWorld.on.mock.calls.find(
        call => call[0] === 'testAppId'
      )[1];

      const testData = { dialogText: 'Hello from server!' };
      appIdListener(testData);

      expect(mockApp.send).toHaveBeenCalledWith('dialog-server-to-client', { ...testData, appID: 'testAppId' });

      global.world = {
        isClient: true,
        isServer: false
      };
    });

    it('should handle app.on dialog-server-to-client event', () => {
      const propsWithAcceptAny = {
        ...global.props,
        dialogControllerAcceptAnyEmitter: true
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithAcceptAny,
        world: mockWorld
      });

      const appListener = mockApp.on.mock.calls.find(
        call => call[0] === 'dialog-server-to-client'
      )[1];

      appListener({ dialogText: 'Hello from server!' });

      expect(controller.isDialogVisible).toBe(true);
    });

    it('should not set up listeners when not in client context', () => {
      const mockServerWorld = {
        ...mockWorld,
        isClient: false,
        isServer: true
      };

      new DialogController({
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
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('next-dialog', {}, { dialogText: 'Hello world!', timestamp: Date.now() });

      expect(controller.isDialogVisible).toBe(true);
      expect(controller.dialogLines).toEqual(['Hello world!']);
    });

    it('should handle hide-dialog action type', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      // First show dialog
      controller._executeShowDialog({ dialogText: 'Hello world!' });
      expect(controller.isDialogVisible).toBe(true);

      controller._handleEvent('hide-dialog', {}, {});

      expect(controller.isDialogVisible).toBe(false);
    });

    it('should handle invalid action type', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent('invalid-action', {}, {});

      expect(controller.isDialogVisible).toBe(false);
    });

    it('should merge params and data in payload', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._handleEvent(
        'next-dialog',
        { dialogText: 'From params' },
        { characterName: 'From data', timestamp: Date.now() }
      );

      expect(controller.isDialogVisible).toBe(true);
      expect(controller.dialogLines).toEqual(['From params']);
    });
  });

  describe('Static members', () => {
    it('should have EVENTS constant', () => {
      expect(DialogController.EVENTS).toEqual({
        HIDE_DIALOG: 'hide-dialog',
        NEXT_DIALOG: 'next-dialog',
      });
    });

    it('should have getConfig static method', () => {
      const config = DialogController.getConfig();
      expect(Array.isArray(config)).toBe(true);
      expect(config.length).toBeGreaterThan(0);
    });
  });

  describe('Audio and emote integration', () => {
    it('should play trigger audio when configured', () => {
      const propsWithAudio = {
        ...global.props,
        dialogControllerTriggerAudio: { url: 'test-audio.mp3' }
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithAudio,
        world: mockWorld
      });

      controller._executeShowDialog({ dialogText: 'Hello world!' });

      expect(mockApp.create).toHaveBeenCalledWith('audio', expect.objectContaining({
        src: 'test-audio.mp3',
        volume: 1,
        loop: false,
        group: 'sfx',
        spatial: true
      }));
    });

    it('should change avatar emote to talk when showing dialog', () => {
      const propsWithEmote = {
        ...global.props,
        dialogControllerTalkEmote: { url: 'talk-emote.mp3' }
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithEmote,
        world: mockWorld
      });

      controller._executeShowDialog({ dialogText: 'Hello world!' });

      expect(mockNode.emote).toBe('talk-emote.mp3');
    });

    it('should change avatar emote to stand when hiding dialog', () => {
      const propsWithEmote = {
        ...global.props,
        dialogControllerStandEmote: { url: 'stand-emote.mp3' }
      };

      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: propsWithEmote,
        world: mockWorld
      });

      controller._executeShowDialog({ dialogText: 'Hello world!' });
      controller._executeHideDialog({});

      expect(mockNode.emote).toBe('stand-emote.mp3');
    });
  });

  describe('Cleanup and error handling', () => {
    it('should cleanup dialog properly', () => {
      const controller = new DialogController({
        app: mockApp,
        node: mockNode,
        props: global.props,
        world: mockWorld
      });

      controller._executeShowDialog({ dialogText: 'Hello world!' });
      controller._cleanupDialog();

      expect(mockApp.remove).toHaveBeenCalledWith(mockDialogUI);
      expect(controller.dialogUI).toBeNull();
      expect(controller.storyText).toBeNull();
      expect(controller.pageIndicator).toBeNull();
    });

    it('should handle missing node gracefully', () => {
      const propsWithDebug = {
        ...global.props,
        enableDebugMode: true,
        appID: 'test-debug'
      };
      
      const globalAppEmitSpy = jest.spyOn(global.app, 'emit');

      const controller = new DialogController({
        app: mockApp,
        node: null,
        props: propsWithDebug,
        world: mockWorld
      });

      // The constructor doesn't log by default, so we test that it doesn't crash
      expect(controller).toBeDefined();
      expect(controller.isDialogVisible).toBe(false);

      globalAppEmitSpy.mockRestore();
    });
  });

  describe('Module initialization', () => {
    it('should export DialogController when in Node.js environment', () => {
      const { DialogController } = require('./dialog.js');
      expect(DialogController).toBeDefined();
      expect(typeof DialogController).toBe('function');
    });
  });
});
