let isAnimating = false;

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
 * Move and rotate the object when receiving a signal
 * @param {Object} data - The signal data
 */
function setupAnimation(data) { 
  const currentTime = Date.now();
  const timestamp = data.timestamp;
  const timeSinceSignal = currentTime - timestamp;

  if (timeSinceSignal > 5000) {
    logDebug('Signal received less than 5 seconds ago, skipping rotation');
    return;
  }

  logDebug('Received signal to move and rotate the object');
  isAnimating = true;
}

/**
 * Applies rotation logic for a single axis.
 * @param {Object} object - The object to rotate.
 * @param {string} axis - The axis to rotate ('x', 'y', or 'z').
 * @param {number} currentRotation - Current rotation angle in radians for the axis.
 * @param {number} targetRotation - Target rotation angle in radians for the axis.
 * @param {number} step - Rotation speed (radians per frame).
 */
function applyRotationToAxis(object, axis, currentRotation, targetRotation, step) {
  if (step === 0) {
    // If step is 0, rotate directly to target if not already there
    if (object.rotation[axis] !== targetRotation) {
      object.rotation[axis] = targetRotation;
      logDebug(`Setting ${axis.toUpperCase()} rotation directly to: ${targetRotation.toFixed(2)} rad`);
    }
  } else {
    if (Math.abs(targetRotation - currentRotation) > 0.01) {
      let delta = targetRotation - currentRotation;
      if (Math.abs(delta) > Math.PI) {
        delta = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI;
      }

      // Apply rotation step
      object.rotation[axis] += Math.sign(delta) * Math.min(step, Math.abs(delta));
      logDebug(`Rotating ${axis.toUpperCase()}: ${object.rotation[axis].toFixed(2)} rad towards ${targetRotation.toFixed(2)} rad`);
    }
  }
}

function rotate(object) {
  const targetX = degreesToRadians(app.config.rotationX || 0);
  const targetY = degreesToRadians(app.config.rotationY || 0);
  const targetZ = degreesToRadians(app.config.rotationZ || 0);

  const currentX = normalizeAngle(object.rotation.x);
  const currentY = normalizeAngle(object.rotation.y);
  const currentZ = normalizeAngle(object.rotation.z);

  const step = app.config.rotationSpeed;

  if (app.config.rotationX) {
    applyRotationToAxis(object, 'x', currentX, targetX, step);
  }

  if (app.config.rotationY) {
    applyRotationToAxis(object, 'y', currentY, targetY, step);
  }

  if (app.config.rotationZ) {
    applyRotationToAxis(object, 'z', currentZ, targetZ, step);
  }
}

/**
 * Rotates object smoothly towards target rotation
 * @param {Object} object - The object to rotate
 */
function animate(object) {
  if (app.config.isRotationEnabled) {
    rotate(object);
  }
}

function setupVisibility(portal) {
  portal.visible = app.config.visibleType === 'visible';
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
    key: 'visibleType',
    type: 'switch',
    label: 'Visibility Type',
    options: [
        { value: 'visible', label: 'Visible' },
        { value: 'invisible', label: 'Invisible' }
    ],
    initial: 'visible'
  },
  {
    type: 'section',
    key: 'progressiveRotationSection',
    label: 'Progressive Rotation Settings'
  },
  {
    key: 'isRotationEnabled',
    label: 'Has Rotation?',
    type: 'switch',
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
    initial: true,
  },
  {
    key: 'rotationSpeed',
    label: 'Rotation Speed (radians per frame)',
    type: 'number',
    min: 0,
    max: 0.1,
    step: 0.001,
    initial: 0.01,
    dp: 3
  },
  {
    key: 'rotationX',
    label: 'X Rotation (degrees)',
    type: 'number',
    min: -3600,
    max: 3600,
    step: 1,
    initial: 0
  },
  {
    key: 'rotationY',
    label: 'Y Rotation (degrees)',
    type: 'number',
    min: -3600,
    max: 3600,
    step: 1,
    initial: 90
  },
  {
    key: 'rotationZ',
    label: 'Z Rotation (degrees)',
    type: 'number',
    min: -3600,
    max: 3600,
    step: 1,
    initial: 0
  },
  {
    type: 'section',
    key: 'signalSection',
    label: 'Signal Settings'
  },
  {
    key: 'signalId',
    label: 'Signal ID',
    type: 'text',
  },
]);

/**
 * Main initialization block
 * Creates and sets up all components
 */
try {
  const object = getPortalNode(app.config.nodeName);
  setupVisibility(object);

  world.on(app.config.signalId, setupAnimation);

  app.on('update', () => animate(object));
  
  logDebug('Rotation listener initialized successfully');
} catch (e) {
  console.error('Rotation listener initialization failed:', e.message);
}