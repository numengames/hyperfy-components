let rigidbody = null;

/**
 * Gets the rigidbody associated with the app
 * @returns {Object|null} The rigidbody or null if not found
 */
/* istanbul ignore next */
function getRigidbody() {
  return rigidbody;
}

/**
 * Sets the rigidbody for the app
 * @param {Object} newRigidbody - The new rigidbody to set
 */
/* istanbul ignore next */
function setRigidbody(newRigidbody) {
  rigidbody = newRigidbody;
}

/**
 * Finds a node in the scene by its name
 * @param {string} nodeName - The name of the node to find
 * @returns {Object} The found node
 * @throws {Error} If nodeName is not provided or node is not found
 */
/* istanbul ignore next */
function findNodeByName(nodeName) {
  if (world.isClient) {
    if (!nodeName) {
      throw new Error('Node name is required');
    }

    const node = app.get(nodeName);
    if (!node) {
      throw new Error(`Model ${nodeName} not found in scene`);
    }

    mainLogger('info', `Found node: ${props.targetNodeName}`);
    return node;
  }
}

/**
 * Creates a debug logger function for a specific class
 * @param {string} className - The name of the class
 * @returns {Function} A debug logger function specific to that class
 */
/* istanbul ignore next */
function createDebugLogger(className) {
  return function (kind, message) {
    if (props.enableDebugMode) {
      const logMessage = typeof message === 'string' ? message : JSON.stringify(message);
      const logData = {
        message: `[${className}] ${logMessage}`,
        type: kind
      };
      app.emit('log', logData);
    }
  };
}

/* istanbul ignore next */
let mainLogger;

/**
 * Initializes the application configuration with base settings and additional configs
 * @param {...Array} configs - Additional configuration arrays to merge
 */
/* istanbul ignore next */
function initAppConfig(...configs) {
  if (world.isClient) {
    const baseConfig = [
      {
        type: 'section',
        key: 'basicSection',
        label: 'Basic Settings'
      },
      {
        key: 'appID',
        label: 'AppID',
        type: 'text',
      },
      {
        key: 'targetNodeName',
        label: 'Node name',
        type: 'text',
        hint: 'The name of the 3D node in your scene that will be controlled by this app'
      },
      {
        key: 'enableDebugMode',
        label: 'Debug Mode',
        type: 'toggle',
        initial: false,
        hint: 'Enable detailed logging to help troubleshoot password manager issues'
      },
      {
        key: 'enableCollision',
        type: 'toggle',
        label: 'Add Collision',
        initial: true,
        hint: 'Forces all meshes to have collision. Disable this if your model already has embedded collision.'
      },
      {
        key: 'initialVisibility',
        label: 'Visible?',
        type: 'toggle',
        initial: true,
        hint: 'Initial visibility state of the node when the app starts'
      }
    ];

    props.appID = app.instanceId;

    app.configure([...baseConfig, ...configs.flat()]);
    mainLogger('info', 'Application configuration initialized');
  }
}

/**
 * Sets up collision detection for the model by creating rigidbody and colliders
 */
/* istanbul ignore next */
function setupCollision() {
  const currentRigidbody = getRigidbody();
  if (currentRigidbody) {
    currentRigidbody.active = true;
    mainLogger('info', 'Rigidbody already exists. Making it active again');
  } else {
    mainLogger('info', 'Setting mesh & collider to the model');

    const transformMatrix = new Matrix4();
    const appInverseMatrix = app.matrixWorld.clone().invert();
    const newRigidbody = app.create('rigidbody');
    setRigidbody(newRigidbody);

    let colliderCount = 0;
    app.traverse(node => {
      if (node.name === 'mesh') {
        const collider = app.create('collider');
        collider.type = 'geometry';
        collider.geometry = node.geometry;
        transformMatrix.copy(node.matrixWorld).premultiply(appInverseMatrix).decompose(
          collider.position,
          collider.quaternion,
          collider.scale
        );
        newRigidbody.add(collider);
        colliderCount++;
      }
    });

    newRigidbody.position.copy(app.position);
    newRigidbody.quaternion.copy(app.quaternion);
    newRigidbody.scale.copy(app.scale);

    world.add(newRigidbody);
    mainLogger('info', `Collision setup complete with ${colliderCount} colliders`);
  }
}

/**
 * Initializes the node's visibility and collision state based on configuration
 * @param {Object} node - The 3D node to configure
 */
/* istanbul ignore next */
function initializeNodeVisibility(node) {
  if (world.isClient) {
    mainLogger('info', `Setting initial visibility: ${props.initialVisibility}, collision: ${props.enableCollision}`);

    node.visible = props.initialVisibility;

    if (props.enableCollision) {
      setupCollision();
    }
  }
}

