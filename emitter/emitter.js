let rigidbody = null;

function getRigidbody() {
  return rigidbody;
}

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
const mainLogger = createDebugLogger(app.instanceId);

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
        hint: 'Enable detailed logging to help troubleshoot visibility and collision issues'
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

class EmitterController {
  static TRIGGER_MODE = {
    KEY: 'key',
    AUTO: 'auto',
  }

  static EVENTS = {
    SET_STATE: 'set-state',
    ENTER_PROXIMITY_ZONE: 'enter-proximity-zone',
    LEAVE_PROXIMITY_ZONE: 'leave-proximity-zone',
  };

  /* istanbul ignore next */
  static getConfig() {
    return[
      {
        type: 'section',
        key: 'emitterSection',
        label: 'Emitter Settings'
      },
      {
        key: 'emitterControllerHasCooldown',
        label: 'Has Cooldown?',
        type: 'toggle',
        initial: false,
        hint: 'Enable cooldown system to prevent rapid-fire triggering'
      },
      {
        key: 'emitterControllerCooldown',
        label: 'Cooldown (seconds)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.emitterControllerHasCooldown,
        hint: 'Time in seconds before the emitter can be triggered again'
      },
      {
        key: 'emitterControllerEventLabel',
        label: 'Event Label',
        type: 'text',
        hint: 'Text displayed on the UI and action button'
      },
      {
        key: 'emitterControllerInteractionType',
        type: 'switch',
        label: 'Interaction Type',
        options: [
          { value: EmitterController.TRIGGER_MODE.KEY, label: EmitterController.TRIGGER_MODE.KEY },
          { value: EmitterController.TRIGGER_MODE.AUTO, label: EmitterController.TRIGGER_MODE.AUTO }
        ],
        initial: EmitterController.TRIGGER_MODE.KEY,
        hint: 'KEY: Manual interaction with action button | AUTO: Automatic trigger by proximity'
      },
      {
        key: 'emitterControllerIsEnabled',
        label: 'Is Enabled?',
        type: 'toggle',
        initial: false,
        hint: 'If enabled, the emitter will be enabled and can be triggered'
      },
      {
        key: 'emitterControllerIsSingleUse',
        label: 'Single Use?',
        type: 'toggle',
        initial: false,
        hint: 'If enabled, the emitter can only be triggered once and then becomes inactive'
      },
      {
        key: 'emitterControllerTriggerDistance',
        label: 'Trigger Distance',
        type: 'number',
        min: 0,
        max: 10,
        step: 0.1,
        initial: 2,
        dp: 1,
        hint: 'Distance in units where the action will be triggered (for both KEY and AUTO modes)'
      },
      {
        key: 'emitterControllerProximityDistance',
        label: 'Proximity Distance',
        type: 'number',
        min: 0,
        max: 15,
        step: 0.5,
        initial: 3,
        dp: 1,
        hidden: props.emitterControllerInteractionType === EmitterController.TRIGGER_MODE.KEY,
        hint: 'Distance in units where the UI will be displayed (AUTO mode only)'
      },
      {
        key: 'emitterControllerUIRadiusY',
        label: 'UI Display Radius Y',
        type: 'number',
        min: 0,
        max: 100,
        step: 0.5,
        initial: 1,
        dp: 1,
        hidden: props.emitterControllerInteractionType === EmitterController.TRIGGER_MODE.KEY,
        hint: 'Vertical offset for the UI display position (AUTO mode only)'
      },
      {
        key: 'emitterControllerEnableEnterEvent',
        label: 'Enable Enter Event',
        type: 'toggle',
        initial: false,
        hidden: props.emitterControllerInteractionType !== EmitterController.TRIGGER_MODE.AUTO,
        hint: 'Send ENTER proximity zone event when player enters the proximity area'
      },
      {
        key: 'emitterControllerEnableLeaveEvent',
        label: 'Enable Leave Event',
        type: 'toggle',
        initial: false,
        hidden: props.emitterControllerInteractionType !== EmitterController.TRIGGER_MODE.AUTO,
        hint: 'Send LEAVE proximity zone event when player exits the proximity area'
      },
      {
        key: 'emitterControllerAcceptAnyEmitter',
        label: 'Accept Any Event',
        type: 'toggle',
        initial: false,
        hint: 'Allow to receive events from any emitter that emit to the appID directly. Useful for unknown or generative apps'
      },
      {
        key: 'emitterControllerTransitionDelay',
        label: 'Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hint: 'Time to wait before triggering emitter actions. Range: 0.1 to 60 seconds'
      },
      {
        key: 'emitterControllerEventReceivers',
        label: 'Event Listeners',
        type: 'textarea',
        initial: '[]',
        hint: 'JSON array of event configurations. Each item should have an "id" (event name) and "actions" array with "type" and "params". Example: [{"id":"eventName-<appID>","actions":[{"type":"set-visibility","params":{"isVisible":true,"hasCollision":false,"delay":0}}]}]. Replace <appID> with your app ID.'
      },
    ];
  }

