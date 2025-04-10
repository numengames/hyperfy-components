// Coordinate configuration
const COORDINATE_CONFIG = {
  min: -10000,
  max: 10000,
  step: 0.1,
  initial: 0,
  dp: 1
};

// Global variables
let node = null;
let sound = null;

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
 * Gets the scene node from the application
 * @param {string} nodeName - Name of the node to retrieve
 * @returns {Object} - The scene node
 * @throws {Error} - If node name is not provided or node is not found
 */
function getSceneNode(nodeName) {
  if (!nodeName) {
    throw new Error('Node name is required');
  }

  const sceneNode = app.get(nodeName);
  if (!sceneNode) {
    throw new Error(`Model ${nodeName} not found in scene`);
  }

  return sceneNode;
}

/**
 * Updates the node's position based on configuration
 */
function updatePosition() {
  if (node) {
    node.position.set(
      config.nodeX || 0,
      config.nodeY || 0,
      config.nodeZ || 0
    );
    logDebug(`Node position updated: (${node.position.x}, ${node.position.y}, ${node.position.z})`);
  }
}

/**
 * Sets up sound for the node
 * Creates a new audio component if enabled in config
 */
function setupSound() {
  if (config.soundEnabled && config.soundUrl?.url) {
    sound = app.create('audio', {
      group: 'sfx',
      src: config.soundUrl?.url,
      volume: config.soundVolume,
    });

    node.add(sound);
    logDebug('Sound initialized successfully');
  }
}

/**
 * Rotation update function (passed as callback)
 * @param {number} delta - Time delta
 */
function updateRotation(delta) {
  if (node) {
    const rotationAmount = config.rotationSpeed * delta * 60;
    node.rotation.y += rotationAmount;
  }
}

/**
 * Sets up rotation for the node
 * Configures the update listener if rotation is enabled
 */
function setupRotation() {
  if (config.isRotationEnabled) {
    app.on('update', updateRotation);
    logDebug('Rotation system initialized');
  }
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
      position: node ? node.position.toArray() : [0, 0, 0],
      redirectUrl: config.destinationUrl || null,
      redirectType: config.redirectType,
      timestamp: Date.now(),
      source: 'redirect-key',
      nodeName: config.nodeName
    };
    
    world.emit(config.signalName, signalData);
    logDebug(`Signal '${config.signalName}' emitted successfully`);
  } catch (e) {
    logDebug(`Error emitting signal: ${e.message}`);
  }
}

/**
 * Plays the node sound if available
 */
function playSound() {
  if (sound && config.soundEnabled) {
    try {
      sound.play();
      logDebug('Playing sound');
    } catch (e) {
      logDebug(`Error playing sound: ${e.message}`);
    }
  }
}

/**
 * Handles the redirect when triggered
 * Opens external URL or teleports to internal position based on config
 */
function handleRedirect() {
  logDebug('Initiating redirect...');
  
  // Emit signal before redirecting
  emitSignal();
  
  // Handle redirect based on type (external URL or internal position)
  if (config.redirectType === 'external' && config.destinationUrl) {
    try {
      logDebug(`Redirecting to external URL: ${config.destinationUrl}`);
      world.open(config.destinationUrl, config.openInNewWindow);
    } catch (e) {
      console.error('Redirect failed:', e);
      logDebug(`Redirect failed: ${e.message}`);
    }
  } else {
    logDebug('No valid redirect destination configured');
  }
  
  playSound();
}

/**
 * Adds the redirect action to the node
 * Creates an interactive action that triggers the redirect
 */
function addRedirectAction() {
  const redirectAction = app.create('action', {
    label: config.redirectLabel || 'Redirect',
    distance: config.triggerDistance,
    onTrigger: handleRedirect
  });

  node.add(redirectAction);
  logDebug('Redirect action added to node');
}

/**
 * Initializes the redirect component
 * Sets up node, position, rotation, sound, and action
 * @returns {boolean} - true if initialization was successful, false if not
 */
function initializeRedirect() {
  try {
    node = getSceneNode(config.nodeName);
    updatePosition();
    setupRotation();
    setupSound();
    addRedirectAction();
    logDebug('Component initialized successfully');
    return true;
  } catch (e) {
    console.error('Initialization error:', e.message);
    return false;
  }
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
    type: 'text'
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
    key: 'redirectLabel',
    label: 'Redirect label',
    type: 'text'
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
    key: 'behaviorSection',
    label: 'Behavior Settings'
  },
  {
    type: 'section',
    key: 'redirectSection',
    label: 'Redirect Settings'
  },
  {
    key: 'redirectType',
    label: 'Redirect Type',
    type: 'select',
    options: [
      { label: 'External URL', value: 'external' },
      { label: 'Internal Position', value: 'internal' }
    ],
    initial: 'external'
  },
  {
    key: 'destinationUrl',
    label: 'Destination URL',
    type: 'text',
  },
  {
    key: 'openInNewWindow',
    label: 'Open in New Window',
    type: 'switch',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false }
    ],
    initial: false,
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
    key: 'rotationSection',
    label: 'Rotation Settings'
  },
  {
    key: 'isRotationEnabled',
    label: 'Enable Rotation',
    type: 'switch',
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
    initial: true
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
    key: 'soundSection',
    label: 'Sound Settings'
  },
  {
    key: 'soundEnabled',
    label: 'Enable Sound',
    type: 'switch',
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
    initial: true,
  },
  {
    key: 'soundUrl',
    type: 'file',
    kind: 'audio',
    label: '.mp3 file'
  },
  {
    key: 'soundVolume',
    label: 'Volume',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 0.5,
    dp: 2
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

initializeRedirect();