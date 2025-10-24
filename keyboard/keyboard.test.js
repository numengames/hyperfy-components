/**
 * Tests for ManageKeypad component
 */

const { ManageKeypad } = require('./keyboard.js');

// Mock global objects
global.app = {
  get: jest.fn(),
  create: jest.fn(),
  emit: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  configure: jest.fn(),
  instanceId: 'test-app-id'
};

global.world = {
  on: jest.fn(),
  emit: jest.fn(),
  isServer: false,
  isClient: true
};

global.props = {
  isDebugMode: false,
  appID: '',
  nodeName: 'test-node',
  isDesignerMode: false,
  keypadType: 'letters',
  receiverId: 'test-receiver',
  keypadButtonColor: '#333333',
  keypadButtonHoverColor: '#555555'
};

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

Object.assign(console, mockConsole);

describe('ManageKeypad', () => {
  let mockApp, mockWorld, mockProps, mockNode;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockApp = {
      get: jest.fn(),
      create: jest.fn(),
      emit: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      configure: jest.fn(),
      instanceId: 'test-app-id'
    };
    
    mockWorld = {
      on: jest.fn(),
      emit: jest.fn(),
      isServer: false,
      isClient: true
    };
    
    mockProps = {
      isDebugMode: false,
      appID: '',
      nodeName: 'test-node',
      isDesignerMode: false,
      keypadType: 'letters',
      receiverId: 'test-receiver',
      keypadButtonColor: '#333333',
      keypadButtonHoverColor: '#555555'
    };

    mockNode = {
      visible: false,
      add: jest.fn(),
      remove: jest.fn()
    };

    // Create a comprehensive mock UI system
    const mockUI = {
      add: jest.fn(),
      remove: jest.fn()
    };

    const mockUIView = {
      add: jest.fn()
    };

    const mockUIText = {
      value: ''
    };

    // Mock app.create to return the same objects consistently
    mockApp.create.mockImplementation((type) => {
      if (type === 'ui') return mockUI;
      if (type === 'uiview') return mockUIView;
      if (type === 'uitext') return mockUIText;
      return {};
    });
  });

  describe('Constructor and initialization', () => {
    it('should create ManageKeypad instance with initial state', () => {
      const keypad = new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });

      expect(keypad).toBeDefined();
      expect(keypad.app).toBe(mockApp);
      expect(keypad.node).toBe(mockNode);
      expect(keypad.world).toBe(mockWorld);
      expect(keypad.props).toBe(mockProps);
    });

    it('should initialize event listeners', () => {
      new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });

      expect(mockWorld.on).toHaveBeenCalledWith('test-receiver', expect.any(Function));
      expect(mockWorld.on).toHaveBeenCalledWith('visibility-cc', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('visibility-sc', expect.any(Function));
    });
  });

  describe('Static members', () => {
    it('should have KEYPAD_TYPE constant', () => {
      expect(ManageKeypad.KEYPAD_TYPE).toBeDefined();
      expect(ManageKeypad.KEYPAD_TYPE.letters).toBeDefined();
      expect(ManageKeypad.KEYPAD_TYPE.numbers).toBeDefined();
      expect(ManageKeypad.KEYPAD_TYPE.letters.type).toBe('letters');
      expect(ManageKeypad.KEYPAD_TYPE.numbers.type).toBe('numbers');
    });

    it('should have config array', () => {
      expect(Array.isArray(ManageKeypad.config)).toBe(true);
      expect(ManageKeypad.config.length).toBeGreaterThan(0);
      
      // Check for key sections
      const designerMode = ManageKeypad.config.find(item => item.key === 'isDesignerMode');
      expect(designerMode).toBeDefined();
      expect(designerMode.type).toBe('toggle');
      
      const keypadType = ManageKeypad.config.find(item => item.key === 'keypadType');
      expect(keypadType).toBeDefined();
      expect(keypadType.type).toBe('switch');
    });
  });

  describe('Keypad visibility control', () => {
    let keypad;

    beforeEach(() => {
      keypad = new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });
    });

    it('should not recreate keypad if already exists', () => {
      keypad.keypadUI = { mock: true };
      
      keypad.showKeypad();
      
      expect(mockApp.create).not.toHaveBeenCalled();
      expect(mockNode.add).not.toHaveBeenCalled();
    });

    it('should close keypad when closeKeypad is called', () => {
      const mockKeypadUI = { mock: true };
      keypad.keypadUI = mockKeypadUI;
      
      keypad.closeKeypad();
      
      expect(mockNode.remove).toHaveBeenCalledWith(mockKeypadUI);
      expect(keypad.keypadUI).toBeNull();
    });

    it('should call showKeypad when setKeypadVisibility(true)', () => {
      const showKeypadSpy = jest.spyOn(keypad, 'showKeypad').mockImplementation(() => {});
      
      keypad.setKeypadVisibility(true);
      
      expect(showKeypadSpy).toHaveBeenCalled();
      
      showKeypadSpy.mockRestore();
    });

    it('should hide keypad when setKeypadVisibility(false)', () => {
      const mockKeypadUI = { mock: true };
      keypad.keypadUI = mockKeypadUI;
      
      keypad.setKeypadVisibility(false);
      
      expect(mockNode.remove).toHaveBeenCalledWith(mockKeypadUI);
    });
  });

  describe('Event handling', () => {
    let keypad;

    beforeEach(() => {
      keypad = new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });
    });

    it('should handle receiver event in server context', () => {
      mockWorld.isServer = true;
      
      // Get the receiver event handler
      const receiverHandler = mockWorld.on.mock.calls.find(call => call[0] === 'test-receiver')[1];
      
      receiverHandler({ isVisible: true });
      
      expect(mockApp.send).toHaveBeenCalledWith('visibility-sc', { isVisible: true });
    });

    it('should handle receiver event in client context', () => {
      mockWorld.isServer = false;
      
      const setKeypadVisibilitySpy = jest.spyOn(keypad, 'setKeypadVisibility').mockImplementation(() => {});
      
      // Get the receiver event handler
      const receiverHandler = mockWorld.on.mock.calls.find(call => call[0] === 'test-receiver')[1];
      
      receiverHandler({ isVisible: true });
      
      expect(setKeypadVisibilitySpy).toHaveBeenCalledWith(true);
      
      setKeypadVisibilitySpy.mockRestore();
    });

    it('should handle visibility-cc event', () => {
      const setKeypadVisibilitySpy = jest.spyOn(keypad, 'setKeypadVisibility').mockImplementation(() => {});
      
      // Get the visibility-cc event handler
      const visibilityHandler = mockWorld.on.mock.calls.find(call => call[0] === 'visibility-cc')[1];
      
      visibilityHandler({ isVisible: true });
      
      expect(setKeypadVisibilitySpy).toHaveBeenCalledWith(true);
      
      setKeypadVisibilitySpy.mockRestore();
    });

    it('should handle visibility-sc event', () => {
      const setKeypadVisibilitySpy = jest.spyOn(keypad, 'setKeypadVisibility').mockImplementation(() => {});
      
      // Get the visibility-sc event handler
      const visibilityHandler = mockApp.on.mock.calls.find(call => call[0] === 'visibility-sc')[1];
      
      visibilityHandler({ isVisible: true });
      
      expect(setKeypadVisibilitySpy).toHaveBeenCalledWith(true);
      
      setKeypadVisibilitySpy.mockRestore();
    });
  });

  describe('Keypad UI creation', () => {
    let keypad;

    beforeEach(() => {
      keypad = new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });
    });

    it('should have correct keypad type configuration', () => {
      expect(ManageKeypad.KEYPAD_TYPE.letters.width).toBe(470);
      expect(ManageKeypad.KEYPAD_TYPE.letters.height).toBe(200);
      expect(ManageKeypad.KEYPAD_TYPE.numbers.width).toBe(170);
      expect(ManageKeypad.KEYPAD_TYPE.numbers.height).toBe(240);
    });

    it('should handle letters keypad type configuration', () => {
      mockProps.keypadType = 'letters';
      keypad.props = mockProps;
      
      // Test that the keypad type is correctly set
      expect(keypad.props.keypadType).toBe('letters');
      expect(ManageKeypad.KEYPAD_TYPE[keypad.props.keypadType].width).toBe(470);
    });

    it('should handle numbers keypad type configuration', () => {
      mockProps.keypadType = 'numbers';
      keypad.props = mockProps;
      
      // Test that the keypad type is correctly set
      expect(keypad.props.keypadType).toBe('numbers');
      expect(ManageKeypad.KEYPAD_TYPE[keypad.props.keypadType].width).toBe(170);
    });
  });

  describe('Additional functionality', () => {
    let keypad;

    beforeEach(() => {
      keypad = new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });
    });

    it('should handle showKeypad when keypadUI is null', () => {
      keypad.keypadUI = null;
      
      // Mock setupKeypadUI to avoid complex UI creation
      const setupKeypadUISpy = jest.spyOn(keypad, 'setupKeypadUI').mockImplementation(() => {
        keypad.keypadUI = { mock: true };
      });
      
      keypad.showKeypad();
      
      expect(setupKeypadUISpy).toHaveBeenCalled();
      expect(mockNode.add).toHaveBeenCalled();
      
      setupKeypadUISpy.mockRestore();
    });

    it('should handle closeKeypad when keypadUI is null', () => {
      keypad.keypadUI = null;
      
      keypad.closeKeypad();
      
      expect(keypad.keypadUI).toBeNull();
      // The method still calls node.remove even with null, so we expect it to be called
      expect(mockNode.remove).toHaveBeenCalledWith(null);
    });

    it('should handle setKeypadVisibility with false', () => {
      const closeKeypadSpy = jest.spyOn(keypad, 'closeKeypad').mockImplementation(() => {});
      
      keypad.setKeypadVisibility(false);
      
      expect(closeKeypadSpy).toHaveBeenCalled();
      
      closeKeypadSpy.mockRestore();
    });
  });

  describe('Logging functionality', () => {
    let keypad;

    beforeEach(() => {
      mockProps.isDebugMode = true;
      keypad = new ManageKeypad({
        app: mockApp,
        node: mockNode,
        props: mockProps,
        world: mockWorld
      });
    });

    it('should emit log when logEmitter is called with debug mode enabled', () => {
      keypad.logEmitter({ kind: 'info', message: 'Test message' });
      
      expect(mockApp.emit).toHaveBeenCalledWith('log', {
        kind: 'info',
        message: 'Test message'
      });
    });

    it('should not emit log when debug mode is disabled', () => {
      mockProps.isDebugMode = false;
      keypad.props = mockProps;
      
      keypad.logEmitter({ kind: 'info', message: 'Test message' });
      
      expect(mockApp.emit).not.toHaveBeenCalled();
    });
  });

  describe('Module initialization', () => {
    it('should export ManageKeypad when in Node.js environment', () => {
      expect(typeof ManageKeypad).toBe('function');
    });
  });
});