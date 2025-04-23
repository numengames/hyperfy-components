# Teleport Listener Component for Hyperfy

This component implements a signal receiver for teleportation that responds to events emitted by a transmitter, allowing you to create modular and decoupled teleportation systems.

## Features

- Teleportation signal receiver system
- Automatic operation based on signals
- Rotation animation with adjustable speed
- Flexible node configuration
- Full compatibility with the emitter system
- Comprehensive debugging options
- Configurable as visible or invisible

## How It Works

The teleport-listener component acts as a receiver that listens for specific signals in your Hyperfy world:

1. When it receives a signal with the configured ID, it automatically teleports the specified player
2. It integrates with the emitter system (such as the `emitter.js` component)
3. It can be placed anywhere in the world, independent of the emitter's location
4. The player is teleported to the exact position of the receiver

The component is designed to create a modular teleportation system where emitters and receivers are decoupled, allowing for greater flexibility in your world design.

## Usage

1. Add the teleport-listener component to your Hyperfy world
2. Configure the base name for your teleportation node
3. Configure the signal ID that it will listen for (must match the ID used by the emitter)
4. Customize appearance, rotation, and visibility options as needed
5. The component will automatically teleport players when it receives the corresponding signal

## Configuration Options

### Basic Settings
- **Base node name**: Name for the teleportation node
- **Debug Mode**: Toggle debug messages (On/Off)
- **Visibility Type**: Configure whether the teleportation node will be visible or invisible

### Rotation Settings
- **Enable Rotation**: Toggle node rotation animation
- **Rotation Speed**: Control the rotation speed

### Signal Settings
- **Signal ID**: ID of the signal that the receiver will listen for (must match the ID configured in the emitter)

## Integration with Emitter System

The teleport-listener is designed to work in conjunction with any component that emits signals, particularly with the `emitter.js` component:

### Integration Requirements
- The emitter must send a signal with the same ID configured in the receiver
- The signal must include a `playerId` field that identifies the player to teleport
- For full functionality, use the `emitter.js` component as the emitter

### Expected Signal Structure
```javascript
{
  playerId: "player-id",      // ID of the player to teleport (required)
  timestamp: 1234567890,      // Timestamp (optional)
  source: "emitter-name"      // Signal source (optional)
}
```

## Advanced Features

### Signal Validation System

The component includes a sophisticated signal validation system:

- Verifies that the signal contains a valid player ID
- Confirms that the player is present in the world
- Provides detailed debug messages when a signal cannot be processed
- Gracefully handles invalid signals without causing errors

### Compatibility with Multiple Emitters

A single receiver can listen for signals from multiple emitters as long as:
- The emitters use the same signal ID
- The signals include the necessary data (playerId)

## Use Cases

- Create a decoupled teleportation system with separate emitters and receivers
- Implement teleportation activated by buttons or automatic triggers
- Design transportation systems with multiple destinations
- Create one-way or two-way portals between areas
- Build elevator systems with multiple stops

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. For best results, use objects with a clear visual indication of being a teleportation destination.

## Using with emitter.js

To create a complete teleportation system:

1. Add the `emitter.js` component to your world (emitter)
2. Configure the emitter with a unique signal ID
3. Add the `teleport-listener.js` component to your world (receiver)
4. Configure the receiver with the same signal ID as the emitter
5. Done! When the emitter is activated, it will teleport the player to the receiver

## Download

You can download the latest version of the Teleport Listener component here:

- [teleport-listener_20250411.hyp](https://statics.numinia.xyz/hyperfy-components/teleport-listener_20250411.hyp) - Latest version of the teleportation receiver

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor. 