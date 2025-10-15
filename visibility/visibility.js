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

class VisibilityController {
  /* istanbul ignore next */
  static getConfig() {
    return [
      {
        type: 'section',
        key: 'visibilitySection',
        label: 'Visibility Settings'
      },
      {
        key: 'visibilityControllerEnableSync',
        label: 'Sync Changes',
        type: 'toggle',
        initial: false,
        hint: 'When enabled, visibility changes will be synchronized across all connected clients'
      },
      {
        key: 'visibilityControllerDefaultVisible',
        label: 'Default Visible',
        type: 'toggle',
        initial: true,
        hint: 'Default visibility state used when events don\'t specify a visibility parameter'
      },
      {
        key: 'visibilityControllerDefaultCollision',
        label: 'Default Collision',
        type: 'toggle',
        initial: true,
        hint: 'Default collision state used when events don\'t specify a collision parameter'
      },
      {
        key: 'visibilityControllerEnableDelay',
        label: 'Use Delay',
        type: 'toggle',
        initial: false,
        hint: 'Enable delay before applying visibility changes. Useful for creating smooth transitions or timed effects'
      },
      {
        key: 'visibilityControllerTransitionDelay',
        label: 'Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.visibilityControllerEnableDelay,
        hint: 'Time to wait before applying visibility changes. Range: 0.1 to 60 seconds'
      },
      {
        key: 'visibilityControllerEmitOnVisible',
        label: 'Emit When Shown',
        type: 'toggle',
        initial: false,
        hint: 'Emit "visibility-enabled-<appID>" event when visible. Useful for chaining actions or UI feedback'
      },
      {
        key: 'visibilityControllerEmitOnHidden',
        label: 'Emit When Hidden',
        type: 'toggle',
        initial: false,
        hint: 'Emit "visibility-disabled-<appID>" event when invisible. Useful for chaining actions or UI feedback'
      },
      {
        key: 'visibilityControllerAcceptAnyEmitter',
        label: 'Accept Any Event',
        type: 'toggle',
        initial: false,
        hint: 'Allow to receive events from any emitter that emit to the appID directly. Useful for unknown or generative apps'
      },
      {
        key: 'visibilityControllerEventReceivers',
        label: 'Event Listeners',
        type: 'textarea',
        initial: '[]',
        hint: 'JSON array of event configurations. Each item should have an "id" (event name) and "actions" array with "type" and "params". Example: [{"id":"eventName-<appID>","actions":[{"type":"set-visibility","params":{"isVisible":true,"hasCollision":false,"delay":0}}]}]. Replace <appID> with your app ID.'
      },
    ];
  }

  static EVENTS = {
    VISIBILITY_ENABLED: 'visibility-enabled',
    VISIBILITY_DISABLED: 'visibility-disabled',
    VISIBILITY_SERVER_TO_CLIENT: 'visibility-sc',
    VISIBILITY_CLIENT_TO_SERVER: 'visibility-cs',
  };

  constructor({ app, node, props, world }) {
    this.app = app;
    this.node = node;
    this.props = props;
    this.world = world;
    this.log = createDebugLogger(`${this.props.appID} - VisibilityController`);

    this.log('info', 'VisibilityController instance created');
    
    this._initEventListeners();
  }

  _getActionHandlers() {
    return {
      'set-visibility': (ctx, payload) => ctx._onVisibilityEvent(payload)
    };
  }

  _changeClientVisibility(params) {
    this.app.send(VisibilityController.EVENTS.VISIBILITY_SERVER_TO_CLIENT, params);
    this.log('info', `Emitted ${VisibilityController.EVENTS.VISIBILITY_SERVER_TO_CLIENT} to clients`);
  }

  _onVisibilityEvent(params = {}) {
    const delay = params.delay !== undefined ? params.delay : this.props.visibilityControllerTransitionDelay;
    const isSync = params.isSync !== undefined ? params.isSync : this.props.visibilityControllerEnableSync;
    const isVisible = params.isVisible !== undefined ? params.isVisible : this.props.visibilityControllerDefaultVisible;
    const hasCollision = params.hasCollision !== undefined ? params.hasCollision : this.props.visibilityControllerDefaultCollision;
    
    this.log('info', `Visibility change requested: visible=${isVisible}, collision=${hasCollision}, sync=${isSync}, delay=${delay}`);
    this._processVisibilityChange({ isVisible, hasCollision, isSync, delay }, params);
  }

