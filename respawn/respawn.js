let sound = null;
let lastUpdateTime = 0;
let defaultSpawnPosition = null;
let lastSafePosition = null;
let heightHistory = [];
let lastSaveTime = 0;

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
    initial: 'RespawnZone'
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
    type: 'section',
    key: 'respawnSection',
    label: 'Respawn Settings'
  },
  {
    key: 'fallThreshold',
    label: 'Fall Y Threshold',
    type: 'number',
    min: -1000,
    max: 1000,
    step: 0.1,
    initial: 4,
  },
  {
    key: 'trackingInterval',
    label: 'Position Tracking Interval (seconds)',
    type: 'number',
    min: 0.1,
    max: 10,
    step: 0.1,
    initial: 1,
  },
  {
    key: 'heightHistoryLength',
    label: 'Height History Length',
    type: 'number',
    min: 3,
    max: 20,
    step: 1,
    initial: 5,
  },
  {
    key: 'heightSamplingRate',
    label: 'Height Sampling Rate',
    type: 'number',
    min: 0.05,
    max: 1,
    step: 0.05,
    initial: 0.2,
    tooltip: 'How often to sample the player\'s movement (lower = more frequent)'
  },
  {
    key: 'safePositionDelay',
    label: 'Safe Position Save Delay',
    type: 'number',
    min: 0.5,
    max: 5,
    step: 0.1,
    initial: 1.5,
    tooltip: 'Time to wait before saving a position as safe (prevents saving while jumping or starting to fall)'
  },
  {
    key: 'movementThreshold',
    label: 'Significant Movement Threshold',
    type: 'number',
    min: 0.01,
    max: 1,
    step: 0.01,
    initial: 0.1,
    dp: 2,
  },
  {
    type: 'section',
    key: 'feedbackSection',
    label: 'Feedback Settings'
  },
  {
    key: 'soundEnabled',
    label: 'Enable Sound',
    type: 'switch',
    options: [
      { label: 'On', value: true },
      { label: 'Off', value: false }
    ],
    initial: true,
  },
  {
    key: 'soundUrl',
    label: 'Sound URL',
    kind: 'audio',
    type: 'file',
  },
  {
    key: 'soundVolume',
    label: 'Sound Volume',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 0.5,
    dp: 2,
  }
]);

/**
 * Log debug messages if debug mode is enabled
 * @param {string} message - Debug message to output
 */
function logDebug(message) {
  if (config && config.debugMode) {
    console.log(`[RespawnComponent] ${message}`);
  }
}

/**
 * Initialize the respawn component
 */
function initializeRespawn() {
  try {
    logDebug('Respawn component initialized');
    setupSound();
    setupDefaultSpawnPosition();

    app.on('update', updatePlayerPosition);
    logDebug(`Position tracking system initialized with threshold ${config.fallThreshold}`);
  } catch (error) {
    console.error('Error initializing respawn component:', error.message);
  }
}

/**
 * Set up sound for respawn
 */
function setupSound() {
  if (config.soundEnabled && config.soundUrl?.url) {
    sound = app.create('audio', {
      group: 'sfx',
      src: config.soundUrl.url,
      volume: config.soundVolume,
    });

    app.add(sound);
    logDebug('Sound initialized');
  }
}

/**
 * Setup default spawn position
 */
function setupDefaultSpawnPosition() {
  const localPlayer = world.getPlayer();
  const { x, y, z } = localPlayer.position;

  defaultSpawnPosition = new Vector3(x, y, z);
  lastSafePosition = new Vector3(x, y, z);
  
  logDebug(`Default spawn position set to: ${vectorToString(defaultSpawnPosition)}`);
}

/**
 * Convert Vector3 to a string for debug logging
 * @param {Vector3} vector - The vector to stringify
 * @returns {string} The string representation
 */
function vectorToString(vector) {
  if (!vector) return 'undefined';
  return `(${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)})`;
}

/**
 * Track player position and handle respawn at the configured interval
 * @param {number} delta - Time delta
 */
function updatePlayerPosition(delta) {
  lastUpdateTime += delta;

  if (lastUpdateTime < config.heightSamplingRate) {
    return;
  }

  lastUpdateTime = 0;
  const currentTime = world.getTime();
  const player = world.getPlayer();
  
  updateHeightHistory(player, currentTime);
  checkForFallAndUpdateSafePosition(player, currentTime);
}

/**
 * Check if a position has moved significantly from a previous position
 * @param {Vector3} prevPos - The previous position
 * @param {Vector3} currentPos - The current position
 * @returns {boolean} True if moved significantly
 */
