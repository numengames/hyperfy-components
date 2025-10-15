let rigidbody = null;

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
      throw new Error(`Node ${nodeName} not found in scene`);
    }

    mainLogger('info', `Found node: ${nodeName}`);
    return node;
  }
}

/**
 * Sets up collision detection for the model by creating rigidbody and colliders
 */
/* istanbul ignore next */
function setupCollision() {
  if (rigidbody) {
    rigidbody.active = true;
    mainLogger('info', 'Rigidbody already exists. Making it active again');
  } else {
    mainLogger('info', 'Setting mesh & collider to the model');

    const transformMatrix = new Matrix4();
    const appInverseMatrix = app.matrixWorld.clone().invert();
    rigidbody = app.create('rigidbody');

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
        rigidbody.add(collider);
        colliderCount++;
      }
    });

    rigidbody.position.copy(app.position);
    rigidbody.quaternion.copy(app.quaternion);
    rigidbody.scale.copy(app.scale);

    world.add(rigidbody);
    mainLogger('info', `Collision setup complete with ${colliderCount} colliders`);
  }
}

/**
 * Initializes the node's collision state based on configuration
 * @param {Object} node - The 3D node to configure
 */
/* istanbul ignore next */
function initializeNodeVisibility(node) {
  if (world.isClient) {
    mainLogger('info', `Setting collision: ${props.enableCollision}`);

    if (props.enableCollision) {
      setupCollision();
    }
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
        hint: 'The name of the 3D node in your scene that will act as the teleport destination'
      },
      {
        key: 'enableDebugMode',
        label: 'Debug Mode',
        type: 'toggle',
        initial: false,
        hint: 'Enable detailed logging to help troubleshoot teleport issues'
      },
      {
        key: 'enableCollision',
        type: 'toggle',
        label: 'Add Collision',
        initial: true,
        hint: 'Forces all meshes to have collision. Disable this if your model already has embedded collision.'
      }
    ];

    props.appID = app.instanceId;

    app.configure([...baseConfig, ...configs.flat()]);
    mainLogger('info', 'Application configuration initialized');
  }
}

class TeleportController {
  /* istanbul ignore next */
  static getConfig() {
    return [
      {
        type: 'section',
        key: 'teleportSection',
        label: 'Teleport Settings'
      },
      {
        key: 'teleportControllerAcceptAnyEmitter',
        label: 'Accept Any Event',
        type: 'toggle',
        initial: false,
        hint: 'Allow to receive events from any emitter that emit to the appID directly'
      },
      {
        key: 'teleportControllerEventReceivers',
        label: 'Event Listeners',
        type: 'textarea',
        initial: '[]',
        hint: 'JSON array of event configurations. Example: [{"id":"eventName-<appID>","actions":[{"type":"teleport","params":{}}]}]'
      },
    ];
  }

  static EVENTS = {
    TELEPORT_COMPLETE: 'teleport-complete',
    TELEPORT_SERVER_TO_CLIENT: 'teleport-sc',
  };

  constructor({ app, node, props, world }) {
    this.app = app;
    this.node = node;
    this.props = props;
    this.world = world;
    this.log = createDebugLogger(`${this.props.appID} - TeleportController`);

    this.log('info', 'TeleportController instance created');
    
    this._initEventListeners();
  }

  _getActionHandlers() {
    return {
      'teleport': (ctx, payload) => ctx._onTeleportEvent(payload)
    };
  }

  _onTeleportEvent(params = {}) {
    if (!params.playerId) {
      this.log('warn', 'Teleport canceled: missing playerId in event data');
      return;
    }

    this._executeTeleport(params.playerId);
  }

  _executeTeleport(playerId) {
    const portalWorldPosition = this.node.matrixWorld.toArray();

    const destination = new Vector3(
      portalWorldPosition[12] || 0,
      portalWorldPosition[13] || 0,
      portalWorldPosition[14] || 0,
    );

    this.log('info', `Teleporting player ${playerId} to: (${destination.x}, ${destination.y}, ${destination.z})`);
    
    const player = this.world.getPlayer(playerId);
    
    if (!player) {
      this.log('warn', `Teleport canceled: player with id ${playerId} not found`);
      return;
    }
    
    player.teleport(destination);

    const completionData = {
      playerId,
      destination: { x: destination.x, y: destination.y, z: destination.z },
      timestamp: Date.now(),
    };
    
    this.app.emit(`${TeleportController.EVENTS.TELEPORT_COMPLETE}-${this.props.appID}`, completionData);
    this.log('info', `Teleport completed for player ${playerId}`);
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
    
    let receivers = this._normalizeReceivers(this.props.teleportControllerEventReceivers);
    
    receivers.forEach(({ id, type, params = {} }) => {
      if (this.world.isServer && params.isServer) {
        this.log('info', `Setting up receiver for event id: ${id} in server`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      } else if (this.world.isClient) {
        this.log('info', `Setting up receiver for event id: ${id}`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      }
    });

    if (this.props.teleportControllerAcceptAnyEmitter) {
      this.world.on(this.props.appID, (data) => {
        if (this.world.isServer) {
          this.log('info', 'Server received teleport request, broadcasting to clients');
          this.app.send(TeleportController.EVENTS.TELEPORT_SERVER_TO_CLIENT, data);
        } else {
          this._handleEvent('teleport', {}, data);
        }
      });
    }

    if (this.world.isClient) {
      this.app.on(TeleportController.EVENTS.TELEPORT_SERVER_TO_CLIENT, (data) => {
        this.log('info', 'Client received teleport request from server');
        this._handleEvent('teleport', {}, data);
      });
    }
    
    this.log('info', 'Event listeners initialized successfully');
  }
}

/* istanbul ignore if */
if (typeof module === 'undefined') {
  try {
    mainLogger('info', `Starting ${app.instanceId} app initialization`);

    initAppConfig(TeleportController.getConfig());

    const node = findNodeByName(props.targetNodeName);

    initializeNodeVisibility(node);

    new TeleportController({ app, node, props, world });
    
    mainLogger('info', `${app.instanceId} app initialized successfully`);
  } catch (error) {
    mainLogger('error', `${app.instanceId} app initialization failed: ${error.message}`);
    mainLogger('error', `Stack trace: ${error.stack}`);
  }
} else {
  module.exports = {
    TeleportController
  };
}