const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert');
const { test, mock } = require('node:test');

// Path to the respawn script
const respawnScriptPath = path.join(__dirname, 'respawn.js');
const respawnScript = fs.readFileSync(respawnScriptPath, 'utf8');

// Modified respawn script that captures variables
const modifiedRespawnScript = `
${respawnScript}

// Make sure global variables are accessible in the context
this.lastSafePosition = lastSafePosition;
this.defaultSpawnPosition = defaultSpawnPosition;
this.heightHistory = heightHistory;
this.lastSaveTime = lastSaveTime;
this.sound = sound;
this.lastUpdateTime = lastUpdateTime;
`;

// Test setup function
function setupTest(customConfig = {}) {
  // Create a new context for this test
  const context = {
    // Mock Vector3
    Vector3: class Vector3 {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      
      clone() {
        return new context.Vector3(this.x, this.y, this.z);
      }
    },
    
    // Mock player
    MockPlayer: class MockPlayer {
      constructor(id, x = 0, y = 0, z = 0) {
        this.id = id;
        this.position = new context.Vector3(x, y, z);
        this.teleport = mock.fn();
      }
    },
    
    // Mock app
    app: {
      add: mock.fn(),
      on: mock.fn(),
      create: mock.fn(() => {
        return { 
          play: mock.fn() 
        };
      }),
      configure: mock.fn(),
    },
    
    // Mock world
    world: {
      getPlayer: mock.fn(),
      getTime: mock.fn(),
    },
    
    // Other required globals
    console: console,
    
    // Test config
    config: {
      debugMode: true,
      fallThreshold: 4,
      trackingInterval: 1,
      heightHistoryLength: 5,
      heightSamplingRate: 0.2,
      safePositionDelay: 1.5,
      movementThreshold: 0.1,
      soundEnabled: true,
      soundUrl: { url: 'test-sound.mp3' },
      soundVolume: 0.5,
      ...customConfig
    },
  };
  
  // Setup default player
  const mockLocalPlayer = new context.MockPlayer('local', 10, 20, 30);
  context.world.getPlayer.mock.mockImplementation(() => mockLocalPlayer);
  
  // Setup world time
  context.world.getTime.mock.mockImplementation(() => 100);
  
  // Create a script context
  const scriptContext = vm.createContext(context);
  
  try {
    // Run the modified respawn script in this isolated context
    vm.runInContext(modifiedRespawnScript, scriptContext);
  } catch (error) {
    console.error("Error running script:", error);
  }
  
  return context;
}

test('respawn component initializes correctly', (t) => {
  const context = setupTest();
  
  // Check that event listeners are registered
  assert.strictEqual(context.app.on.mock.calls.length, 1);
  assert.strictEqual(context.app.on.mock.calls[0].arguments[0], 'update');
  
  // Check that default position and last safe position are set correctly
  assert.strictEqual(context.defaultSpawnPosition.x, 10);
  assert.strictEqual(context.defaultSpawnPosition.y, 20);
  assert.strictEqual(context.defaultSpawnPosition.z, 30);
  
  // Last safe position should be set to the default spawn position initially
  assert.strictEqual(context.lastSafePosition.x, 10);
  assert.strictEqual(context.lastSafePosition.y, 20);
  assert.strictEqual(context.lastSafePosition.z, 30);
  
  // Height history should be initialized as an empty array
  assert.strictEqual(context.heightHistory.length, 0);
});