  constructor({ node, world, app, props }) {
    this.app = app;
    this.node = node;
    this.props = props;
    this.world = world;
    this.log = createDebugLogger(`${this.props.appID} - EmitterController`);

    this.isActive = null;
    this.cooldownTimer = 0;
    this.interactionUI = null;
    this.cooldownTimeout = null;
    this.manualTriggerNode = null;
    this.isCooldownActive = false;

    this._initEventListeners();

    if (world.isClient) {
      this._initInteraction();
    }

    this.log('info', 'EmitterController instance created');
  }

  _getActionHandlers() {
    return {
      [EmitterController.EVENTS.SET_STATE]: (ctx, payload) => ctx._onSetState(payload),
    };
  }

  _onSetState(payload) {
    this.isActive = payload.active ?? this.props.emitterControllerIsEnabled;

    const delay = payload.delay !== undefined ? payload.delay : 0;

    const updateUI = () => {
      if (this.interactionUI) {
        this.interactionUI.active = payload.active;
        this.interactionUI.label = payload.label ?? this.props.emitterControllerEventLabel;
      }

      if (this.manualTriggerNode) {
        this.manualTriggerNode.active = payload.active;
        this.manualTriggerNode.label = payload.label ?? this.props.emitterControllerEventLabel;
      }
    };

    if (delay > 0) {
      this.log('info', `Applying delay of ${delay} seconds before updating emitter state`);
      setTimeout(updateUI, delay * 1000);
    } else {
      updateUI();
    }
  }

  _initInteraction() {
    if (this.props.emitterControllerInteractionType === EmitterController.TRIGGER_MODE.KEY) {
      this._addKeyPressAction();
      this.log('info', 'Key-based emitter initialized');
    } else {
      this._setupUI();
      this._setupProximityDetection();
      this._setupTriggerZones();
      this.log('info', 'Automatic emitter initialized');
    }
  }

