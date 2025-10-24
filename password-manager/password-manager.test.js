const { PasswordManagerController } = require('./password-manager.js');

// Mock global objects
global.app = {
  create: jest.fn(),
  emit: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  instanceId: 'testAppId',
  get: jest.fn(() => ({ name: 'test-node', visible: true })),
  configure: jest.fn(),
  matrixWorld: { clone: jest.fn(() => ({ invert: jest.fn(() => ({})) })) },
  position: { copy: jest.fn() },
  quaternion: { copy: jest.fn() },
  scale: { copy: jest.fn() },
  traverse: jest.fn((callback) => callback({ name: 'mesh', geometry: {}, matrixWorld: {} }))
};

global.props = {
  enableDebugMode: true,
  appID: 'testAppId',
  targetNodeName: 'test-node',
  initialVisibility: true,
  enableCollision: true
};

global.world = {
  on: jest.fn(),
  emit: jest.fn(),
  isServer: false,
  isClient: true,
  add: jest.fn()
};

const mockApp = global.app;
const mockNode = {
  name: 'test-node',
  visible: true,
  add: jest.fn(),
  remove: jest.fn(),
  emote: null
};

const mockWorld = global.world;

const mockProps = {
  appID: 'testAppId',
  targetNodeName: 'test-node',
  enableDebugMode: true,
  enableCollision: true,
  initialVisibility: true,
  passwordManagerIsDesignerMode: false,
  passwordManagerMasterPassword: 'test123',
  passwordManagerTitle: 'Enter Password',
  passwordManagerReceiverId: 'test-receiver'
};

// Mock Matrix4
global.Matrix4 = jest.fn().mockImplementation(() => ({
  clone: jest.fn().mockReturnThis(),
  invert: jest.fn().mockReturnThis(),
  copy: jest.fn().mockReturnThis(),
  premultiply: jest.fn().mockReturnThis(),
  decompose: jest.fn().mockReturnThis()
}));

