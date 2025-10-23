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
        hint: 'Enable detailed logging to help troubleshoot animation issues'
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
 * TranslateController handles smooth 3D object translation animations
 * with configurable speed, delays, and event-driven control
 */
class TranslateController {
  static EVENTS = {
    SET_STATE: 'set-state',
    ANIMATION_START: 'animation-start',
    ANIMATION_STOP: 'animation-stop',
  };

  /* istanbul ignore next */
  static getConfig() {
    return [
      {
        type: 'section',
        key: 'translateSection',
        label: 'Animation Settings'
      },
      {
        key: 'translateControllerEnableSync',
        label: 'Sync Changes',
        type: 'toggle',
        initial: false,
        hint: 'When enabled, animation changes will be synchronized across all connected clients'
      },
      {
        key: 'translateControllerEnableDelay',
        label: 'Use Delay',
        type: 'toggle',
        initial: false,
        hint: 'Enable delay before starting animations. Useful for creating smooth transitions or timed effects'
      },
      {
        key: 'translateControllerTransitionDelay',
        label: 'Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.translateControllerEnableDelay,
        hint: 'Time to wait before starting animations. Range: 0.1 to 60 seconds'
      },
      {
        key: 'translateControllerIsTranslationEnabled',
        label: 'Enable Translation',
        type: 'toggle',
        initial: true,
        hint: 'Enable translation animations'
      },
      {
        key: 'translateControllerTranslationDelay',
        label: 'Translation Delay (sec)',
        type: 'number',
        min: 0,
        max: 60,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.translateControllerIsTranslationEnabled,
        hint: 'Delay before starting translation animation'
      },
      {
        key: 'translateControllerTranslationSpeed',
        label: 'Translation Speed (units/frame)',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        initial: 0.1,
        dp: 2,
        hidden: !props.translateControllerIsTranslationEnabled,
        hint: 'Speed of translation animation in units per frame'
      },
      {
        key: 'translateControllerTranslationX',
        label: 'X Translation (units)',
        type: 'number',
        min: -1000,
        max: 1000,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.translateControllerIsTranslationEnabled,
        hint: 'Target X position in units'
      },
      {
        key: 'translateControllerTranslationY',
        label: 'Y Translation (units)',
        type: 'number',
        min: -1000,
        max: 1000,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.translateControllerIsTranslationEnabled,
        hint: 'Target Y position in units'
      },
      {
        key: 'translateControllerTranslationZ',
        label: 'Z Translation (units)',
        type: 'number',
        min: -1000,
        max: 1000,
        step: 0.1,
        initial: 0,
        dp: 1,
        hidden: !props.translateControllerIsTranslationEnabled,
        hint: 'Target Z position in units'
      },
      {
        key: 'translateControllerAcceptAnyEmitter',
        label: 'Accept Any Event',
        type: 'toggle',
        initial: false,
        hint: 'Allow to receive events from any emitter that emit to the appID directly. Useful for unknown or generative apps'
      },
      {
        key: 'translateControllerEventReceivers',
        label: 'Event Listeners',
        type: 'textarea',
        initial: '[]',
        hint: 'JSON array of event configurations. Each item should have an "id" (appID) and "actions" array with "type" and "params". Example: [{"id":"<appID>","actions":[{"type":"set-translation","params":{"translationY":5,"translationSpeed":0.2,"delay":0}}]}]. Replace <appID> with your app ID. Available actions: start-animation, stop-animation, set-state, set-translation.'
      },
    ];
  }

