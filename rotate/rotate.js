let rigidbody = null;

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
        hint: 'Enable detailed logging to help troubleshoot rotation issues'
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

/* istanbul ignore next */
function executeWithAnimationDelay({ emitterTimestamp, delay, callback }) {
  const currentTime = Date.now();
  const networkLatency = currentTime - emitterTimestamp;
  const delayInMilliseconds = delay * 1000;
  const totalDelay = networkLatency + delayInMilliseconds;

  setTimeout(callback, totalDelay);
}

/**
 * Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Normalizes an angle to be between 0 and 2π
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle in radians
 */
function normalizeAngle(angle) {
  return angle % (2 * Math.PI);
}

/**
 * RotateController handles smooth 3D object rotation animations
 * with configurable speed, delays, and event-driven control
 */
class RotateController {
  static EVENTS = {
    SET_STATE: 'set-state',
    ROTATION_START: 'rotation-start',
    ROTATION_STOP: 'rotation-stop',
  };

  /* istanbul ignore next */
  static getConfig() {
    return [
      {
        type: 'section',
        key: 'rotateSection',
        label: 'Animation Settings'
      },
      {
        key: 'rotateControllerEnableSync',
        label: 'Sync Changes',
        type: 'toggle',
        initial: false,
        hint: 'When enabled, rotation changes will be synchronized across all connected clients'
      },
      {
        key: 'rotateControllerEnableDelay',
        label: 'Use Delay',
        type: 'toggle',
        initial: false,
        hint: 'Enable delay before starting rotations. Useful for creating smooth transitions or timed effects'
      },
      {
        key: 'rotateControllerTransitionDelay',
        label: 'Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.rotateControllerEnableDelay,
        hint: 'Time to wait before starting rotations. Range: 0.1 to 60 seconds'
      },
      {
        key: 'rotateControllerIsRotationEnabled',
        label: 'Enable Rotation',
        type: 'toggle',
        initial: true,
        hint: 'Enable rotation animations'
      },
      {
        key: 'rotateControllerRotationDelay',
        label: 'Rotation Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.rotateControllerIsRotationEnabled,
        hint: 'Delay before starting rotation animation'
      },
      {
        key: 'rotateControllerRotationSpeed',
        label: 'Rotation Speed (radians/frame)',
        type: 'number',
        min: 0,
        max: 0.1,
        step: 0.001,
        initial: 0.01,
        dp: 3,
        hidden: !props.rotateControllerIsRotationEnabled,
        hint: 'Speed of rotation animation in radians per frame'
      },
      {
        key: 'rotateControllerRotationX',
        label: 'X Rotation (degrees)',
        type: 'number',
        min: -3600,
        max: 3600,
        step: 1,
        initial: 0,
        hidden: !props.rotateControllerIsRotationEnabled,
        hint: 'Target X rotation in degrees'
      },
      {
        key: 'rotateControllerRotationY',
        label: 'Y Rotation (degrees)',
        type: 'number',
        min: -3600,
        max: 3600,
        step: 1,
        initial: 0,
        hidden: !props.rotateControllerIsRotationEnabled,
        hint: 'Target Y rotation in degrees'
      },
      {
        key: 'rotateControllerRotationZ',
        label: 'Z Rotation (degrees)',
        type: 'number',
        min: -3600,
        max: 3600,
        step: 1,
        initial: 0,
        hidden: !props.rotateControllerIsRotationEnabled,
        hint: 'Target Z rotation in degrees'
      },
      {
        key: 'rotateControllerAcceptAnyEmitter',
        label: 'Accept Any Event',
        type: 'toggle',
        initial: false,
        hint: 'Allow to receive events from any emitter that emit to the appID directly. Useful for unknown or generative apps'
      },
      {
        key: 'rotateControllerEventReceivers',
        label: 'Event Listeners',
        type: 'textarea',
        initial: '[]',
        hint: 'JSON array of event configurations. Each item should have an "id" (appID) and "actions" array with "type" and "params". Example: [{"id":"<appID>","actions":[{"type":"set-rotation","params":{"rotationY":90,"rotationSpeed":0.02,"delay":0}}]}]. Replace <appID> with your app ID. Available actions: start-rotation, stop-rotation, set-state, set-rotation.'
      },
    ];
  }