describe('PasswordManagerController', () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockApp.create.mockImplementation((type) => {
      if (type === 'ui') return { add: jest.fn(), remove: jest.fn() };
      if (type === 'uitext') return { value: '' };
      if (type === 'uiview') return { add: jest.fn() };
      return {};
    });

    controller = new PasswordManagerController({
      app: mockApp,
      node: mockNode,
      props: mockProps,
      world: mockWorld
    });
  });

  describe('Constructor and initialization', () => {
    it('should create PasswordManagerController instance with initial state', () => {
      expect(controller).toBeDefined();
      expect(controller.app).toBe(mockApp);
      expect(controller.node).toBe(mockNode);
      expect(controller.props).toBe(mockProps);
      expect(controller.world).toBe(mockWorld);
      expect(controller.password).toBe('');
      expect(controller.passwordUI).toBeNull();
    });

    it('should initialize event listeners', () => {
      expect(mockWorld.on).toHaveBeenCalledWith('test-receiver', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('visibility-sc', expect.any(Function));
      expect(mockWorld.on).toHaveBeenCalledWith('keypad-character-ccx', expect.any(Function));
      expect(mockWorld.on).toHaveBeenCalledWith('keypad-backspace-ccx', expect.any(Function));
      expect(mockWorld.on).toHaveBeenCalledWith('keypad-enter-ccx', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('validate-cs', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('validate-sc', expect.any(Function));
      expect(mockWorld.on).toHaveBeenCalledWith('visibility-cc', expect.any(Function));
    });
  });

  describe('Action handlers', () => {
    it('should handle show-password-input action', () => {
      const showTextInputVisibilitySpy = jest.spyOn(controller, 'setTextInputVisibility').mockImplementation(() => {});
      
      controller._onShowPasswordInput({});
      
      expect(showTextInputVisibilitySpy).toHaveBeenCalledWith(true);
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Showing password input'),
        type: 'info'
      }));
      
      showTextInputVisibilitySpy.mockRestore();
    });

    it('should handle hide-password-input action', () => {
      const setTextInputVisibilitySpy = jest.spyOn(controller, 'setTextInputVisibility').mockImplementation(() => {});
      
      controller._onHidePasswordInput({});
      
      expect(setTextInputVisibilitySpy).toHaveBeenCalledWith(false);
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Hiding password input'),
        type: 'info'
      }));
      
      setTextInputVisibilitySpy.mockRestore();
    });

    it('should handle validate-password action with correct password', () => {
      controller._onValidatePassword({ password: 'test123' });
      
      expect(mockApp.send).toHaveBeenCalledWith('validate-sc', true);
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Password validation successful'),
        type: 'info'
      }));
    });

    it('should handle validate-password action with incorrect password', () => {
      controller._onValidatePassword({ password: 'wrong' });
      
      expect(mockApp.send).toHaveBeenCalledWith('validate-sc', false);
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Password validation failed'),
        type: 'warn'
      }));
    });
  });

  describe('UI management', () => {
    it('should show text input when setTextInputVisibility(true)', () => {
      const showTextInputSpy = jest.spyOn(controller, 'showTextInput').mockImplementation(() => {});
      
      controller.setTextInputVisibility(true);
      
      expect(showTextInputSpy).toHaveBeenCalled();
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Showing text input'),
        type: 'info'
      }));
      
      showTextInputSpy.mockRestore();
    });

    it('should hide text input when setTextInputVisibility(false)', () => {
      const closeTextInputSpy = jest.spyOn(controller, 'closeTextInput').mockImplementation(() => {});
      
      controller.setTextInputVisibility(false);
      
      expect(closeTextInputSpy).toHaveBeenCalled();
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Hiding text input'),
        type: 'info'
      }));
      
      closeTextInputSpy.mockRestore();
    });

    it('should create password UI when showTextInput is called', () => {
      controller.showTextInput();
      
      expect(mockApp.create).toHaveBeenCalledWith('ui', expect.objectContaining({
        width: 150,
        height: 120,
        backgroundColor: 'rgba(0, 0, 0, .9)'
      }));
      expect(mockNode.add).toHaveBeenCalled();
    });

    it('should close text input properly', () => {
      controller.passwordUI = { mock: true };
      controller.passwordUIText = { mock: true };
      controller.errorMessageUI = { mock: true };
      
      controller.closeTextInput();
      
      expect(mockNode.remove).toHaveBeenCalledWith({ mock: true });
      expect(controller.passwordUI).toBeNull();
      expect(controller.passwordUIText).toBeNull();
      expect(controller.errorMessageUI).toBeNull();
      expect(controller.password).toBe('');
    });
  });

  describe('Event handling', () => {
    it('should handle receiver event in server context', () => {
      mockWorld.isServer = true;
      
      const receiverHandler = mockWorld.on.mock.calls.find(call => call[0] === 'test-receiver')[1];
      
      receiverHandler({ isVisible: true });
      
      expect(mockApp.send).toHaveBeenCalledWith('visibility-sc', { isVisible: true });
    });

    it('should handle receiver event in client context', () => {
      mockWorld.isServer = false;
      
      const setTextInputVisibilitySpy = jest.spyOn(controller, 'setTextInputVisibility').mockImplementation(() => {});
      
      const receiverHandler = mockWorld.on.mock.calls.find(call => call[0] === 'test-receiver')[1];
      
      receiverHandler({ isVisible: true });
      
      expect(setTextInputVisibilitySpy).toHaveBeenCalledWith(true);
      
      setTextInputVisibilitySpy.mockRestore();
    });

    it('should handle visibility-sc event', () => {
      const setTextInputVisibilitySpy = jest.spyOn(controller, 'setTextInputVisibility').mockImplementation(() => {});
      
      const visibilityHandler = mockApp.on.mock.calls.find(call => call[0] === 'visibility-sc')[1];
      
      visibilityHandler({ isVisible: true });
      
      expect(setTextInputVisibilitySpy).toHaveBeenCalledWith(true);
      
      setTextInputVisibilitySpy.mockRestore();
    });

    it('should handle keypad character input', () => {
      controller.passwordUI = { remove: jest.fn() };
      controller.passwordUIText = { value: '' };
      
      const characterHandler = mockWorld.on.mock.calls.find(call => call[0] === 'keypad-character-ccx')[1];
      
      characterHandler({ character: 'a' });
      
      expect(controller.password).toBe('a');
      expect(controller.passwordUIText.value).toBe('a');
    });

    it('should handle keypad backspace', () => {
      controller.password = 'test';
      controller.passwordUI = { remove: jest.fn() };
      controller.passwordUIText = { value: 'test' };
      
      const backspaceHandler = mockWorld.on.mock.calls.find(call => call[0] === 'keypad-backspace-ccx')[1];
      
      backspaceHandler();
      
      expect(controller.password).toBe('tes');
      expect(controller.passwordUIText.value).toBe('tes');
    });

    it('should handle keypad enter', () => {
      controller.password = 'test123';
      controller.passwordUI = { mock: true };
      
      const enterHandler = mockWorld.on.mock.calls.find(call => call[0] === 'keypad-enter-ccx')[1];
      
      enterHandler();
      
      expect(mockApp.send).toHaveBeenCalledWith('validate-cs', { password: 'test123' });
    });

    it('should handle validate-sc event with invalid password', () => {
      controller.passwordUI = { add: jest.fn() };
      controller.errorMessageUI = { mock: true };
      
      const validateHandler = mockApp.on.mock.calls.find(call => call[0] === 'validate-sc')[1];
      
      validateHandler(false);
      
      expect(controller.passwordUI.add).toHaveBeenCalledWith({ mock: true });
      expect(mockWorld.emit).toHaveBeenCalledWith('password-error-cc');
    });

    it('should handle validate-sc event with valid password', () => {
      const closeTextInputSpy = jest.spyOn(controller, 'closeTextInput').mockImplementation(() => {});
      
      const validateHandler = mockApp.on.mock.calls.find(call => call[0] === 'validate-sc')[1];
      
      validateHandler(true);
      
      expect(closeTextInputSpy).toHaveBeenCalled();
      expect(mockWorld.emit).toHaveBeenCalledWith('visibility-cc', false);
      expect(mockWorld.emit).toHaveBeenCalledWith('password-success-cc');
      
      closeTextInputSpy.mockRestore();
    });
  });

  describe('Logging functionality', () => {
    it('should emit log when debug mode is enabled', () => {
      controller.props.enableDebugMode = true;
      
      controller.log('info', 'Test message');
      
      expect(mockApp.emit).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Test message'),
        type: 'info'
      }));
    });

    it('should not emit log when debug mode is disabled', () => {
      // Clear previous calls
      mockApp.emit.mockClear();
      
      // Change global props instead of controller props
      global.props.enableDebugMode = false;
      
      controller.log('info', 'Test message');
      
      expect(mockApp.emit).not.toHaveBeenCalled();
      
      // Restore global props
      global.props.enableDebugMode = true;
    });
  });

  describe('Static members', () => {
    it('should have getConfig static method', () => {
      const config = PasswordManagerController.getConfig();
      
      expect(Array.isArray(config)).toBe(true);
      expect(config.length).toBeGreaterThan(0);
      
      const designerModeConfig = config.find(item => item.key === 'passwordManagerIsDesignerMode');
      expect(designerModeConfig).toBeDefined();
      expect(designerModeConfig.type).toBe('toggle');
    });
  });

  describe('Module initialization', () => {
    it('should export PasswordManagerController when in Node.js environment', () => {
      const { PasswordManagerController: ExportedController } = require('./password-manager.js');
      expect(ExportedController).toBe(PasswordManagerController);
    });
  });
});