  /**
   * Creates a new TranslateController instance
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
    this.log = createDebugLogger(`${this.props.appID} - TranslateController`);

    this.isAnimating = false;
    this.isTranslationAnimating = false;
    this.dynamicParams = {}; // Store dynamic translation parameters
    this.rigidbodyOffset = { x: 0, y: 0, z: 0 }; // Store offset between rigidbody and mesh
    
    // Store initial position for reset functionality
    this.initialPosition = {
      x: this.node.position.x,
      y: this.node.position.y,
      z: this.node.position.z
    };

    this.log('info', 'TranslateController instance created');
    
    this._calculateRigidbodyOffset();
    
    this._initEventListeners();
    this._initAnimationLoop();
  }

  _getActionHandlers() {
    return {
      'set-translation': (ctx, payload) => ctx._onSetTranslation(payload),
      'pause-translation': (ctx, payload) => ctx._onPauseTranslation(payload),
      'resume-translation': (ctx, payload) => ctx._onResumeTranslation(payload),
      'reset-translation': (ctx, payload) => ctx._onResetTranslation(payload),
    };
  }

  _onStartAnimation(payload) {
    const delay = payload.delay !== undefined ? payload.delay : this.props.translateControllerTransitionDelay;
    const shouldApplyDelay = this.props.translateControllerEnableDelay && delay > 0;

    this.log('info', `Animation start requested with delay: ${delay}s`);

    if (shouldApplyDelay) {
      this.log('info', `Applying delay of ${delay} seconds before starting animation`);
      setTimeout(() => {
        this._executeStartAnimation(payload);
      }, delay * 1000);
    } else {
      this._executeStartAnimation(payload);
    }
  }

  _executeStartAnimation(payload) {
    this.isAnimating = true;
    
    if (this.props.translateControllerIsTranslationEnabled) {
      this._startTranslationWithDelay(payload.timestamp || Date.now());
    }

    this.log('info', 'Translation animation started successfully');
  }

  _startTranslationWithDelay(emitterTimestamp) {
    executeWithAnimationDelay({
      emitterTimestamp,
      delay: this.props.translateControllerTranslationDelay, 
      callback: () => { 
        this.isTranslationAnimating = true;
        this.log('info', 'Translation animation started');
      }
    });
  }

  _onStopAnimation(payload) {
    this.isAnimating = false;
    this.isTranslationAnimating = false;
    
    this.log('info', 'Translation animation stopped');
  }

  _onSetState(payload) {
    this.isAnimating = payload.isAnimating ?? this.isAnimating;
    
    if (payload.isAnimating) {
      this._onStartAnimation(payload);
    } else {
      this._onStopAnimation(payload);
    }
  }

  /**
   * Handles set-translation action with dynamic parameters
   * @param {Object} payload - Translation parameters
   * @param {number} [payload.translationX] - Target X position
   * @param {number} [payload.translationY] - Target Y position
   * @param {number} [payload.translationZ] - Target Z position
   * @param {number} [payload.translationSpeed] - Animation speed
   */
  _onSetTranslation(payload) {
    if (payload.translationX !== undefined) {
      this.dynamicParams.translationX = payload.translationX;
      this.log('info', `Dynamic X translation set to: ${payload.translationX}`);
    }
    if (payload.translationY !== undefined) {
      this.dynamicParams.translationY = payload.translationY;
      this.log('info', `Dynamic Y translation set to: ${payload.translationY}`);
    }
    if (payload.translationZ !== undefined) {
      this.dynamicParams.translationZ = payload.translationZ;
      this.log('info', `Dynamic Z translation set to: ${payload.translationZ}`);
    }
    if (payload.translationSpeed !== undefined) {
      this.dynamicParams.translationSpeed = payload.translationSpeed;
      this.log('info', `Dynamic translation speed set to: ${payload.translationSpeed}`);
    }

    this._onStartAnimation(payload);
  }

  _onPauseTranslation(payload) {
    this.isTranslationAnimating = false;
    this.log('info', 'Translation animation paused');
  }

  _onResumeTranslation(payload) {
    if (this.isAnimating) {
      this.isTranslationAnimating = true;
      this.log('info', 'Translation animation resumed');
    } else {
      this.log('warn', 'Cannot resume translation: animation not started');
    }
  }

  /**
   * Resets translation to initial position with fast animation
   * @param {Object} payload - Reset parameters
   * @param {number} [payload.resetSpeed=2.0] - Speed for reset animation
   */
  _onResetTranslation(payload) {
    const resetSpeed = payload.resetSpeed || 2.0;
    
    this.dynamicParams.translationX = this.initialPosition.x;
    this.dynamicParams.translationY = this.initialPosition.y;
    this.dynamicParams.translationZ = this.initialPosition.z;
    this.dynamicParams.translationSpeed = resetSpeed;
    
    this.isAnimating = true;
    this.isTranslationAnimating = true;
    
    this.log('info', `Translation reset started to initial position (${this.initialPosition.x}, ${this.initialPosition.y}, ${this.initialPosition.z}) with speed: ${resetSpeed}`);
  }

  _initAnimationLoop() {
    this.app.on('update', () => {
      if (this.isAnimating) {
        if (this.props.translateControllerIsTranslationEnabled) {
          if (rigidbody) {
            this._executeTranslation(rigidbody, this.dynamicParams, 'rigidbody');
          }
          this._executeTranslation(this.node, this.dynamicParams, 'node');
        }
      }
    });
  }