  /**
   * Creates a new RotateController instance
   * @param {Object} params - Configuration parameters
   * @param {Object} params.app - Hyperfy app instance
   * @param {Object} params.node - 3D node to animate
   * @param {Object} params.props - Component properties
   * @param {Object} params.world - Hyperfy world instance
   */
  constructor({ app, node, props, world }) {
    this.app = app;
    this.node = node;
    this.props = props;
    this.world = world;
    this.log = createDebugLogger(`${this.props.appID} - RotateController`);

    this.isAnimating = false;
    this.isRotationAnimating = false;
    this.isContinuousRotation = false;
    this.dynamicParams = {};
    this.rigidbodyOffset = { x: 0, y: 0, z: 0 };
    
    this.initialRotation = {
      x: this.node.rotation.x,
      y: this.node.rotation.y,
      z: this.node.rotation.z
    };

    this.log('info', 'RotateController instance created');
    
    this._calculateRigidbodyOffset();
    
    this._initEventListeners();
    this._initAnimationLoop();
  }

  _getActionHandlers() {
    return {
      'set-rotation': (ctx, payload) => ctx._onSetRotation(payload),
      'pause-rotation': (ctx, payload) => ctx._onPauseRotation(payload),
      'resume-rotation': (ctx, payload) => ctx._onResumeRotation(payload),
      'reset-rotation': (ctx, payload) => ctx._onResetRotation(payload),
      'continuous-rotation': (ctx, payload) => ctx._onContinuousRotation(payload),
      'stop-continuous-rotation': (ctx, payload) => ctx._onStopContinuousRotation(payload),
    };
  }

  _onStartRotation(payload) {
    const delay = payload.delay !== undefined ? payload.delay : this.props.rotateControllerTransitionDelay;
    const shouldApplyDelay = this.props.rotateControllerEnableDelay && delay > 0;

    this.log('info', `Rotation start requested with delay: ${delay}s`);

    if (shouldApplyDelay) {
      this.log('info', `Applying delay of ${delay} seconds before starting rotation`);
      setTimeout(() => {
        this._executeStartRotation(payload);
      }, delay * 1000);
    } else {
      this._executeStartRotation(payload);
    }
  }

  _executeStartRotation(payload) {
    this.isAnimating = true;
    
    if (this.props.rotateControllerIsRotationEnabled) {
      this._startRotationWithDelay(payload.timestamp || Date.now());
    }

    this.log('info', 'Rotation animation started successfully');
  }

  _startRotationWithDelay(emitterTimestamp) {
    executeWithAnimationDelay({
      emitterTimestamp,
      delay: this.props.rotateControllerRotationDelay, 
      callback: () => { 
        this.isRotationAnimating = true;
        this.log('info', 'Rotation animation started');
      }
    });
  }

  /**
   * Starts continuous rotation on specified axes
   * @param {Object} payload - Continuous rotation parameters
   * @param {number} [payload.continuousSpeedX] - Continuous speed for X axis (radians/frame)
   * @param {number} [payload.continuousSpeedY] - Continuous speed for Y axis (radians/frame)
   * @param {number} [payload.continuousSpeedZ] - Continuous speed for Z axis (radians/frame)
   * @param {number} [payload.delay] - Delay before starting continuous rotation
   */
  _onContinuousRotation(payload) {
    const delay = payload.delay !== undefined ? payload.delay : 0;
    const shouldApplyDelay = this.props.rotateControllerEnableDelay && delay > 0;

    this.log('info', `Continuous rotation requested with delay: ${delay}s`);

    if (shouldApplyDelay) {
      this.log('info', `Applying delay of ${delay} seconds before starting continuous rotation`);
      setTimeout(() => {
        this._executeContinuousRotation(payload);
      }, delay * 1000);
    } else {
      this._executeContinuousRotation(payload);
    }
  }

