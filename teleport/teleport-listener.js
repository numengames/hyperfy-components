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
 * Sets up the rotation effect for the portal
 * The portal will rotate continually around the Y axis if enabled
 * @param {Object} portal - The portal node
 */
function setupRotationIfEnabled(portal) {
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
 * Teleport listener
 * Teleports a player to the destination
 * @param {Object} data - The signal data
 * @param {Object} portal - The portal node
 */
function teleport(data, portal) {
  // Verificar que data.playerId existe
  if (!data || !data.playerId) {
    logDebug('Teleport canceled: missing playerId in signal data');
    return;
  }

  const portalWorldPosition = portal.matrixWorld.toArray();

  const destination = new Vector3(
    portalWorldPosition[12] || 0,
    portalWorldPosition[13] || 0,
    portalWorldPosition[14] || 0,
  );

  logDebug(`Teleporting to: (${destination.x}, ${destination.y}, ${destination.z})`);
  const player = world.getPlayer(data.playerId);
  
  // Verificar que el jugador existe
  if (!player) {
    logDebug(`Teleport canceled: player with id ${data.playerId} not found`);
    return;
  }
  
  player.teleport(destination);
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
		label: 'Visbility Type',
		options: [
			{ value: 'visible', label: 'Visible' },
			{ value: 'invisible', label: 'Invisible' }
		],
		initial: 'visible'
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
 * Creates and sets up all teleport components
 */
try {
  const portal = getPortalNode(app.config.nodeName);
  setupVisibility(portal);
  setupRotationIfEnabled(portal);
  world.on(app.config.signalId, (data) => teleport(data, portal));
  logDebug('Teleport listener initialized successfully');
} catch (e) {
  console.error('Teleport listener initialization failed:', e.message);
}