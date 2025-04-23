const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert');
const { test, mock } = require('node:test');

// Path to the teleport-listener script (cambiado de teleport-auto)
const teleportListenerScriptPath = path.join(__dirname, 'teleport-listener.js');
const teleportListenerScript = fs.readFileSync(teleportListenerScriptPath, 'utf8');

// Modified script that captures variables
const modifiedTeleportListenerScript = `
${teleportListenerScript}

// Make sure global variables are accessible in the context
this.logDebug = logDebug;
this.getPortalNode = getPortalNode;
this.setupRotationIfEnabled = setupRotationIfEnabled;
this.teleport = teleport;
this.setupVisibility = setupVisibility;
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
      get: mock.fn(),
      on: mock.fn(),
      configure: mock.fn(),
      config: {
        nodeName: 'TeleportPortal',
        isRotationEnabled: true,
        rotationSpeed: 0.01,
        signalId: 'teleport-triggered',
        visibleType: 'visible',
        debugMode: true
      }
    },
    
    // Mock world
    world: {
      getPlayer: mock.fn((id) => {
        return new context.MockPlayer(id, 5, 5, 5);
      }),
      on: mock.fn(),
      emit: mock.fn(),
    },
    
    // Other required globals
    console: {
      log: mock.fn(),
      error: mock.fn()
    },
    
    // Test config
    config: {
      debugMode: true,
      nodeName: 'TeleportPortal',
      isRotationEnabled: true,
      rotationSpeed: 0.01,
      signalId: 'teleport-triggered',
      visibleType: 'visible',
      ...customConfig
    },
  };
  
  // Setup mock portal node
  const mockPortalNode = {
    name: 'TeleportPortal',
    position: {
      x: 0, y: 0, z: 0
    },
    rotation: {
      y: 0
    },
    visible: true,
    matrixWorld: {
      toArray: () => [0,0,0,0, 0,0,0,0, 0,0,0,0, 100,200,300,1] // Last 3 values are the position
    }
  };
  
  context.app.get.mock.mockImplementation((nodeName) => {
    if (nodeName === 'TeleportPortal') return mockPortalNode;
    return null;
  });
  
  // Create a script context
  const scriptContext = vm.createContext(context);
  
  try {
    // Run the modified teleport script in this isolated context
    vm.runInContext(modifiedTeleportListenerScript, scriptContext);
  } catch (error) {
    console.error("Error running script:", error);
  }
  
  return context;
}

test('app handles missing node', (t) => {
  // Create a context with a non-existent node name
  const context = setupTest({ nodeName: 'NonExistentNode' });
  
  // Make app.get return null to simulate missing node
  context.app.get.mock.mockImplementation(() => null);
  
  // Reset console.error mock to track calls
  context.console.error.mock.resetCalls();
  
  try {
    // Run the script in the context (it should throw an error but be caught)
    vm.runInContext(modifiedTeleportListenerScript, vm.createContext(context));
    
    // Check that the error was logged to console
    assert.strictEqual(context.console.error.mock.calls.length, 1);
    assert.ok(context.console.error.mock.calls[0].arguments[0].includes('initialization failed'));
    assert.ok(context.console.error.mock.calls[0].arguments[1].includes('not found in scene'));
  } catch (error) {
    assert.fail(`Test should not throw: ${error.message}`);
  }
});

test('the signal does not contain playerId and is not processed', (t) => {
  const context = setupTest();
  
  // Reset the world.on mock
  context.world.on.mock.resetCalls();
  
  // Reset player teleport mock
  const player = new context.MockPlayer('test-player-id');
  context.world.getPlayer.mock.mockImplementation(() => player);
  
  // Run the script to set up the signal listener
  vm.runInContext(modifiedTeleportListenerScript, vm.createContext(context));
  
  // Verify the correct signal was registered
  assert.strictEqual(context.world.on.mock.calls.length, 1);
  assert.strictEqual(context.world.on.mock.calls[0].arguments[0], context.config.signalId);
  
  // Get the signal handler function
  const signalHandler = context.world.on.mock.calls[0].arguments[1];
  
  // Call the handler with an incorrect signal structure
  signalHandler({ 
    // Missing playerId which is required
    source: 'different-source',
    timestamp: Date.now()
  });
  
  // The player teleport function should not be called when playerId is missing
  assert.strictEqual(player.teleport.mock.calls.length, 0);
});

test('the signal is processed correctly and the player is teleported', (t) => {
  const context = setupTest();
  
  // Reset the world.on mock
  context.world.on.mock.resetCalls();
  
  // Create a mock player
  const player = new context.MockPlayer('test-player-id');
  context.world.getPlayer.mock.mockImplementation((id) => {
    if (id === 'test-player-id') return player;
    return null;
  });
  
  // Run the script to set up the signal listener
  vm.runInContext(modifiedTeleportListenerScript, vm.createContext(context));
  
  // Get the signal handler function
  const signalHandler = context.world.on.mock.calls[0].arguments[1];
  
  // Create valid signal data with player ID
  const signalData = {
    playerId: 'test-player-id',
    source: 'teleport-listener',
    timestamp: Date.now()
  };
  
  // Call the handler with the signal data
  signalHandler(signalData);
  
  // Verify the player teleport function was called
  assert.strictEqual(player.teleport.mock.calls.length, 1);
  
  // Verify the teleport destination matches the portal's world position
  const teleportArg = player.teleport.mock.calls[0].arguments[0];
  assert.ok(teleportArg instanceof context.Vector3);
  assert.strictEqual(teleportArg.x, 100);
  assert.strictEqual(teleportArg.y, 200);
  assert.strictEqual(teleportArg.z, 300);
});