  _setupUI() {
    this.interactionUI = this.app.create('ui', {
      width: 200,
      height: 30,
      borderRadius: 14,
      billboard: 'full',
      backgroundColor: 'rgb(0, 0, 0)',
    });

    this.interactionUI.position.set(
      this.node.position.x,
      this.props.emitterControllerUIRadiusY,
      this.node.position.z
    );

    const statusView = this.app.create('uiview', {
      width: 200,
      height: 30,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    this.interactionUI.add(statusView);

    const statusText = this.app.create('uitext', {
      padding: 4,
      fontSize: 15,
      color: 'rgb(255, 255, 255)',
      value: this.props.emitterControllerEventLabel || 'default label',
    });

    statusView.add(statusText);

    this.node.add(this.interactionUI);
    this.log('info', 'UI system initialized');
  }

  _setupProximityDetection() {
    const proximityZoneRigidbody = this.app.create('rigidbody');
    const uiCollider = this.app.create('collider', {
      trigger: true,
      type: 'sphere',
      radius: this.props.emitterControllerProximityDistance,
    });

    proximityZoneRigidbody.add(uiCollider);

    const playerId = this.world.getPlayer().id;

    proximityZoneRigidbody.onTriggerEnter = () => {
      this.interactionUI.active = true;

      if (this.props.emitterControllerEnableEnterEvent) {
        this.app.emit(`${EmitterController.EVENTS.ENTER_PROXIMITY_ZONE}-${this.props.appID}`, { playerId, timestamp: Date.now() });
        this.log('info', 'Proximity event emitted: ENTER_PROXIMITY_ZONE');
      }

      this.log('info', 'Proximity UI displayed - player in exclusive zone');
    }

    proximityZoneRigidbody.onTriggerLeave = () => {
      this.interactionUI.active = false;

      if (this.props.emitterControllerEnableLeaveEvent) {
        this.app.emit(`${EmitterController.EVENTS.LEAVE_PROXIMITY_ZONE}-${this.props.appID}`, { playerId, timestamp: Date.now() });
        this.log('info', 'Proximity event emitted: LEAVE_PROXIMITY_ZONE');
      }

      this.log('info', 'Proximity UI hidden - player left exclusive zone');
    }

    this.node.add(proximityZoneRigidbody);
    const enterEnabled = this.props.emitterControllerEnableEnterEvent ? 'ENTER enabled' : 'ENTER disabled';
    const leaveEnabled = this.props.emitterControllerEnableLeaveEvent ? 'LEAVE enabled' : 'LEAVE disabled';
    this.log('info', `Proximity zone rigidbody added - ${enterEnabled}, ${leaveEnabled}`);
  }

  _setupTriggerZones() {
    const actionCollider = this.app.create('collider', {
      trigger: true,
      type: 'sphere',
      radius: this.props.emitterControllerTriggerDistance,
    });

    const currentRigidbody = getRigidbody();
    currentRigidbody.add(actionCollider);
    this.log('info', `Trigger zone configured with radius: ${this.props.emitterControllerTriggerDistance}`);

    currentRigidbody.onTriggerEnter = (proximityData) => {
      this.log('info', `Player entered trigger zone: ${proximityData.playerId}`);
      const proximityTrigger = {
        playerId: proximityData.playerId,
        type: 'auto'
      };

      this._handleAction(proximityTrigger);
    };
  }

  _setupCooldown() {
    this.isCooldownActive = true;

    const startTime = Date.now();
    const endTime = startTime + (this.cooldownTimer * 1000);

    const updateCooldown = () => {
      if (!this.isCooldownActive) {
        return;
      }

      const currentTime = Date.now();
      const remainingTime = (endTime - currentTime) / 1000;

      if (remainingTime > 0) {
        this.cooldownTimer = remainingTime;
        this.log('info', `Cooldown: ${this.cooldownTimer.toFixed(2)}s`);

        if (this.isCooldownActive) {
          this.cooldownTimeout = setTimeout(updateCooldown, 100);
        }
      } else {
        this._resetCooldown();
      }
    };

    this.cooldownTimeout = setTimeout(updateCooldown, 100);
    this.log('info', 'Cooldown system initialized with setTimeout');
  }

  _resetCooldown() {
    this.cooldownTimer = 0;
    this.cooldownTimeout = null;
    this.isCooldownActive = false;

    if (!this.props.emitterControllerIsSingleUse) {
      if (this.props.emitterControllerInteractionType === EmitterController.TRIGGER_MODE.KEY) {
        if (this.manualTriggerNode) {
          this.manualTriggerNode.active = true;
        }
      } else {
        this.interactionUI.active = true;
      }
    }
    this.log('info', 'Cooldown reset completed');
  }

  _emitSignal(playerId) {
    const signalData = {
      playerId,
      timestamp: Date.now(),
    };

    this.app.emit(this.props.appID, signalData);
    this.log('info', `Signal '${this.props.appID}' emitted successfully`);
  }

  _handleAction(trigger) {
    const isKeyMode = this.props.emitterControllerInteractionType === EmitterController.TRIGGER_MODE.KEY;
    const isActive = isKeyMode ? this.manualTriggerNode.active : this.interactionUI.active;

    if (!isActive) {
      this.log('info', `Emitter not ready. Cooldown: ${this.cooldownTimer.toFixed(2)}s`);
      return;
    }

    const delay = trigger.delay !== undefined ? trigger.delay : this.props.emitterControllerTransitionDelay;

    if (delay > 0) {
      this.log('info', `Applying delay of ${delay} seconds before emitter action`);
      this._deactivateTrigger(isKeyMode);
      
      setTimeout(() => {
        this._executeEmitterAction(trigger, isKeyMode);
      }, delay * 1000);
    } else {
      this._executeEmitterAction(trigger, isKeyMode);
    }
  }

  _executeEmitterAction(trigger, isKeyMode) {
    this._emitSignal(trigger.playerId);
    this.log('info', `Player triggered emitter with ${this.props.emitterControllerInteractionType}`);

    if (this.props.emitterControllerIsSingleUse) {
      this._deactivateTrigger(isKeyMode);
      this.log('info', 'Single use emitter - permanently deactivated after first use');
    } else if (this.props.emitterControllerHasCooldown && this.props.emitterControllerHasCooldown > 0) {
      this._deactivateTrigger(isKeyMode);
      this.cooldownTimer = this.props.emitterControllerCooldown;
      this._setupCooldown();
      this.log('info', `Starting cooldown: ${this.cooldownTimer}s`);
    } else {
      this.isActive && this._activateTrigger(isKeyMode);
    }
  }

  _deactivateTrigger(isKeyMode) {
    if (isKeyMode) {
      this.manualTriggerNode.active = false;
    } else {
      this.interactionUI.active = false;
    }
    this.log('info', `Trigger ${isKeyMode ? 'manual' : 'auto'} deactivated`);
  }

  _activateTrigger(isKeyMode) {
    if (isKeyMode) {
      this.manualTriggerNode.active = true;
    } else {
      this.interactionUI.active = true;
    }
    this.log('info', `Trigger ${isKeyMode ? 'manual' : 'auto'} activated`);
  }

  _addKeyPressAction() {
    this.manualTriggerNode = this.app.create('action', {
      active: this.props.emitterControllerIsEnabled,
      onTrigger: this._handleAction.bind(this),
      distance: this.props.emitterControllerTriggerDistance || 2,
      label: this.props.emitterControllerEventLabel || 'Action Label',
    });

    this.app.add(this.manualTriggerNode);
    this.log('info', `Manual trigger configured with distance: ${this.props.emitterControllerTriggerDistance || 2}`);
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

    let receivers = this._normalizeReceivers(this.props.emitterControllerEventReceivers);

    receivers.forEach(({ id, type, params = {} }) => {
      if (this.world.isServer && params.isServer) {
        this.log('info', `Setting up receiver for event id: ${id} in server`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      } else if (this.world.isClient) {
        this.log('info', `Setting up receiver for event id: ${id}`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      }
    });

    if (this.props.emitterControllerAcceptAnyEmitter) {
      this.world.on(this.props.appID, (data) => this._handleEvent('set-state', {}, data));
    }
  }
}

/* istanbul ignore if */
if (typeof module === 'undefined') {
  try {
    mainLogger('info', `Starting ${app.instanceId} app initialization`);

    initAppConfig(EmitterController.getConfig());

    const node = findNodeByName(props.targetNodeName);

    initializeNodeVisibility(node);

    new EmitterController({ app, node, props, world });
    
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
    EmitterController
  };
}