function hasMovedSignificantly(prevPos, currentPos) {
  const movementThreshold = config.movementThreshold;

  const { x: prevX, y: prevY, z: prevZ } = prevPos;
  const { x: currentX, y: currentY, z: currentZ } = currentPos;

  return (
    Math.abs(prevX - currentX) > movementThreshold ||
    Math.abs(prevY - currentY) > movementThreshold ||
    Math.abs(prevZ - currentZ) > movementThreshold
  );
}

/**
 * Update the height history for the player
 * @param {Object} player - The player object 
 * @param {number} currentTime - Current time in seconds
 */
function updateHeightHistory(player, currentTime) {
  // Add current height to history
  const currentHeight = player.position.y;
  
  // Añadir nueva entrada al historial
  heightHistory.push({ height: currentHeight, time: currentTime });

  // Keep only the most recent entries based on config
  while (heightHistory.length > config.heightHistoryLength) {
    heightHistory.shift();
  }

  if (config.debugMode) {
    logDebug(`Height history updated: current height = ${currentHeight.toFixed(2)}`);
  }
}

/**
 * Check if player is falling and update their safe position if stable
 * @param {Object} player - The player object
 */
function checkForFallAndUpdateSafePosition(player, currentTime) {
  const playerPosition = player.position;
  
  // Need at least a few points to analyze
  if (heightHistory.length < 3) return;

  // Check if player has fallen below threshold compared to last safe position
  const heightDifference = lastSafePosition.y - playerPosition.y;
  if (heightDifference > config.fallThreshold) {
    logDebug(`Player at ${vectorToString(playerPosition)} has fallen ${heightDifference.toFixed(2)} units`);
    handlePlayerFall(player);
    return;
  }

  // Update safe position if:
  // 1. Player is not falling
  // 2. Player has been stable for a while
  // 3. Player has moved significantly or we don't have a position yet
  
  const timeStable = isStableHeight();
  const isFalling = isPlayerFalling();
  
  if (!isFalling && 
      timeStable > config.safePositionDelay && 
      currentTime - lastSaveTime >= config.safePositionDelay && 
      (!lastSafePosition || hasMovedSignificantly(lastSafePosition, playerPosition))) {
    
    // Crear un nuevo Vector3 para la posición segura para evitar referencias compartidas
    lastSafePosition = new Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    lastSaveTime = currentTime;
    
    logDebug(`Updated safe position: ${vectorToString(playerPosition)}, Stable for: ${timeStable.toFixed(2)}s`);
  }
}

/**
 * Determine if a player is falling based on height history
 * @returns {boolean} True if the player appears to be falling
 */
function isPlayerFalling() { 
  // Necesitamos al menos 3 puntos para determinar una tendencia
  if (heightHistory.length < 3) return false;
  
  // Analizamos las últimas entradas para detectar una tendencia de caída
  // Un jugador está cayendo si la mayoría de las transiciones son descendentes
  let decreasingCount = 0;
  let totalTransitions = 0;
  
  for (let i = 1; i < heightHistory.length; i++) {
    if (heightHistory[i].height < heightHistory[i-1].height) {
      decreasingCount++;
    }
    totalTransitions++;
  }
  
  // Si más del 75% de las transiciones son descendentes, consideramos que está cayendo
  return (decreasingCount / totalTransitions) > 0.75;
}

/**
 * Calculate how long a player's height has been stable
 * @returns {number} Time in seconds the height has been stable, or 0 if not stable
 */
function isStableHeight() {
  if (heightHistory.length < 3) return 0;
  
  const recentHeights = heightHistory.slice(-3);
  
  // Calculate max height difference
  let maxDiff = 0;
  for (let i = 1; i < recentHeights.length; i++) {
    const diff = Math.abs(recentHeights[i].height - recentHeights[i-1].height);
    maxDiff = Math.max(maxDiff, diff);
  }
  
  // If the max difference is small, consider it stable
  if (maxDiff <= config.movementThreshold) {
    // Return the time since the oldest of the stable readings
    return heightHistory[heightHistory.length-1].time - recentHeights[0].time;
  }
  
  return 0;
}

/**
 * Handles a player falling below the threshold. If the player is in cooldown, it will not respawn.
 * @param {Object} player - The player object
 */
function handlePlayerFall(player) {
  let respawnPosition = new Vector3(lastSafePosition.x, lastSafePosition.y, lastSafePosition.z);
  
  logDebug(`Using last safe position for respawn: ${vectorToString(respawnPosition)}`);
  
  logDebug(`Player fell. Respawning to: ${vectorToString(respawnPosition)}`);
  player.teleport(respawnPosition);
  playRespawnSound();
}

/**
 * Play respawn sound if enabled
 */
function playRespawnSound() {
  if (sound && config.soundEnabled) {
    sound.play();
    logDebug('Playing respawn sound');
  }
}

initializeRespawn();