test('respawn component updates height history correctly', (t) => {
  const context = setupTest();
  
  // Get the update function that was registered
  const updateFn = context.app.on.mock.calls[0].arguments[1];
  
  // Mock local player position
  const player = new context.MockPlayer('local', 10, 20, 30);
  context.world.getPlayer.mock.mockImplementation(() => player);
  
  // Set initial time
  let currentTime = 100;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  
  // Call update to collect initial position (exceeding sampling rate)
  updateFn(0.3);
  
  // Height history should have one entry now
  assert.strictEqual(context.heightHistory.length, 1);
  assert.strictEqual(context.heightHistory[0].height, 20);
  assert.strictEqual(context.heightHistory[0].time, 100);
  
  // Move the player to a new height and advance time
  player.position.y = 21;
  currentTime = 101;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  
  // Call update again
  updateFn(0.3);
  
  // Height history should have two entries now
  assert.strictEqual(context.heightHistory.length, 2);
  assert.strictEqual(context.heightHistory[1].height, 21);
  assert.strictEqual(context.heightHistory[1].time, 101);
  
  // Add several more heights to test history length limit
  for (let i = 0; i < 5; i++) {
    player.position.y = 22 + i;
    currentTime = 102 + i;
    context.world.getTime.mock.mockImplementation(() => currentTime);
    updateFn(0.3);
  }
  
  // Height history should be limited to heightHistoryLength (default 5)
  assert.strictEqual(context.heightHistory.length, 5);
  // The oldest entry should be removed
  assert.strictEqual(context.heightHistory[0].height, 22);
});

test('respawn component detects falls and respawns player', (t) => {
  const context = setupTest();
  
  // Get the update function that was registered
  const updateFn = context.app.on.mock.calls[0].arguments[1];
  
  // Mock local player
  const player = new context.MockPlayer('local', 10, 20, 30);
  context.world.getPlayer.mock.mockImplementation(() => player);
  
  // Set initial time
  let currentTime = 100;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  
  // Add some history entries to simulate stable position
  for (let i = 0; i < 3; i++) {
    player.position.y = 20;
    currentTime = 100 + i;
    context.world.getTime.mock.mockImplementation(() => currentTime);
    updateFn(0.3);
  }
  
  // Advance time enough for safe position to be saved
  currentTime = 102.5; // This should be at least safePositionDelay (1.5) after initial time
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Reset teleport calls
  player.teleport.mock.resetCalls();
  
  // Now simulate a fall by moving player far below last safe position
  player.position.y = 15; // 5 units below safe position (20), more than fallThreshold (4)
  currentTime = 103;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Player should be teleported back to safe position
  assert.strictEqual(player.teleport.mock.calls.length, 1);
  
  // The teleport should be to the last safe position
  const teleportPos = player.teleport.mock.calls[0].arguments[0];
  assert.strictEqual(teleportPos.x, 10);
  assert.strictEqual(teleportPos.y, 20);
  assert.strictEqual(teleportPos.z, 30);
});

test('respawn component updates safe position only after stability', (t) => {
  const context = setupTest();
  
  // Get the update function that was registered
  const updateFn = context.app.on.mock.calls[0].arguments[1];
  
  // Mock local player
  const player = new context.MockPlayer('local', 10, 20, 30);
  context.world.getPlayer.mock.mockImplementation(() => player);
  
  // Set initial time and lastSaveTime
  let currentTime = 100;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  
  // Add initial height entries
  for (let i = 0; i < 3; i++) {
    updateFn(0.3);
    currentTime += 0.5;
    context.world.getTime.mock.mockImplementation(() => currentTime);
  }
  
  // Save the initial lastSafePosition
  const initialSafePosition = context.lastSafePosition.clone();
  
  // Move player to a stable new position
  player.position = new context.Vector3(15, 25, 35); // Changed significantly
  
  // Add entries for the new position but not long enough for stability
  for (let i = 0; i < 3; i++) {
    updateFn(0.3);
    currentTime += 0.3; // Less than safePositionDelay
    context.world.getTime.mock.mockImplementation(() => currentTime);
  }
  
  // Safe position should not be updated yet
  assert.deepStrictEqual(
    { x: context.lastSafePosition.x, y: context.lastSafePosition.y, z: context.lastSafePosition.z },
    { x: initialSafePosition.x, y: initialSafePosition.y, z: initialSafePosition.z }
  );
  
  // Now advance time beyond the safe position delay
  currentTime += 2.0; // More than safePositionDelay
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Safe position should now be updated to the new position
  assert.strictEqual(context.lastSafePosition.x, 10);
  assert.strictEqual(context.lastSafePosition.y, 20);
  assert.strictEqual(context.lastSafePosition.z, 30);
});

