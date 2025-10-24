/**
 * Retrieves a node from the scene by name
 * @param {string} nodeName - The name of the node to retrieve
 * @returns {Object} The node object
 * @throws {Error} If the node name is not provided or the node is not found
 */
/* istanbul ignore next */
function getNode(nodeName) {
  if (!nodeName) {
    throw new Error('Node name is required');
  }

  const node = app.get(nodeName);
  if (!node) {
    throw new Error(`Model ${nodeName} not found in scene`);
  }

  return node;
}

/**
 * Creates a debug logger function for a specific class
 * @param {string} className - The name of the class
 * @returns {Function} A debug logger function specific to that class
 */
/* istanbul ignore next */
function createDebugLogger(className) {
  return function (kind, message) {
    if (props.isDebugMode) {
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
const mainLogger = createDebugLogger('KeyboardApp - Base');

/**
 * Initializes the application configuration with base settings and additional configs
 * @param {...Array} configs - Additional configuration arrays to merge
 */
/* istanbul ignore next */
function initAppConfig(...configs) {
  const baseConfig = [
    {
      type: 'section',
      key: 'basicSection',
      label: 'Basic Settings'
    },
    {
      key: 'appID',
      label: 'App ID',
      type: 'text'
    },
    {
      key: 'nodeName',
      label: 'Node Name',
      type: 'text',
      hint: 'The name of the 3D node in your scene that will be controlled by this app'
    },
    {
      key: 'isDebugMode',
      label: 'Debug Logs',
      type: 'toggle',
      initial: false,
      hint: 'Enable detailed logging to help troubleshoot keyboard issues'
    }
  ];

  props.appID = app.instanceId;

  app.configure([...baseConfig, ...configs.flat()]);
  mainLogger('info', 'Application configuration initialized');
}

class ManageKeypad {
  static KEYPAD_TYPE = {
    letters: { type: 'letters', height: 200, width: 470, position: [0, 1.5, 0], widthBtn: 50, heightBtn: 40 },
    numbers: { type: 'numbers', height: 240, width: 170, position: [0, 1.5, 0], widthBtn: 50, heightBtn: 40 },
  }

  static config = [
    {
      key: 'isDesignerMode',
      label: 'Designer Mode',
      type: 'toggle',
      initial: false,
    },
    {
      type: 'section',
      key: 'keypadSection',
      label: 'Keypad Settings'
    },
    {
      type: 'switch',
      key: 'keypadType',
      label: 'Keypad Type',
      options: [
        {
          label: 'Letters',
          value: ManageKeypad.KEYPAD_TYPE.letters.type,
        },
        {
          label: 'Numbers',
          value: ManageKeypad.KEYPAD_TYPE.numbers.type,
        }
      ],
    },
    {
      type: 'section',
      key: 'signalSection',
      label: 'Signal Settings'
    },
    {
      key: 'receiverId',
      label: 'Receiver ID',
      type: 'text',
    }
  ]

  constructor({ node, world, app, props }) {
    this.app = app;
    this.node = node;
    this.world = world;
    this.props = props;

    this.node.visible = this.props.isDesignerMode;

    this.keypadUI = null;

    this.props.isDesignerMode && this.showKeypad();
    this.initReceivers();

  }

  logEmitter({ kind, message }) {
    if (this.props.isDebugMode) {
      this.app.emit('log', { kind, message })
    }
  }

  setupKeypadUI() {
    const keypadValues = ManageKeypad.KEYPAD_TYPE[this.props.keypadType];

    this.keypadUI = app.create('ui', {
      gap: 8,
      padding: 15,
      borderRadius: 15,
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      width: keypadValues.width,
      height: keypadValues.height,
      position: keypadValues.position,
    });

    const keypadContainer = app.create('uiview', { gap: 8 });

    this.keypadUI.add(keypadContainer);

    let buttonRows;
    
    if (this.props.keypadType === ManageKeypad.KEYPAD_TYPE.letters.type) {
      buttonRows = [
        ['esc', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '⌫'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', '⏎'],
      ];
    } else {
      buttonRows = [
        ['esc', ' ', ' '],
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['⌫', '0', '⏎']
      ];
    }

    buttonRows.forEach((row) => {
      const rowUI = app.create('uiview', {
        gap: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        width: keypadValues.width - 30,
      });

      row.forEach((character) => {
        if (character !== ' ') {
          const button = app.create('uiview', {
            width: keypadValues.widthBtn,
            height: keypadValues.heightBtn,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#333333',
            onPointerDown: (e) => {
              if (character === '⌫') {
                this.logEmitter({ message: 'Backspace pressed. Emit from client an event keypad-backspace-ccx' });
                this.app.emit('keypad-backspace-ccx');
              } else if (character === '⏎') {
                this.logEmitter({ message: 'Enter pressed. Emit from client an event keypad-enter-ccx' });
                this.app.emit('keypad-enter-ccx');
              } else if (character === 'esc') {
                this.closeKeypad();
                this.logEmitter({ message: 'Escape pressed - Keypad hidden & emit from client an event keypad-scape-ccx' });
                this.app.emit('keypad-scape-ccx');
                this.world.emit('visibility-cc', { isVisible: false });
              } else {
                this.logEmitter({ message: `Character pressed: ${character}. Emitted from client an event keypad-character-ccx` });
                this.app.emit('keypad-character-ccx', { character })
              }
            },
            onPointerEnter: (e) => {
              button.backgroundColor = this.props.keypadButtonHoverColor || '#555555';
            },
            onPointerLeave: (e) => {
              button.backgroundColor = this.props.keypadButtonColor || '#333333';
            }
          });

          rowUI.add(button);

          button.add(
            app.create('uitext', {
              fontSize: 16,
              value: character,
              color: '#ffffff',
              fontWeight: 'bold',
              textAlign: 'center'
            })
          );
        } else {
          rowUI.add(
            app.create('uiview', {
              width: keypadValues.widthBtn,
              height: keypadValues.heightBtn,
            })
          );
        }
      });

      keypadContainer.add(rowUI);
    });
  }

  closeKeypad() {
    this.node.remove(this.keypadUI);
    this.keypadUI = null;
  }

  showKeypad() {
    if (!this.keypadUI) {
      this.setupKeypadUI();
      this.node.add(this.keypadUI);
    }
  }

  setKeypadVisibility(isVisible) {
    if (isVisible) {
      this.logEmitter({ message: 'Showing keypad' })
      this.showKeypad();
    } else {
      this.logEmitter({ message: 'Hidding keypad' })
      this.closeKeypad();
    }
  }

  initReceivers() {
    this.world.on(this.props.receiverId, ({ isVisible }) => {
      if (this.world.isServer) {
        this.app.send('visibility-sc', { isVisible });
        this.logEmitter({ message: 'Send "visibility-sc" event with the value of the visibility' })
      } else {
        this.setKeypadVisibility(isVisible);
        this.logEmitter({ message: `Making the node ${isVisible ? 'visible' : 'invisible'}` })
      }
    });

    this.world.on('visibility-cc', ({ isVisible }) => {
      this.logEmitter({ message: `Receive "visibility-cc" event making the node ${isVisible ? 'visible' : 'invisible'}` })
      this.setKeypadVisibility(isVisible);
    })

    this.app.on('visibility-sc', ({ isVisible }) => {
      this.logEmitter({ message: `Receive "visibility-sc" event making the node ${isVisible ? 'visible' : 'invisible'}` })
      this.setKeypadVisibility(isVisible);
    })
  }
}

// Only run initialization code in Hyperfy environment (not when importing for testing)
/* istanbul ignore next */
if (typeof module === 'undefined') {
  // We're in Hyperfy environment - run initialization
  try {
    initAppConfig(ManageKeypad.config);

    const node = getNode(props.nodeName);

    new ManageKeypad({ app, node, props, world });

    props.isDebugMode && app.emit('log', { kind: 'info', message: 'Keyboard controller initialized successfully' });
  } catch (error) {
    props.isDebugMode && app.emit('log', { kind: 'error', message: `Keyboard controller initialization failed: ${error.message}` });
  }
} else {
  // We're in Node.js environment (testing) - export for testing
  module.exports = {
    ManageKeypad
  };
}