  _executeContinuousRotation(payload) {
    this.isAnimating = true;
    this.isContinuousRotation = true;
    this.isRotationAnimating = false; // Disable target-based rotation

    // Set continuous rotation speeds
    if (payload.continuousSpeedX !== undefined) {
      this.dynamicParams.continuousSpeedX = payload.continuousSpeedX;
      this.log('info', `Continuous X rotation speed set to: ${payload.continuousSpeedX} rad/frame`);
    }
    if (payload.continuousSpeedY !== undefined) {
      this.dynamicParams.continuousSpeedY = payload.continuousSpeedY;
      this.log('info', `Continuous Y rotation speed set to: ${payload.continuousSpeedY} rad/frame`);
    }
    if (payload.continuousSpeedZ !== undefined) {
      this.dynamicParams.continuousSpeedZ = payload.continuousSpeedZ;
      this.log('info', `Continuous Z rotation speed set to: ${payload.continuousSpeedZ} rad/frame`);
    }

    this.log('info', 'Continuous rotation started successfully');
  }

  /**
   * Stops continuous rotation
   * @param {Object} payload - Stop parameters
   */
  _onStopContinuousRotation(payload) {
    this.isContinuousRotation = false;
    this.isAnimating = false;
    this.isRotationAnimating = false;
    
    // Clear continuous rotation speeds
    delete this.dynamicParams.continuousSpeedX;
    delete this.dynamicParams.continuousSpeedY;
    delete this.dynamicParams.continuousSpeedZ;
    
    this.log('info', 'Continuous rotation stopped');
  }

  _onStopRotation(payload) {
    this.isAnimating = false;
    this.isRotationAnimating = false;
    this.isContinuousRotation = false;
    
    // Clear continuous rotation speeds
    delete this.dynamicParams.continuousSpeedX;
    delete this.dynamicParams.continuousSpeedY;
    delete this.dynamicParams.continuousSpeedZ;
    
    this.log('info', 'Rotation animation stopped');
  }

  _onSetState(payload) {
    this.isAnimating = payload.isAnimating ?? this.isAnimating;
    
    if (payload.isAnimating) {
      this._onStartRotation(payload);
    } else {
      this._onStopRotation(payload);
    }
  }

  /**
   * Handles set-rotation action with dynamic parameters
   * @param {Object} payload - Rotation parameters
   * @param {number} [payload.rotationX] - Target X rotation in degrees
   * @param {number} [payload.rotationY] - Target Y rotation in degrees
   * @param {number} [payload.rotationZ] - Target Z rotation in degrees
   * @param {number} [payload.rotationSpeed] - Animation speed in radians/frame
   */
  _onSetRotation(payload) {
    if (payload.rotationX !== undefined) {
      this.dynamicParams.rotationX = payload.rotationX;
      this.log('info', `Dynamic X rotation set to: ${payload.rotationX}°`);
    }
    if (payload.rotationY !== undefined) {
      this.dynamicParams.rotationY = payload.rotationY;
      this.log('info', `Dynamic Y rotation set to: ${payload.rotationY}°`);
    }
    if (payload.rotationZ !== undefined) {
      this.dynamicParams.rotationZ = payload.rotationZ;
      this.log('info', `Dynamic Z rotation set to: ${payload.rotationZ}°`);
    }
    if (payload.rotationSpeed !== undefined) {
      this.dynamicParams.rotationSpeed = payload.rotationSpeed;
      this.log('info', `Dynamic rotation speed set to: ${payload.rotationSpeed}`);
    }

    this._onStartRotation(payload);
  }

  _onPauseRotation(payload) {
    this.isRotationAnimating = false;
    this.log('info', 'Rotation animation paused');
  }

  _onResumeRotation(payload) {
    if (this.isAnimating) {
      this.isRotationAnimating = true;
      this.log('info', 'Rotation animation resumed');
    } else {
      this.log('warn', 'Cannot resume rotation: animation not started');
    }
  }

