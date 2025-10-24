let rigidbody = null;

/* istanbul ignore next */
function getRigidbody() {
  return rigidbody;
}

/* istanbul ignore next */
function setRigidbody(value) {
  rigidbody = value;
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
        hint: 'Enable detailed logging to help troubleshoot dialog issues'
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

/**
 * DialogController handles interactive dialog system for character conversations
 * with support for multiple lines, character names, auto-advance, and text splitting
 */
class DialogController {
  static EVENTS = {
    HIDE_DIALOG: 'hide-dialog',
    NEXT_DIALOG: 'next-dialog',
  };

  /* istanbul ignore next */
  static getConfig() {
    return [
      {
        type: 'section',
        key: 'dialogSection',
        label: 'Dialog Settings'
      },
      {
        key: 'dialogControllerEnableDelay',
        label: 'Use Delay',
        type: 'toggle',
        initial: false,
        hint: 'Enable delay before showing dialogs. Useful for creating smooth transitions or timed effects'
      },
      {
        key: 'dialogControllerTransitionDelay',
        label: 'Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hint: 'Time to wait before showing dialogs. Range: 0.1 to 60 seconds'
      },
      {
        key: 'dialogControllerWidth',
        label: 'Dialog Width',
        type: 'number',
        min: 10,
        max: 1200,
        step: 10,
        initial: 400,
        hint: 'Width of the dialog box in pixels'
      },
      {
        key: 'dialogControllerHeight',
        label: 'Dialog Height',
        type: 'number',
        min: 5,
        max: 800,
        step: 10,
        initial: 110,
        hint: 'Height of the dialog box in pixels'
      },
      {
        key: 'dialogControllerBackground',
        label: 'Dialog Background',
        type: 'color',
        initial: '#0a2a43ea',
        hint: 'Background color of the dialog box'
      },
      {
        key: 'dialogControllerBorder',
        label: 'Dialog Border',
        type: 'color',
        initial: '#1e90ff',
        hint: 'Border color of the dialog box'
      },
      {
        key: 'dialogControllerBorderRadius',
        label: 'Border Radius',
        type: 'number',
        min: 0,
        max: 20,
        step: 1,
        initial: 10,
        hint: 'Border radius of the dialog box'
      },
      {
        key: 'dialogControllerTextColor',
        label: 'Text Color',
        type: 'color',
        initial: '#ffffff',
        hint: 'Color of the dialog text'
      },
      {
        key: 'dialogControllerFontSize',
        label: 'Font Size',
        type: 'number',
        min: 8,
        max: 24,
        step: 1,
        initial: 11,
        hint: 'Size of the dialog text font'
      },
      {
        key: 'dialogControllerFontWeight',
        label: 'Font Weight',
        type: 'select',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Bold', value: 'bold' }
        ],
        initial: 'bold',
        hint: 'Weight of the dialog text font'
      },
      {
        key: 'dialogControllerTriggerAudio',
        type: 'file',
        kind: 'audio',
        label: 'Trigger Audio',
        hint: 'Audio that plays when the dialog is first triggered'
      },
      {
        key: 'dialogControllerStandEmote',
        type: 'file',
        kind: 'emote',
        label: 'Stand Emote',
        hint: 'Emote to play when dialog is not active'
      },
      {
        key: 'dialogControllerTalkEmote',
        type: 'file',
        kind: 'emote',
        label: 'Talk Emote',
        hint: 'Emote to play when dialog is active'
      },
      {
        key: 'dialogControllerShowNameLabel',
        label: 'Show Character Name',
        type: 'toggle',
        initial: true,
        hint: 'Whether to display the character name above the dialog'
      },
      {
        key: 'dialogControllerCharacterName',
        label: 'Character Name',
        type: 'text',
        initial: 'Character',
        hint: 'Name of the character speaking'
      },
      {
        key: 'dialogControllerNameLabelColor',
        label: 'Name Label Color',
        type: 'color',
        initial: '#ffdd99',
        hint: 'Color of the character name label'
      },
      {
        key: 'dialogControllerNameLabelSize',
        label: 'Name Label Size',
        type: 'number',
        min: 8,
        max: 24,
        step: 1,
        initial: 13,
        hint: 'Size of the character name label font'
      },
      {
        key: 'dialogControllerHasImageInDialog',
        label: 'Show Image in Dialog',
        type: 'toggle',
        initial: false,
        hint: 'Whether to display an image in the dialog box'
      },
      {
        key: 'dialogControllerImage',
        type: 'file',
        kind: 'texture',
        label: 'Dialog Image',
        hint: 'Image to display in the dialog box',
        hidden: true
      },
      {
        key: 'dialogControllerImageWidth',
        label: 'Image Width',
        type: 'number',
        min: 50,
        max: 200,
        step: 10,
        initial: 50,
        hint: 'Width of the dialog image in pixels',
        hidden: true
      },
      {
        key: 'dialogControllerImageHeight',
        label: 'Image Height',
        type: 'number',
        min: 50,
        max: 200,
        step: 10,
        initial: 50,
        hint: 'Height of the dialog image in pixels',
        hidden: true
      },
      {
        key: 'dialogControllerMaxCharsPerDialog',
        label: 'Max Characters Per Dialog',
        type: 'number',
        min: 10,
        max: 500,
        step: 10,
        initial: 150,
        hint: 'Maximum number of characters per dialog line before splitting'
      },
      {
        key: 'dialogControllerAutoAdvance',
        label: 'Auto Advance',
        type: 'toggle',
        initial: false,
        hint: 'Automatically advance to next dialog line after a delay'
      },
      {
        key: 'dialogControllerDialogDuration',
        label: 'Dialog Duration (sec)',
        type: 'number',
        min: 1,
        max: 30,
        step: 1,
        initial: 5,
        hint: 'Time to wait before auto-advancing to next line',
        hidden: !props.dialogControllerAutoAdvance
      },
      {
        key: 'dialogControllerDefaultPhrases',
        label: 'Default Dialog Phrases',
        type: 'textarea',
        initial: 'Welcome! How can I help you today?\nI\'m here to assist you with any questions you might have.\nFeel free to explore and interact with the environment.\nIs there anything specific you\'d like to know about?',
        hint: 'Default phrases to show when no dialog content is provided. One phrase per line.'
      },
      {
        key: 'dialogControllerAcceptAnyEmitter',
        label: 'Accept Any Event',
        type: 'toggle',
        initial: false,
        hint: 'Allow to receive events from any emitter that emit to the appID directly. Useful for unknown or generative apps'
      },
      {
        key: 'dialogControllerEventReceivers',
        label: 'Event Listeners',
        type: 'textarea',
        initial: '[]',
        hint: 'JSON array of event configurations. Each item should have an "id" (appID) and "actions" array with "type" and "params". Example: [{"id":"<appID>","actions":[{"type":"next-dialog","params":{"dialogText":"Hello!","characterName":"NPC"}}]}]. Replace <appID> with your app ID. Available actions: next-dialog, hide-dialog.'
      },
    ];
  }

  /**
   * Creates a new DialogController instance
   * @param {Object} params - Configuration parameters
   * @param {Object} params.app - Hyperfy app instance
   * @param {Object} params.node - 3D node to control
   * @param {Object} params.props - Component properties
   * @param {Object} params.world - Hyperfy world instance
   */
  constructor({ app, node, props, world }) {
    this.app = app;
    this.node = node;
    this.props = props;
    this.world = world;
    this.log = createDebugLogger(`${this.props.appID} - DialogController`);

    this.dialogUI = null;
    this.storyText = null;
    this.pageIndicator = null;
    this.lineChangeTimer = null;
    this.timerObsolete = false;
    this.dialogLines = [];
    this.currentLineIndex = 0;
    this.isDialogVisible = false;
    this.isDialogCompleted = false;
    this.nextAction = null;
    this.closeAction = null;

    this._initEventListeners();
  }

  _getActionHandlers() {
    return {
      'next-dialog': (ctx, payload) => ctx._onNextDialog(payload),
      'hide-dialog': (ctx, payload) => ctx._onHideDialog(payload)
    };
  }

  _executeShowDialog(payload) {
    // Hide existing dialog if visible
    if (this.isDialogVisible) {
      this._executeHideDialog({});
    }

    // Process dialog content
    const characterName = payload.characterName || this.props.dialogControllerCharacterName;
    
    if (payload.dialogPhrases && Array.isArray(payload.dialogPhrases)) {
      this.dialogLines = payload.dialogPhrases;
    } else if (payload.dialogText) {
      this.dialogLines = [payload.dialogText]; // No splitting, user handles it
    } else {
      const defaultPhrases = this.props.dialogControllerDefaultPhrases;
      this.dialogLines = defaultPhrases.split('\n').filter(line => line.trim());
    }
    
    this.currentLineIndex = 0;
    this.isDialogVisible = true;
    this.isDialogCompleted = false; // Reset when starting new dialog

    this._createDialogUI(characterName);
    this._showCurrentLine();
    this._createDialogActions();

    // Change avatar emote to talking
    if (this.props.dialogControllerTalkEmote?.url) {
      this.node.emote = this.props.dialogControllerTalkEmote.url;
    }

    // Play trigger audio if configured
    if (this.world.isClient && this.props.dialogControllerTriggerAudio?.url) {
      const audio = this.app.create('audio', {
        src: this.props.dialogControllerTriggerAudio.url,
        volume: 1,
        loop: false,
        group: 'sfx',
        spatial: true
      });
      this.node.add(audio);
      audio.play();
    }

  }

  _onHideDialog(payload) {
    this._executeHideDialog(payload);
  }

  _executeHideDialog(payload) {
    this.isDialogVisible = false;
    this.currentLineIndex = 0;
    // Don't reset isDialogCompleted here - let it persist
    
    // Change avatar emote to standing
    if (this.props.dialogControllerStandEmote?.url) {
      this.node.emote = this.props.dialogControllerStandEmote.url;
    }
    
    this._cleanupDialog();
  }

  _onNextDialog(payload) {
    const delay = payload.delay !== undefined ? payload.delay : this.props.dialogControllerTransitionDelay;
    const shouldApplyDelay = this.props.dialogControllerEnableDelay && delay > 0;

    if (shouldApplyDelay) {
      setTimeout(() => {
        this._executeNextDialog(payload, true); // true = manual advance
      }, delay * 1000);
    } else {
      this._executeNextDialog(payload, true); // true = manual advance
    }
  }

  _executeNextDialog(payload, isManual = false) {
    // Mark any existing timer as obsolete only for manual advances
    if (isManual) {
      this.timerObsolete = true;
    }

    // If dialog is not visible, show it first
    if (!this.isDialogVisible) {
      // If dialog was completed and we're trying to show it again, hide it completely
      if (this.isDialogCompleted) {
        this._executeHideDialog({});
        return;
      }
      
      this._executeShowDialog(payload);
      return;
    }

    // Dialog is visible, advance to next line
    this.currentLineIndex++;
    
    if (this.currentLineIndex >= this.dialogLines.length) {
      this.isDialogCompleted = true;
      this._executeHideDialog({});
      return;
    }
    
    this._showCurrentLine();
  }

  _createDialogUI(characterName) {
    this._cleanupDialog();
    
    this.dialogUI = this.app.create('ui', {
      width: this.props.dialogControllerWidth || 400,
      height: this.props.dialogControllerHeight || 110,
      position: [0, 2.1, 0],
      backgroundColor: this.props.dialogControllerBackground || '#0a2a43ea',
      borderColor: this.props.dialogControllerBorder || '#1e90ff',
      borderWidth: 2,
      billboard: 'full',
      borderRadius: this.props.dialogControllerBorderRadius || 10,
    });

    const contentView = this.app.create('uiview', {
      padding: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
    });

    // Add image if configured
    if (this.props.dialogControllerHasImageInDialog && this.props.dialogControllerImage?.url) {
      const image = this.app.create('uiimage', {
        src: this.props.dialogControllerImage.url,
        width: this.props.dialogControllerImageWidth || 50,
        height: this.props.dialogControllerImageHeight || 50,
        margin: [0, 20, 0, 10]
      });
      contentView.add(image);
    }

    // Create text content view
    const textContentView = this.app.create('uiview', {
      flexDirection: 'column',
      justifyContent: 'space-between',
      margin: [0, 10, 0, 0],
    });

    contentView.add(textContentView);

    // Create dialog content view
    const dialogContentView = this.app.create('uiview', {
      flexDirection: 'column',
      justifyContent: 'space-between',
      margin: [5, 0, 5, 0],
    });

    textContentView.add(dialogContentView);

    // Add character name if configured
    if (this.props.dialogControllerShowNameLabel && characterName) {
      const nameLabel = this.app.create('uitext', {
        value: characterName,
        fontSize: this.props.dialogControllerNameLabelSize || 13,
        fontWeight: 'bold',
        color: this.props.dialogControllerNameLabelColor || '#ffffff',
        textAlign: 'left',
        margin: [0, 0, 10, 0]
      });
      dialogContentView.add(nameLabel);
    }

    // Create dialog text
    this.storyText = this.app.create('uitext', {
        fontSize: this.props.dialogControllerFontSize || 11,
      fontWeight: this.props.dialogControllerFontWeight || 'bold',
      color: this.props.dialogControllerTextColor || '#ffffff',
      textAlign: 'left',
      margin: [0, 20, 0, 0]
    });

    dialogContentView.add(this.storyText);

    // Add page indicator
    this.pageIndicator = this.app.create('uitext', {
      value: '',
      fontSize: (this.props.dialogControllerNameLabelSize || 13) - 2,
      fontWeight: 'bold',
      color: this.props.dialogControllerNameLabelColor || '#ffffff',
      textAlign: 'right',
      margin: [0, 0, 0, 0]
    });

    textContentView.add(this.pageIndicator);

    this.dialogUI.add(contentView);
    this.app.add(this.dialogUI);
  }

  _showCurrentLine() {
    if (!this.storyText || this.currentLineIndex >= this.dialogLines.length) return;
    
    const currentLine = this.dialogLines[this.currentLineIndex];
    this.storyText.value = currentLine;
    
    // Update page indicator
    if (this.pageIndicator) {
      this.pageIndicator.value = `${this.currentLineIndex + 1}/${this.dialogLines.length}`;
    }
    
    // Set auto-advance timer for all lines (including the last one to auto-close)
    if (this.props.dialogControllerAutoAdvance) {
      const duration = this.props.dialogControllerDialogDuration || 5;
      // Only reset obsolete flag if there's no existing timer
      if (!this.lineChangeTimer) {
        this.timerObsolete = false;
      }
      this.lineChangeTimer = setTimeout(() => {
        // Only execute if timer is not obsolete (user hasn't manually advanced)
        if (!this.timerObsolete) {
          this._executeNextDialog({}, false); // false = automatic advance
        }
      }, duration * 1000);
    }
  }

  _createDialogActions() {
    // Create "Next" action
    this.nextAction = this.app.create('action', {
      label: 'Next Dialog',
      distance: 3,
      onTrigger: () => {
        if (this.isDialogVisible) {
          this._executeNextDialog({}, true); // true = manual advance
        }
      }
    });

    // Create "Close" action
    this.closeAction = this.app.create('action', {
      label: 'Close Dialog',
      distance: 3,
      onTrigger: () => {
        if (this.isDialogVisible) {
          this._executeHideDialog({});
        }
      }
    });

    // Add actions to the node
    this.node.add(this.nextAction);
    this.node.add(this.closeAction);
  }

  _removeDialogActions() {
    if (this.nextAction) {
      this.node.remove(this.nextAction);
      this.nextAction = null;
    }
    if (this.closeAction) {
      this.node.remove(this.closeAction);
      this.closeAction = null;
    }
  }

  _cleanupDialog() {
    // Mark timer as obsolete instead of clearing (clearTimeout not available)
    this.timerObsolete = true;
    this.lineChangeTimer = null;
    
    this._removeDialogActions();
    
    if (this.dialogUI) {
      this.app.remove(this.dialogUI);
      this.dialogUI = null;
      this.storyText = null;
      this.pageIndicator = null;
    }
  }

  _normalizeReceivers(receiver) {
    let receiverArray = receiver;

    if (typeof receiverArray === 'string') {
      if (receiverArray.trim().startsWith('[') || receiverArray.trim().startsWith('{')) {
        try {
          receiverArray = JSON.parse(receiverArray);
        } catch (error) {
          receiverArray = [];
        }
      } else {
        receiverArray = [];
      }
    }

    receiverArray = Array.isArray(receiverArray) ? receiverArray : [receiverArray];

    const normalized = receiverArray.flatMap(item => {
      if (typeof item === 'string') {
        return [{ id: item, type: item, params: {} }];
      }

      if (item.actions && Array.isArray(item.actions)) {
        return item.actions.map(({ type, params }) => ({
          id: item.id,
          type,
          params: params || {}
        }));
      }

      return [{ id: item.id, type: item.id, params: item.params || {} }];
    });

    return normalized;
  }

  _handleEvent(actionType, params, data) {
    const payload = { ...params, ...data };
    const actionHandlers = this._getActionHandlers();

    if (actionHandlers[actionType]) {
      actionHandlers[actionType](this, payload);
    }
  }

  _initEventListeners() {
    if (world.isClient) {
      let receivers = this._normalizeReceivers(this.props.dialogControllerEventReceivers);

      receivers.forEach(({ id, type, params = {} }) => {
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      });

      if (this.props.dialogControllerAcceptAnyEmitter) {
        this.world.on(this.props.appID, (data) => {
          if (world.isServer) {
            this.app.send('dialog-server-to-client', { ...data, appID: this.props.appID });
          } else {
            this._handleEvent('next-dialog', {}, data);
          }
        });

        this.app.on('dialog-server-to-client', (data) => {
          this._handleEvent('next-dialog', {}, data);
        });
      }
    }
  }
}

/* istanbul ignore if */
if (typeof module === 'undefined') {
  try {
    mainLogger = createDebugLogger(app.instanceId);
    mainLogger('info', `Starting ${app.instanceId} app initialization`);

    initAppConfig(DialogController.getConfig());

    const node = findNodeByName(props.targetNodeName);

    initializeNodeVisibility(node);

    new DialogController({ app, node, props, world });
    
    mainLogger('info', `${app.instanceId} app initialized successfully`);
  } catch (error) {
    mainLogger('error', `${app.instanceId} app initialization failed: ${error.message}`);
    mainLogger('error', `Stack trace: ${error.stack}`);
  }
} else {
  if (typeof global !== 'undefined' && global.rigidbody !== undefined) {
    rigidbody = global.rigidbody;
  }

  module.exports = {
    getRigidbody,
    setRigidbody,
    DialogController
  };
}