class PasswordManagerController {
  static EVENTS = {
    PASSWORD_SUCCESS: 'password-success',
    PASSWORD_ERROR: 'password-error',
    VISIBILITY_SERVER_TO_CLIENT: 'visibility-sc',
    VISIBILITY_CLIENT_TO_SERVER: 'visibility-cs',
  };

  constructor({ app, node, props, world }) {
    this.app = app;
    this.node = node;
    this.props = props;
    this.world = world;
    this.log = createDebugLogger(`${this.props.appID} - PasswordManagerController`);

    this.password = '';
    this.passwordUI = null;
    this.passwordUIText = null;
    this.errorMessageUI = null;

    this.log('info', 'PasswordManagerController instance created');
    
    this._initEventListeners();
  }


  _getActionHandlers() {
    return {
      'show-password-input': (ctx, payload) => ctx._onShowPasswordInput(payload),
      'hide-password-input': (ctx, payload) => ctx._onHidePasswordInput(payload),
      'validate-password': (ctx, payload) => ctx._onValidatePassword(payload)
    };
  }

  _onShowPasswordInput(payload) {
    this.setTextInputVisibility(true);
    this.log('info', 'Showing password input');
  }

  _onHidePasswordInput(payload) {
    this.setTextInputVisibility(false);
    this.log('info', 'Hiding password input');
  }

  _onValidatePassword(payload) {
    const password = payload.password || '';
    if (this.props.passwordManagerMasterPassword === password) {
      this.app.send('validate-sc', true);
      this.log('info', 'Password validation successful');
    } else {
      this.app.send('validate-sc', false);
      this.log('warn', 'Password validation failed');
    }
  }

  _normalizeReceivers(receiverArray) {
    try {
      receiverArray = JSON.parse(receiverArray);
      receiverArray = Array.isArray(receiverArray) ? receiverArray : [receiverArray];
      receiverArray = receiverArray.filter(item => item != null && item !== '');
      this.log('debug', 'Parsed receiver string to JSON');
    } catch (error) {
      this.log('warn', 'Failed to parse JSON string, using empty array');
      receiverArray = [];
    }

    const normalized = receiverArray.flatMap(item => {
      if (!item.id || !item.actions || !Array.isArray(item.actions)) {
        this.log('warn', `Invalid receiver config: expected {id, actions[]}`, item);
        return [];
      }

      return item.actions.map(({ type, params }) => ({
        id: item.id,
        type,
        params: params || {}
      }));
    });

    this.log('debug', `Normalized ${normalized.length} receivers`);
    return normalized;
  }

  _handleEvent(actionType, params, data) {
    const payload = { ...params, ...data };
    const actionHandlers = this._getActionHandlers();

    if (actionHandlers[actionType]) {
      actionHandlers[actionType](this, payload);
    } else {
      this.log('warn', `Unhandled action: ${actionType}`, payload);
    }
  }

  _initEventListeners() {
    this.log('info', 'Initializing event listeners');
    
    // Server-client communication
    this.world.on(this.props.passwordManagerReceiverId, (payload) => {
      if (this.world.isServer) {
        this.app.send(PasswordManagerController.EVENTS.VISIBILITY_SERVER_TO_CLIENT, payload);
        this.log('info', 'Send "visibility-sc" event with visibility value');
      } else {
        this.setTextInputVisibility(payload.isVisible);
        this.log('info', `Making the node ${payload.isVisible ? 'visible' : 'invisible'}`);
      }
    });

    this.app.on(PasswordManagerController.EVENTS.VISIBILITY_SERVER_TO_CLIENT, (payload) => {
      this.setTextInputVisibility(payload.isVisible);
      this.log('info', `Receive "visibility-sc" event making the node ${payload.isVisible ? 'visible' : 'invisible'}`);
    });

    // Keyboard input handling
    this.world.on('keypad-character-ccx', (payload) => {
      this.log('info', `Receive "keypad-character-ccx" event with value ${payload.character}`);
      if (this.passwordUI) {
        this.passwordUI.remove(this.errorMessageUI);
        this.password += payload.character;
        this.passwordUIText.value = this.password;
      }
    });

    this.world.on('keypad-backspace-ccx', () => {
      if (this.passwordUI) {
        this.passwordUI.remove(this.errorMessageUI);
        this.password = this.password.slice(0, -1);
        this.passwordUIText.value = this.password;
      }
    });

    this.world.on('keypad-enter-ccx', () => {
      if (this.passwordUI) {
        this.app.send('validate-cs', { password: this.password });
      }
    });

    // Password validation
    this.app.on('validate-cs', (payload) => {
      this._onValidatePassword(payload);
    });

    this.app.on('validate-sc', (payload) => {
      if (!payload) {
        this.passwordUI.add(this.errorMessageUI);
        this.world.emit(PasswordManagerController.EVENTS.PASSWORD_ERROR + '-cc');
      } else {
        this.closeTextInput();
        this.world.emit('visibility-cc', false);
        this.world.emit(PasswordManagerController.EVENTS.PASSWORD_SUCCESS + '-cc');
      }
    });

    this.world.on('visibility-cc', (payload) => {
      this.setTextInputVisibility(payload.isVisible);
      this.log('info', `Receive "visibility-cc" event making the node ${payload.isVisible ? 'visible' : 'invisible'}`);
    });
    
    this.log('info', 'Event listeners initialized successfully');
  }

