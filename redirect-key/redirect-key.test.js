// redirect-key.test.js
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert');
const { test, mock } = require('node:test');

// Path to the redirect-key script
const redirectKeyScriptPath = path.join(__dirname, 'redirect-key.js');
const redirectKeyScript = fs.readFileSync(redirectKeyScriptPath, 'utf8');

// Modified script that captures variables
const modifiedRedirectKeyScript = `
${redirectKeyScript}

// Make sure global variables are accessible in the context
this.node = node;
this.sound = sound;
this.initialize = initialize;
this.updatePosition = updatePosition;
this.playSound = playSound;
this.handleRedirect = handleRedirect;
this.updateRotation = updateRotation;
`;

// Test setup function
function setupTest(customConfig = {}) {
  // Create a new context for this test
  const context = {
    // Mock node
    MockNode: class MockNode {
      constructor(name) {
        this.name = name;
        this.position = {
          x: 0, y: 0, z: 0,
          set: (x, y, z) => {
            this.position.x = x;
            this.position.y = y;
            this.position.z = z;
          }
        };
        this.rotation = { y: 0 };
        this.children = [];
        this.add = (child) => {
          this.children.push(child);
        };
      }
    },
    
    // Mock app
    app: {
      configure: mock.fn(),
      get: mock.fn(),
      create: mock.fn((type, options) => {
        if (type === 'audio') {
          return {
            play: mock.fn(),
            type: 'audio',
            ...options
          };
        } else if (type === 'action') {
          return {
            isAction: true,
            type: 'action',
            ...options
          };
        }
        return {};
      }),
      on: mock.fn(),
      off: mock.fn()
    },
    
    // Mock world
    world: {
      open: mock.fn(),
      lastUrl: null,
      lastNewWindow: null
    },
    
    // Other required globals
    console: console,
    
    // Test config
    config: {
      nodeName: 'TestNode',
      debugMode: true,
      nodeX: 10,
      nodeY: 20, 
      nodeZ: 30,
      isRotationEnabled: true,
      rotationSpeed: 0.01,
      soundEnabled: true,
      soundUrl: { url: 'test-sound.mp3' },
      soundVolume: 0.5,
      redirectType: 'external',
      destinationUrl: 'https://example.com',
      openInNewWindow: false,
      redirectLabel: 'Test Redirect',
      triggerDistance: 2,
      ...customConfig
    },
  };
  
  // Setup default node mock
  const mockNode = new context.MockNode('TestNode');
  context.app.get.mock.mockImplementation((nodeName) => {
    if (nodeName === 'TestNode') return mockNode;
    return null;
  });
  
  // Setup world.open mock to capture URL and window setting
  context.world.open.mock.mockImplementation((url, newWindow) => {
    context.world.lastUrl = url;
    context.world.lastNewWindow = newWindow;
  });
  
  // Create a script context
  const scriptContext = vm.createContext(context);
  
  try {
    // Run the modified script in this isolated context
    vm.runInContext(modifiedRedirectKeyScript, scriptContext);
  } catch (error) {
    console.error("Error running script:", error);
  }
  
  return context;
}

test('redirect component initializes correctly', (t) => {
  const context = setupTest();
  
  // Check event listener for rotation
  assert.strictEqual(context.app.on.mock.calls.length, 1);
  assert.strictEqual(context.app.on.mock.calls[0].arguments[0], 'update');
  
  // Check node is retrieved correctly
  assert.ok(context.node);
  
  // Check node position is set correctly
  assert.strictEqual(context.node.position.x, 10);
  assert.strictEqual(context.node.position.y, 20);
  assert.strictEqual(context.node.position.z, 30);
  
  // Check that sound was created
  assert.ok(context.sound);
  
  // Check that node has 2 children (sound and action)
  assert.strictEqual(context.node.children.length, 2);
  
  // Check that one child is an action
  const actionChild = context.node.children.find(child => child.isAction);
  assert.ok(actionChild);
  assert.strictEqual(actionChild.label, 'Test Redirect');
  assert.strictEqual(actionChild.distance, 2);
});

test('redirect component handles missing node', (t) => {
  // Setup test with non-existent node name
  const context = setupTest({ nodeName: 'NonExistentNode' });
  context.app.get.mock.mockImplementation(() => null);
  
  // Try to initialize again (the script ran once automatically)
  const result = context.initializeRedirect();
  
  // Should return false due to error
  assert.strictEqual(result, false);
});

test('redirect component updates position correctly', (t) => {
  const context = setupTest();
  
  // Change position in config and update
  context.config.nodeX = 100;
  context.config.nodeY = 200;
  context.config.nodeZ = 300;
  
  // Call the update position function
  context.updatePosition();
  
  // Check positions were updated
  assert.strictEqual(context.node.position.x, 100);
  assert.strictEqual(context.node.position.y, 200);
  assert.strictEqual(context.node.position.z, 300);
});

test('redirect component updates rotation', (t) => {
  const context = setupTest();
  const initialRotation = context.node.rotation.y;
  
  // Get the update function that was registered
  const updateFn = context.app.on.mock.calls[0].arguments[1];
  
  // Call the rotation update function with a delta
  updateFn(1/60); // one frame at 60 FPS
  
  // Check that rotation increased
  assert.ok(context.node.rotation.y > initialRotation);
  assert.strictEqual(
    context.node.rotation.y, 
    initialRotation + (context.config.rotationSpeed * 1),
    'Rotation should increase by rotationSpeed amount'
  );
});

test('redirect component handles redirect correctly', (t) => {
  const context = setupTest();
  
  // Call redirect handler
  context.handleRedirect();
  
  // Check that world.open was called with correct URL
  assert.strictEqual(context.world.open.mock.calls.length, 1);
  assert.strictEqual(context.world.lastUrl, 'https://example.com');
  assert.strictEqual(context.world.lastNewWindow, false);
});

test('redirect component plays sound', (t) => {
  const context = setupTest();
  
  // Reset calls on sound's play method
  context.sound.play.mock.resetCalls();
  
  // Call playSound function
  context.playSound();
  
  // Check that sound's play method was called
  assert.strictEqual(context.sound.play.mock.calls.length, 1);
});

test('redirect component handles sound errors gracefully', (t) => {
  const context = setupTest();
  
  // Make sound.play throw an error
  context.sound.play.mock.mockImplementation(() => {
    throw new Error('Test error');
  });
  
  // Call playSound - should not throw
  assert.doesNotThrow(() => {
    context.playSound();
  });
});

test('redirect component works with sound disabled', (t) => {
  const context = setupTest({ soundEnabled: false });
  
  // Shouldn't have sound when disabled
  assert.strictEqual(context.sound, null);
  
  // Should not throw when trying to play non-existent sound
  assert.doesNotThrow(() => {
    context.playSound();
  });
});

test('redirect component works without destination URL', (t) => {
  const context = setupTest({ 
    redirectType: 'external',
    destinationUrl: null 
  });
  
  // Call redirect
  context.handleRedirect();
  
  // Should not call world.open
  assert.strictEqual(context.world.open.mock.calls.length, 0);
});

test('redirect component handles different redirect types', (t) => {
  const context = setupTest({ 
    redirectType: 'internal' // Not external
  });
  
  // Call redirect
  context.handleRedirect();
  
  // Should not call world.open for non-external types
  assert.strictEqual(context.world.open.mock.calls.length, 0);
});