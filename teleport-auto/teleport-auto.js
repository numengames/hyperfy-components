const COORDINATE_CONFIG = {
  min: -10000,
  max: 10000,
  step: 0.1,
  initial: 0,
  dp: 1
};

let ui = null;
let portal = null;
let cooldownTimer = 0;
let isTeleportEnabled = true;

/**
 * Displays debug messages if debug mode is enabled
 * @param {string} message - Debug message to display
 */
function logDebug(message) {
  if (config.debugMode) {
    console.log(`[Debug] ${message}`);
  }
}

/**
 * Retrieves a node from the scene by name
 * @param {string} nodeName - The name of the node to retrieve
 * @returns {Object} The node object
 * @throws {Error} If the node name is not provided or the node is not found
 */
function getPortalNode(nodeName) {
  if (!nodeName) {
    throw new Error('Node name is required');
  }

  const portalNode = app.get(nodeName);
  if (!portalNode) {
    throw new Error(`Model ${nodeName} not found in scene`);
  }

  return portalNode;
}

/**
 * Sets up the UI display for the teleport
 * Creates a UI panel with the teleport label
 */
function setupUI() {
  ui = app.create('ui', {
    height: 30,
    width: 200,
    backgroundColor: 'rgb(0, 0, 0)',
    borderRadius: 14,
    display: 'none'
  });

  app.config.uiRadiusX = portal.position.x;
  app.config.uiRadiusY = portal.position.y;
  app.config.uiRadiusZ = portal.position.z;

  ui.position.set(
    portal.position.x || app.config.uiRadiusX,
    portal.position.y || app.config.uiRadiusY,
    portal.position.z || app.config.uiRadiusZ
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
    value: app.config.teleportLabel || 'Teleport',
    color: 'rgb(255, 255, 255)',
    fontSize: 15,
  });

  // Add elements to UI
  ui.add(statusView);
  statusView.add(statusText);

  // Add UI to portal
  app.add(ui);
  logDebug('UI system initialized');
}

/**
 * Sets up the rotation effect for the portal
 * The portal will rotate continually around the Y axis if enabled
 */
function setupRotation() {
  if (app.config.isRotationEnabled) {
    app.on('update', () => {
      if (portal) {
        portal.rotation.y += app.config.rotationSpeed;
      }
    });
    logDebug('Rotation system initialized');
  }
}

/**
 * Sets up the cooldown system for teleportation
 * Prevents teleportation from occurring too frequently
 */
function setupCooldown() {
  app.on('update', () => {
    if (cooldownTimer > 0) {
      cooldownTimer -= 0.016;
      logDebug(`Cooldown: ${cooldownTimer.toFixed(2)}s`);

      if (cooldownTimer <= 0) {
        cooldownTimer = 0;
        isTeleportEnabled = true;
        logDebug('Teleport ready!');
      }
    }
  });
  logDebug('Cooldown system initialized');
}

/**
 * Emits a signal when the redirect is triggered
 * Any component listening for this signal name can receive and process it
 */
function emitSignal() {
  if (!config.emitterEnabled || !config.signalName) {
    logDebug('Emitter is disabled or no signal name configured');
    return;
  }

  try {
    // Create signal data with useful information for receivers
    const signalData = {
      timestamp: Date.now(),
      source: 'teleport-auto',
    };

    world.emit(config.signalName, signalData);
    logDebug(`Signal '${config.signalName}' emitted successfully`);
  } catch (e) {
    logDebug(`Error emitting signal: ${e.message}`);
  }
}

/**
 * Sets up the trigger zone for teleportation
 * When a player enters this zone, they will be teleported to the destination
 */
function setupTeleportTrigger() {
  const teleportBody = app.create('rigidbody');
  const teleportCollider = app.create('collider', {
    type: 'sphere',
    radius: app.config.triggerRadius || 2,
    trigger: true
  });

  teleportBody.add(teleportCollider);

  teleportBody.onTriggerEnter = (triggerResult) => {
    if (triggerResult.playerId && isTeleportEnabled) {
      isTeleportEnabled = false;

      emitSignal();

      logDebug('Player entered teleport zone');

      const destination = new Vector3(
        app.config.destX || 0,
        app.config.destY || 0,
        app.config.destZ || 0
      );

      logDebug(`Teleporting to: (${destination.x}, ${destination.y}, ${destination.z})`);
      const player = world.getPlayer(triggerResult.playerId);
      player.teleport(destination);

      cooldownTimer = Number(app.config.cooldown) || 3;
      logDebug(`Starting cooldown: ${cooldownTimer}s`);
    } else if (!isTeleportEnabled) {
      logDebug(`Teleport not ready. Cooldown: ${cooldownTimer.toFixed(2)}s`);
    }
  };

  portal.add(teleportBody);
  logDebug('Teleport trigger initialized');
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

  portal.add(uiBody);
  logDebug('UI trigger initialized');
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
    key: 'teleportLabel',
    label: 'Teleport label',
    type: 'text',
  },
  {
    key: 'nodeX',
    label: 'Node X',
    type: 'number',
    ...COORDINATE_CONFIG
  },
  {
    key: 'nodeY',
    label: 'Node Y',
    type: 'number',
    ...COORDINATE_CONFIG
  },
  {
    key: 'nodeZ',
    label: 'Node Z',
    type: 'number',
    ...COORDINATE_CONFIG
  },
  {
    type: 'section',
    key: 'destinationSection',
    label: 'Destination Settings'
  },
  {
    key: 'destX',
    label: 'Destination X',
    type: 'number',
    ...COORDINATE_CONFIG
  },
  {
    key: 'destY',
    label: 'Destination Y',
    type: 'number',
    ...COORDINATE_CONFIG
  },
  {
    key: 'destZ',
    label: 'Destination Z',
    type: 'number',
    ...COORDINATE_CONFIG
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
    label: 'Teleport Trigger Radius',
    type: 'number',
    min: 0,
    max: 10,
    step: 0.1,
    initial: 2,
    dp: 2,
  },
  {
    type: 'section',
    key: 'rotationSection',
    label: 'Rotation Settings'
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
    key: 'emitterSection',
    label: 'Emitter Settings'
  },
  {
    key: 'emitterEnabled',
    label: 'Enable Emitter',
    type: 'switch',
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
    initial: true,
  },
  {
    key: 'signalName',
    label: 'Signal Name',
    type: 'text',
  },
]);

/**
 * Main initialization block
 * Creates and sets up all teleport components
 */
try {
  portal = getPortalNode(app.config.nodeName);
  portal.position.set(app.config.nodeX, app.config.nodeY, app.config.nodeZ);
  setupRotation();
  setupUI();
  setupCooldown();
  setupTeleportTrigger();
  setupUITrigger();
  logDebug('Portal initialized successfully');
} catch (e) {
  console.error('Portal initialization failed:', e.message);
}