  setupTextInputUI() {
    this.passwordUI = this.app.create('ui', {
      width: 150,
      height: 120,
      padding: [15, 10, 15, 10],
      borderRadius: 10,
      position: [0, 2, 0],
      flexDirection: 'column',
      justifyContent: 'flex-start',
      backgroundColor: 'rgba(0, 0, 0, .9)',
    });

    const title = this.app.create('uitext', {
      value: this.props.passwordManagerTitle,
      fontSize: 16,
      textAlign: 'center',
      color: '#ffffff',
    });

    this.passwordUI.add(title);

    const contentView = this.app.create('uiview', {
      padding: 12,
      borderRadius: 5,
      flexDirection: 'row',
      margin: [10, 0, 0, 0],
      justifyContent: 'center',
    });

    this.passwordUI.add(contentView);

    this.passwordUIText = this.app.create('uitext', {
      lineHeight: 1,
      fontSize: 14, 
      color: '#ffffff',
      textAlign: 'center',
    });

    contentView.add(this.passwordUIText);

    this.errorMessageUI = this.app.create('uitext', {
      fontSize: 12,
      value: 'bad',
      margin: [8, 0, 0, 0],
      color: '#ff4444',
      textAlign: 'center',
    });
  }
  
  closeTextInput() {
    if (this.passwordUI) {
      this.node.remove(this.passwordUI);
    }

    this.passwordUI = null;
    this.errorMessageUI = null;
    this.passwordUIText = null;
    this.password = '';
  }

  showTextInput() {
    if (!this.passwordUI) {
      this.setupTextInputUI();
      this.node.add(this.passwordUI);
    }
  }

  setTextInputVisibility(isVisible) {
    if (isVisible) {
      this.showTextInput();
      this.log('info', 'Showing text input');
    } else {
      this.closeTextInput();
      this.log('info', 'Hiding text input');
    }
  }

  static getConfig() {
    return [
      {
        type: 'section',
        key: 'passwordManagerSection',
        label: 'Password Manager Settings'
      },
      {
        key: 'passwordManagerIsDesignerMode',
        label: 'Designer Mode',
        type: 'toggle',
        initial: false,
        hint: 'Show password input UI in designer mode for testing'
      },
      {
        key: 'passwordManagerMasterPassword',
        label: 'Master Password',
        type: 'text',
        hint: 'The password that will be validated against user input'
      },
      {
        key: 'passwordManagerTitle',
        label: 'Title',
        type: 'text',
        initial: 'Enter Password',
        hint: 'Title displayed in the password input UI'
      },
      {
        type: 'section',
        key: 'passwordManagerSignalSection',
        label: 'Signal Settings'
      },
      {
        key: 'passwordManagerReceiverId',
        label: 'Receiver ID',
        type: 'text',
        hint: 'ID for receiving visibility control signals from other components'
      }
    ];
  }
}

// Only run initialization code in Hyperfy environment (not when importing for testing)
/* istanbul ignore next */
if (typeof module === 'undefined') {
  // We're in Hyperfy environment - run initialization
  try {
    mainLogger = createDebugLogger(app.instanceId);
    mainLogger('info', 'Starting password manager app initialization');

    initAppConfig(PasswordManagerController.getConfig());

    const node = findNodeByName(props.targetNodeName);
    mainLogger('info', `Found node: ${props.targetNodeName}`);

    initializeNodeVisibility(node);

    const controller = new PasswordManagerController({ app, node, props, world });
    
    // Show UI in designer mode
    if (props.passwordManagerIsDesignerMode) {
      controller.setTextInputVisibility(true);
    }

    mainLogger('info', 'Password manager app initialized successfully');
  } catch (error) {
    mainLogger('error', `Password manager app initialization failed: ${error.message}`);
    mainLogger('error', `Stack trace: ${error.stack}`);
  }
} else {
  // We're in Node.js environment (testing) - export for testing
  module.exports = {
    PasswordManagerController,
    getRigidbody,
    setRigidbody,
    findNodeByName
  };
}