  _normalizeReceivers(receiver) {
    let receiverArray = receiver;

    if (typeof receiverArray === 'string') {
      // Check if it looks like JSON (starts with [ or {)
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
      let receivers = this._normalizeReceivers(this.props.translateControllerEventReceivers);

      receivers.forEach(({ id, type, params = {} }) => {
        this.log('info', `Setting up receiver for event id: ${id}`);
        this.world.on(id, (data) => this._handleEvent(type, params, data));
      });

      if (this.props.translateControllerAcceptAnyEmitter) {
        this.world.on(this.props.appID, (data) => {
          if (world.isServer) {
            this.app.send('translate-server-to-client', { ...data, appID: this.props.appID });
          } else {
            this._handleEvent('start-animation', {}, data);
          }
        });

        this.app.on('translate-server-to-client', (data) => {
          this._handleEvent('set-translation', {}, data);
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

  _applySingleAxisTranslation(targetObject, translationAxis, currentPosition, targetPosition, translationStep, element) {
    if (translationStep === 0) {
      if (targetObject.position[translationAxis] !== targetPosition) {
        targetObject.position[translationAxis] = targetPosition;
        this.log('debug', `${element} Setting ${translationAxis.toUpperCase()} position directly to: ${targetPosition.toFixed(2)}`);
      }
    } else {
      if (Math.abs(targetPosition - currentPosition) > 0.01) {
        const positionDelta = targetPosition - currentPosition;

        targetObject.position[translationAxis] += Math.sign(positionDelta) * Math.min(translationStep, Math.abs(positionDelta));
        this.log('debug', `${element} Translating ${translationAxis.toUpperCase()}: ${targetObject.position[translationAxis].toFixed(2)} towards ${targetPosition.toFixed(2)}`);
      }
    }
  }

  /**
   * Executes translation animation on target object
   * @param {Object} targetObject - Object to animate (node or rigidbody)
   * @param {Object} dynamicParams - Dynamic translation parameters
   * @param {string} element - Element type ('node' or 'rigidbody')
   */
  _executeTranslation(targetObject, dynamicParams = {}, element) {
    if (this.isTranslationAnimating) {
      const targetPositionX = dynamicParams.translationX !== undefined ? dynamicParams.translationX : (this.props.translateControllerTranslationX || 0);
      const targetPositionY = dynamicParams.translationY !== undefined ? dynamicParams.translationY : (this.props.translateControllerTranslationY || 0);
      const targetPositionZ = dynamicParams.translationZ !== undefined ? dynamicParams.translationZ : (this.props.translateControllerTranslationZ || 0);

      const currentPositionX = targetObject.position.x;
      const currentPositionY = targetObject.position.y;
      const currentPositionZ = targetObject.position.z;

      const translationStepSize = dynamicParams.translationSpeed !== undefined ? dynamicParams.translationSpeed : this.props.translateControllerTranslationSpeed;

      const hasXTarget = this.props.translateControllerTranslationX > 0 || dynamicParams.translationX !== undefined;
      const hasYTarget = this.props.translateControllerTranslationY > 0 || dynamicParams.translationY !== undefined;
      const hasZTarget = this.props.translateControllerTranslationZ > 0 || dynamicParams.translationZ !== undefined;

      if (hasXTarget) {
        const compensatedTargetX = element === 'rigidbody' ? targetPositionX + this.rigidbodyOffset.x : targetPositionX;
        this._applySingleAxisTranslation(targetObject, 'x', currentPositionX, compensatedTargetX, translationStepSize, element);
      }

      if (hasYTarget) {
        const compensatedTargetY = element === 'rigidbody' ? targetPositionY + this.rigidbodyOffset.y : targetPositionY;
        this._applySingleAxisTranslation(targetObject, 'y', currentPositionY, compensatedTargetY, translationStepSize, element);
      }

      if (hasZTarget) {
        const compensatedTargetZ = element === 'rigidbody' ? targetPositionZ + this.rigidbodyOffset.z : targetPositionZ;
        this._applySingleAxisTranslation(targetObject, 'z', currentPositionZ, compensatedTargetZ, translationStepSize, element);
      }
    }
  }
}

  
/* istanbul ignore if */
if (typeof module === 'undefined') {
  try {
    mainLogger('info', `Starting ${app.instanceId} app initialization`);

    initAppConfig(TranslateController.getConfig());

    const node = findNodeByName(props.targetNodeName);

    initializeNodeVisibility(node);

    new TranslateController({ app, node, props, world });

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
    TranslateController
  };
}