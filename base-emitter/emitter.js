let ui = null;
let node = null;
let cooldownTimer = 0;
let isEmitterEnabled = true;

/**
 * Displays debug messages if debug mode is enabled
 * @param {string} message - Debug message to display
 */
function logDebug(message) {
  if (app.config.debugMode) {
    console.log(`[Debug] ${message}`);
  }
}

/**
 * Retrieves a node from the scene by name
 * @param {string} nodeName - The name of the node to retrieve
 * @returns {Object} The node object
 * @throws {Error} If the node name is not provided or the node is not found
 */
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
 * Sets up the UI display for the emitter
 * Creates a UI panel with the emitter label
 */
function setupUI() {
  ui = app.create('ui', {
    height: 30,
    width: 200,
    backgroundColor: 'rgb(0, 0, 0)',
    borderRadius: 14,
    display: 'none'
  });

  app.config.uiRadiusX = node.position.x;
  app.config.uiRadiusY = node.position.y;
  app.config.uiRadiusZ = node.position.z;

  ui.position.set(
    node.position.x || app.config.uiRadiusX,
    node.position.y || app.config.uiRadiusY,
    node.position.z || app.config.uiRadiusZ
  );

  ui.billboard = 'full';
  ui.active = false;

  // Status section
  const statusView = app.create('uiview', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 30,
  });

  // Status text
  const statusText = app.create('uitext', {
    padding: 4,
    value: app.config.displayLabel || 'default label',
    color: 'rgb(255, 255, 255)',
    fontSize: 15,
  });

  // Add elements to UI
  ui.add(statusView);
  statusView.add(statusText);

  // Add UI to the model
  app.add(ui);
  logDebug('UI system initialized');
}

/**
 * Sets up the rotation effect for the emitter model
 * The emitter model will rotate continually around the Y axis if enabled
 */
function setupRotationIfEnabled() {
  if (app.config.isRotationEnabled) {
    app.on('update', () => {
      if (node) {
        node.rotation.y += app.config.rotationSpeed;
      }
    });
    logDebug('Rotation system initialized');
  }
}

/**
 * Sets up the cooldown system for the emitter
 * Prevents the emitter from occurring too frequently
 */
function setupCooldown() {
  app.on('update', () => {
    if (cooldownTimer > 0) {
      cooldownTimer -= 0.016;
      logDebug(`Cooldown: ${cooldownTimer.toFixed(2)}s`);

      if (cooldownTimer <= 0) {
        cooldownTimer = 0;
        isEmitterEnabled = true;
        logDebug('Emitter ready!');
      }
    }
  });
  logDebug('Cooldown system initialized');
}

/**
 * Emits a signal when the redirect is triggered
 * Any component listening for this signal name can receive and process it
 */
function emitSignal(playerId) {
  if (!app.config.signalName) {
    logDebug('No signal name configured');
    return;
  }

  try {
    // Create signal data with useful information for receivers
    const signalData = {
      playerId,
      timestamp: Date.now(),
    };

    world.emit(app.config.signalName, signalData);
    logDebug(`Signal '${app.config.signalName}' emitted successfully`);
  } catch (e) {
    logDebug(`Error emitting signal: ${e.message}`);
  }
}

/**
 * Sets up the trigger zone for the emitter
 * When a player enters this zone, it will emit a signal
 */
function setupEmitterTrigger() {
  const emitterBody = app.create('rigidbody');
  const emitterCollider = app.create('collider', {
    type: 'sphere',
    radius: app.config.triggerRadius || 2,
    trigger: true
  });

  emitterBody.add(emitterCollider);

  emitterBody.onTriggerEnter = (triggerResult) => {
    if (triggerResult.playerId && isEmitterEnabled) {
      isEmitterEnabled = false;

      emitSignal(triggerResult.playerId);

      logDebug('Player entered emitter zone');

      cooldownTimer = Number(app.config.cooldown) || 3;
      logDebug(`Starting cooldown: ${cooldownTimer}s`);
    } else if (!isEmitterEnabled) {
      logDebug(`Emitter not ready. Cooldown: ${cooldownTimer.toFixed(2)}s`);
    }
  };

  node.add(emitterBody);
  logDebug('Emitter trigger initialized');
}

/**
 * Sets up the trigger zone for UI display
 * When a player enters this zone, the UI will be displayed
 */
function setupUITrigger() {
  const uiBody = app.create('rigidbody');
  const uiCollider = app.create('collider', {
    type: 'sphere',
    radius: app.config.uiRadius || 4,
    trigger: true
  });

  uiBody.add(uiCollider);

  uiBody.onTriggerEnter = (triggerResult) => {
    if (triggerResult.playerId) {
      ui.active = true;
      logDebug('Showing UI - player in range');
    }
  };

  uiBody.onTriggerLeave = (triggerResult) => {
    if (triggerResult.playerId) {
      ui.active = false;
      logDebug('Hiding UI - player out of range');
    }
  };

  node.add(uiBody);
  logDebug('UI trigger initialized');
}