  /**
   * Resets rotation to initial rotation with fast animation
   * @param {Object} payload - Reset parameters
   * @param {number} [payload.resetSpeed=0.05] - Speed for reset animation
   */
  _onResetRotation(payload) {
    const resetSpeed = payload.resetSpeed || 0.05;
    
    this.dynamicParams.rotationX = degreesToRadians(this.initialRotation.x);
    this.dynamicParams.rotationY = degreesToRadians(this.initialRotation.y);
    this.dynamicParams.rotationZ = degreesToRadians(this.initialRotation.z);
    this.dynamicParams.rotationSpeed = resetSpeed;
    
    this.isAnimating = true;
    this.isRotationAnimating = true;
    
    this.log('info', `Rotation reset started to initial rotation (${this.initialRotation.x}, ${this.initialRotation.y}, ${this.initialRotation.z}) with speed: ${resetSpeed}`);
  }

  _initAnimationLoop() {
    this.app.on('update', () => {
      if (this.isAnimating) {
        if (this.props.rotateControllerIsRotationEnabled) {
          if (rigidbody) {
            this._executeRotation(rigidbody, this.dynamicParams, 'rigidbody');
          }
          this._executeRotation(this.node, this.dynamicParams, 'node');
        }
      }
    });
  }

  _normalizeReceivers(receiver) {
    let receiverArray = receiver;

    if (typeof receiverArray === 'string') {
      if (receiverArray.trim().startsWith('[') || receiverArray.trim().startsWith('{')) {
        try {
          receiverArray = JSON.parse(receiverArray);
          this.log('debug', 'Parsed receiver string to JSON');
        } catch (error) {
          this.log('warn', 'Failed to parse JSON string, using empty array');
          receiverArray = [];
        }
      } else {
        this.log('warn', 'String is not JSON, using empty array');
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

    if (world.isClient) {
      let receivers = this._normalizeReceivers(this.props.rotateControllerEventReceivers);

      receivers.forEach(({ id, type, params = {} }) => {
        this.log('info', `Setting up receiver for event id: ${id}`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      });

      if (this.props.rotateControllerAcceptAnyEmitter) {
        this.world.on(this.props.appID, (data) => {
          if (world.isServer) {
            this.app.send('rotate-server-to-client', { ...data, appID: this.props.appID });
          } else {
            this._handleEvent('start-rotation', {}, data);
          }
        });

        this.app.on('rotate-server-to-client', (data) => {
          this._handleEvent('set-rotation', {}, data);
        });
      }

    }

    this.log('info', 'Event listeners initialized successfully');
  }

  _calculateRigidbodyOffset() {
    if (rigidbody && this.props.enableCollision) {
      this.rigidbodyOffset.x = rigidbody.position.x - this.node.position.x;
      this.rigidbodyOffset.y = rigidbody.position.y - this.node.position.y;
      this.rigidbodyOffset.z = rigidbody.position.z - this.node.position.z;
      
      this.log('info', `Calculated rigidbody offset: X=${this.rigidbodyOffset.x.toFixed(2)}, Y=${this.rigidbodyOffset.y.toFixed(2)}, Z=${this.rigidbodyOffset.z.toFixed(2)}`);
    } else {
      this.log('info', 'No rigidbody found or collision disabled, offset set to zero');
    }
  }

  _applySingleAxisRotation(targetObject, rotationAxis, currentRotation, targetRotation, rotationStep, element) {
    if (rotationStep === 0) {
      if (targetObject.rotation[rotationAxis] !== targetRotation) {
        targetObject.rotation[rotationAxis] = targetRotation;
        this.log('debug', `${element} Setting ${rotationAxis.toUpperCase()} rotation directly to: ${targetRotation.toFixed(2)} rad`);
      }
    } else {
      if (Math.abs(targetRotation - currentRotation) > 0.01) {
        let delta = targetRotation - currentRotation;
        if (Math.abs(delta) > Math.PI) {
          delta = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI;
        }

        const rotationChange = Math.sign(delta) * Math.min(rotationStep, Math.abs(delta));
        targetObject.rotation[rotationAxis] += rotationChange;
        this.log('debug', `${element} Rotating ${rotationAxis.toUpperCase()}: ${targetObject.rotation[rotationAxis].toFixed(2)} rad towards ${targetRotation.toFixed(2)} rad`);
      }
    }
  }

  /**
   * Executes rotation animation on target object
   * @param {Object} targetObject - Object to animate (node or rigidbody)
   * @param {Object} dynamicParams - Dynamic rotation parameters
   * @param {string} element - Element type ('node' or 'rigidbody')
   */
  _executeRotation(targetObject, dynamicParams = {}, element) {
    if (this.isContinuousRotation) {
      // Handle continuous rotation
      this._executeContinuousRotationStep(targetObject, dynamicParams, element);
    } else if (this.isRotationAnimating) {
      // Handle target-based rotation
      const targetRotationX = dynamicParams.rotationX !== undefined ? degreesToRadians(dynamicParams.rotationX) : degreesToRadians(this.props.rotateControllerRotationX || 0);
      const targetRotationY = dynamicParams.rotationY !== undefined ? degreesToRadians(dynamicParams.rotationY) : degreesToRadians(this.props.rotateControllerRotationY || 0);
      const targetRotationZ = dynamicParams.rotationZ !== undefined ? degreesToRadians(dynamicParams.rotationZ) : degreesToRadians(this.props.rotateControllerRotationZ || 0);

      const currentRotationX = normalizeAngle(targetObject.rotation.x);
      const currentRotationY = normalizeAngle(targetObject.rotation.y);
      const currentRotationZ = normalizeAngle(targetObject.rotation.z);

      const rotationStepSize = dynamicParams.rotationSpeed !== undefined ? dynamicParams.rotationSpeed : this.props.rotateControllerRotationSpeed;

      const hasXTarget = this.props.rotateControllerRotationX !== 0 || dynamicParams.rotationX !== undefined;
      const hasYTarget = this.props.rotateControllerRotationY !== 0 || dynamicParams.rotationY !== undefined;
      const hasZTarget = this.props.rotateControllerRotationZ !== 0 || dynamicParams.rotationZ !== undefined;

      if (hasXTarget) {
        this._applySingleAxisRotation(targetObject, 'x', currentRotationX, targetRotationX, rotationStepSize, element);
      }

      if (hasYTarget) {
        this._applySingleAxisRotation(targetObject, 'y', currentRotationY, targetRotationY, rotationStepSize, element);
      }

      if (hasZTarget) {
        this._applySingleAxisRotation(targetObject, 'z', currentRotationZ, targetRotationZ, rotationStepSize, element);
      }
    }
  }

  /**
   * Executes continuous rotation step
   * @param {Object} targetObject - Object to rotate
   * @param {Object} dynamicParams - Dynamic rotation parameters
   * @param {string} element - Element type ('node' or 'rigidbody')
   */
  _executeContinuousRotationStep(targetObject, dynamicParams = {}, element) {
    const continuousSpeedX = dynamicParams.continuousSpeedX || 0;
    const continuousSpeedY = dynamicParams.continuousSpeedY || 0;
    const continuousSpeedZ = dynamicParams.continuousSpeedZ || 0;

    if (continuousSpeedX !== 0) {
      targetObject.rotation.x += continuousSpeedX;
      this.log('debug', `${element} Continuous X rotation: ${targetObject.rotation.x.toFixed(2)} rad`);
    }

    if (continuousSpeedY !== 0) {
      targetObject.rotation.y += continuousSpeedY;
      this.log('debug', `${element} Continuous Y rotation: ${targetObject.rotation.y.toFixed(2)} rad`);
    }

    if (continuousSpeedZ !== 0) {
      targetObject.rotation.z += continuousSpeedZ;
      this.log('debug', `${element} Continuous Z rotation: ${targetObject.rotation.z.toFixed(2)} rad`);
    }
  }
}

/* istanbul ignore if */
if (typeof module === 'undefined') {
  try {
    mainLogger('info', `Starting ${app.instanceId} app initialization`);

    initAppConfig(RotateController.getConfig());

    const node = findNodeByName(props.targetNodeName);

    initializeNodeVisibility(node);

    new RotateController({ app, node, props, world });

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
    RotateController
  };
}