  _processVisibilityChange({ isVisible, hasCollision, isSync, delay }, params) {
    this.log('info', `Processing visibility change: visible=${isVisible}, collision=${hasCollision}, sync=${isSync}, delay=${delay}`);
    
    if (this.world.isServer) {
      this.log('info', 'Server processing visibility change');
      this._changeClientVisibility({ isVisible, hasCollision, isSync, delay, userId: params.userId });
    } else if (isSync || this.props.visibilityControllerEnableSync) {
      this.log('info', 'Client sending sync visibility change to server');
      this.app.send(VisibilityController.EVENTS.VISIBILITY_CLIENT_TO_SERVER, { isVisible, hasCollision, isSync, delay, userId: params.userId });
    } else {
      this.log('info', `Applying local visibility change: ${isVisible ? 'visible' : 'hidden'}`);
      this._applyVisibilityWithDelay({ isVisible, hasCollision, delay });
    }
  }

  _applyVisibilityWithDelay({ isVisible, hasCollision, delay }) {
    let delayToUse = delay !== undefined ? delay : this.props.visibilityControllerTransitionDelay;
    const shouldApplyDelay = this.props.visibilityControllerEnableDelay && delayToUse > 0;
    
    if (shouldApplyDelay) {
      this.log('info', `Applying delay of ${delayToUse} seconds before visibility change`);
      setTimeout(() => {
        this._applyVisibility({ isVisible, hasCollision });
      }, delayToUse * 1000);
    } else {
      this._applyVisibility({ isVisible, hasCollision });
    }
  }

  _applyVisibility({ isVisible, hasCollision }) {
    this.log('info', `Applying visibility: ${isVisible}, collision: ${hasCollision}`);
    
    this.node.visible = isVisible;
    
    if (hasCollision) {
      setupCollision();
    } else {
      this._clearCollision();
    }
    
    if (this.props.visibilityControllerEmitOnVisible && isVisible) {
      const completionData = {
        userId: this.world.getPlayer().userId,
        timestamp: Date.now(),
      };
      
      this.app.emit(`${VisibilityController.EVENTS.VISIBILITY_ENABLED}-${this.props.appID}`, completionData);
      this.log('info', `Emitted ${VisibilityController.EVENTS.VISIBILITY_ENABLED}-${this.props.appID} event`);
    } else if (this.props.visibilityControllerEmitOnHidden && !isVisible) {
      const completionData = {
        userId: this.world.getPlayer().userId,
        timestamp: Date.now(),
      };
      
      this.app.emit(`${VisibilityController.EVENTS.VISIBILITY_DISABLED}-${this.props.appID}`, completionData);
      this.log('info', `Emitted ${VisibilityController.EVENTS.VISIBILITY_DISABLED}-${this.props.appID} event`);
    }
  }

  _clearCollision() {
    const currentRigidbody = getRigidbody();
    if (currentRigidbody) {
      this.log('info', 'Removing collision from node');
      currentRigidbody.active = false;
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
    
    let receivers = this._normalizeReceivers(this.props.visibilityControllerEventReceivers);
    
    receivers.forEach(({ id, type, params = {} }) => {
      if (this.world.isServer && params.isServer) {
        this.log('info', `Setting up receiver for event id: ${id} in server`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      } else if (this.world.isClient) {
        this.log('info', `Setting up receiver for event id: ${id}`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      }
    });

    if (this.props.visibilityControllerAcceptAnyEmitter) {
      this.world.on(this.props.appID, (data) => this._handleEvent('set-visibility', {}, data));
    }

    if (this.world.isClient) {
      this.app.on(VisibilityController.EVENTS.VISIBILITY_SERVER_TO_CLIENT, ({ isVisible, hasCollision, isSync, delay, userId }) => {
        const shouldApply = this.props.visibilityControllerEnableSync || isSync || this.world.getPlayer().userId === userId;

        if (shouldApply) {
          this.log('info', `Received ${VisibilityController.EVENTS.VISIBILITY_SERVER_TO_CLIENT} → ${isVisible}`);
          this._applyVisibilityWithDelay({ isVisible, hasCollision, delay });
        } else {
          this.log('debug', `Ignoring ${VisibilityController.EVENTS.VISIBILITY_SERVER_TO_CLIENT} event (not applicable)`);
        }
      });
    }
    
    this.log('info', 'Event listeners initialized successfully');
  }
}

/* istanbul ignore if */
if (typeof module === 'undefined') {
  try {
    mainLogger('info', `Starting ${app.instanceId} app initialization`);

    initAppConfig(VisibilityController.getConfig());

    const node = findNodeByName(props.targetNodeName);

    initializeNodeVisibility(node);

    new VisibilityController({ app, node, props, world });
    
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
    VisibilityController
  };
}