/**
 * Sets up the interaction for the node
 * Configures either key-based or automatic emitter based on settings
 */
function setupInteraction() {
  if (app.config.interactionType === 'key') {
    addKeyPressAction();
    logDebug('Key-based emitter initialized');
  } else {
    setupUI();
    setupEmitterTrigger();
    setupUITrigger();
    logDebug('Automatic emitter initialized');
  }
}

/**
 * Adds a key press action to the node that can be triggered with a key press
 */
function addKeyPressAction() {
  if (node && node.children) {
    const existingActions = node.children.filter(child => child.isAction);
    existingActions.forEach(action => node.remove(action));
  }

  const keyPressAction = app.create('action', {
    label: app.config.displayLabel || 'Action Label',
    distance: app.config.triggerDistance || 2,
    onTrigger: (keyPressTrigger) => {
      if (isEmitterEnabled) {
        isEmitterEnabled = false;
        
        emitSignal(keyPressTrigger.playerId);
        
        logDebug('Player triggered emitter with key');
        
        cooldownTimer = Number(app.config.cooldown) || 3;
        logDebug(`Starting cooldown: ${cooldownTimer}s`);
      } else {
        logDebug(`Emitter not ready. Cooldown: ${cooldownTimer.toFixed(2)}s`);
      }
    }
  });

  node.add(keyPressAction);
  logDebug('Key press action added to node');
}

app.configure([
  {
    type: 'section',
    key: 'basicSection',
    label: 'Basic Settings'
  },
  {
    key: 'nodeName',
    label: 'Base node name',
    type: 'text',
  },
  {
    key: 'debugMode',
    label: 'Debug Mode',
    type: 'switch',
    options: [
      { label: 'On', value: true },
      { label: 'Off', value: false }
    ],
    initial: false,
  },
  {
    key: 'displayLabel',
    label: 'Emitter label',
    type: 'text',
  },
  {
    key: 'interactionType',
    type: 'switch',
    label: 'Interaction Type',
    options: [
        { value: 'key', label: 'key' },
        { value: 'auto', label: 'auto' }
    ],
    initial: 'key'
},
  {
    type: 'section',
    key: 'behaviorSection',
    label: 'Behavior Settings'
  },
  {
    key: 'cooldown',
    label: 'Cooldown (seconds)',
    type: 'number',
    min: 0,
    max: 60,
    step: 0.1,
    initial: 3,
    dp: 1,
  },
  {
    key: 'triggerRadius',
    label: 'Emitter Trigger Radius',
    type: 'number',
    min: 0,
    max: 10,
    step: 0.1,
    initial: 2,
    dp: 2,
  },
  {
    key: 'triggerDistance',
    label: 'Trigger Distance',
    type: 'number',
    min: 0,
    max: 10,
    step: 0.1,
    initial: 2,
    dp: 2
  },
  {
    type: 'section',
    key: 'animationSection',
    label: 'Animation Settings'
  },
  {
    key: 'isRotationEnabled',
    label: 'Enable Rotation',
    type: 'switch',
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
    initial: true,
  },
  {
    key: 'rotationSpeed',
    label: 'Rotation Speed',
    type: 'number',
    min: 0,
    max: 0.5,
    step: 0.001,
    initial: 0.01,
    dp: 3
  },
  {
    type: 'section',
    key: 'uiSection',
    label: 'UI Settings'
  },
  {
    key: 'uiRadius',
    label: 'UI Display Radius',
    type: 'number',
    min: 0,
    max: 15,
    step: 0.1,
    initial: 4,
    dp: 1,
  },
  {
    key: 'uiRadiusX',
    label: 'UI Display Radius X',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.01,
    initial: 3,
    dp: 2,
  },
  {
    key: 'uiRadiusY',
    label: 'UI Display Radius Y',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.01,
    initial: 3,
    dp: 3,
  },
  {
    key: 'uiRadiusZ',
    label: 'UI Display Radius Z',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.01,
    initial: 3,
    dp: 3,
  },
  {
    type: 'section',
    key: 'signalSection',
    label: 'Signal Settings'
  },
  {
    key: 'signalName',
    label: 'Signal Name',
    type: 'text',
  },
]);

/**
 * Main initialization block
 * Creates and sets up all emitter components
 */
try {
  node = getNode(app.config.nodeName);
  setupRotationIfEnabled();
  setupCooldown();
  setupInteraction();
  logDebug('Emitter initialized successfully');
} catch (e) {
  console.error('Emitter initialization failed:', e.message);
}