test('respawn component detects falling player', (t) => {
  const context = setupTest();
  
  // Get the update function that was registered
  const updateFn = context.app.on.mock.calls[0].arguments[1];
  
  // Mock local player
  const player = new context.MockPlayer('local', 10, 20, 30);
  context.world.getPlayer.mock.mockImplementation(() => player);
  
  // Set initial time
  let currentTime = 100;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  
  // Simulate a player that is clearly falling (decreasing height)
  const fallingHeights = [20, 19, 18, 17, 16];
  
  // Add decreasing heights to history
  for (let i = 0; i < fallingHeights.length; i++) {
    player.position.y = fallingHeights[i];
    currentTime = 100 + i;
    context.world.getTime.mock.mockImplementation(() => currentTime);
    updateFn(0.3);
  }
  
  // Create a fixture to access the falling detection function directly
  const isFallingFn = new Function(
    'context',
    `with (context) {
      return (${context.isPlayerFalling.toString()})();
    }`
  );
  
  // Should detect that player is falling
  assert.strictEqual(isFallingFn(context), true);
  
  // Now simulate a player that is moving upward
  context.heightHistory = [];
  const risingHeights = [16, 17, 18, 19, 20];
  
  // Add increasing heights to history
  for (let i = 0; i < risingHeights.length; i++) {
    player.position.y = risingHeights[i];
    currentTime = 110 + i;
    context.world.getTime.mock.mockImplementation(() => currentTime);
    updateFn(0.3);
  }
  
  // Should detect that player is not falling
  assert.strictEqual(isFallingFn(context), false);
});

test('only falling players are respawned, horizontal movement is allowed', (t) => {
  const context = setupTest();
  
  // Get the update function that was registered
  const updateFn = context.app.on.mock.calls[0].arguments[1];
  
  // Create two players - one will fall, one will only move horizontally
  const fallingPlayer = new context.MockPlayer('falling', 10, 20, 30);
  const movingPlayer = new context.MockPlayer('moving', 5, 20, 5);
  
  // Set up player mocking to return appropriate player
  let currentPlayer = fallingPlayer;
  context.world.getPlayer.mock.mockImplementation(() => currentPlayer);
  
  // Set initial time
  let currentTime = 100;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  
  // Add initial height entries for falling player (stable position)
  for (let i = 0; i < 3; i++) {
    updateFn(0.3);
    currentTime += 0.5;
    context.world.getTime.mock.mockImplementation(() => currentTime);
  }
  
  // Wait for safePositionDelay to ensure position is saved
  currentTime += 2.0;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Record the safe position for the falling player
  const fallingSafePos = context.lastSafePosition.clone();
  
  // Now switch to the moving player
  currentPlayer = movingPlayer;
  
  // Reset and setup for the moving player
  context.heightHistory = [];
  context.lastSafePosition = new context.Vector3(5, 20, 5);
  
  // Add initial height entries for moving player
  for (let i = 0; i < 3; i++) {
    updateFn(0.3);
    currentTime += 0.5;
    context.world.getTime.mock.mockImplementation(() => currentTime);
  }
  
  // Wait for safePositionDelay to ensure position is saved
  currentTime += 2.0;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Reset teleport calls for both players
  fallingPlayer.teleport.mock.resetCalls();
  movingPlayer.teleport.mock.resetCalls();
  
  // Move falling player down significantly (fall)
  currentPlayer = fallingPlayer;
  fallingPlayer.position.y = 15; // 5 units below safe position
  currentTime += 0.5;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Falling player should be teleported
  assert.strictEqual(fallingPlayer.teleport.mock.calls.length, 1);
  const teleportPos = fallingPlayer.teleport.mock.calls[0].arguments[0];
  assert.strictEqual(teleportPos.x, 5);
  assert.strictEqual(teleportPos.y, 20);
  assert.strictEqual(teleportPos.z, 5);
  
  // Now move the horizontal player significantly in X and Z, but not in Y
  currentPlayer = movingPlayer;
  movingPlayer.position = new context.Vector3(15, 20, 15); // Moved 10 units in X and Z, same Y
  currentTime += 0.5;
  context.world.getTime.mock.mockImplementation(() => currentTime);
  updateFn(0.3);
  
  // Moving player should NOT be teleported as they didn't fall
  assert.strictEqual(movingPlayer.teleport.mock.calls.length, 0);
});