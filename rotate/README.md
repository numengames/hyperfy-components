# Rotate Controller for Hyperfy

This component provides smooth 3D object rotation animations with configurable speed, delays, and event-driven control for creating dynamic rotation effects in your Hyperfy world.

## Features

- **Smooth Rotation Animations**: Rotate 3D objects smoothly around X, Y, and Z axes
- **Configurable Speed**: Control animation speed with precise radians-per-frame settings
- **Event-Driven Control**: Start, pause, resume, and reset rotations through events
- **Continuous Rotation**: Rotate objects continuously without stopping
- **Multi-Axis Support**: Rotate objects on single or multiple axes simultaneously
- **Dynamic Parameters**: Override default settings with runtime parameters
- **Collision Synchronization**: Keep visual mesh and physics rigidbody in sync
- **Delay Support**: Add delays before starting rotations for timed sequences
- **Reset Functionality**: Quickly return objects to their initial rotation
- **Debug Mode**: Built-in logging for troubleshooting rotation issues

## How It Works

The Rotate Controller animates 3D objects by smoothly interpolating their rotation over time. It can:

1. **Receive Events** - Listen for rotation control events (start, pause, resume, reset)
2. **Process Parameters** - Use dynamic parameters or fall back to configured defaults
3. **Apply Delays** - Wait before starting rotations for synchronized effects
4. **Animate Smoothly** - Rotate objects frame-by-frame with configurable speed
5. **Sync Physics** - Keep visual mesh and collision rigidbody synchronized
6. **Handle States** - Manage rotation states (playing, paused, stopped)

The component intelligently handles both visual mesh and physics rigidbody, ensuring they rotate together smoothly without visual glitches.

## Usage

1. Add the rotate component to any 3D object in your Hyperfy world
2. Configure the target node name to point to the object you want to rotate
3. Set up rotation parameters (speed, target angles, delays)
4. Configure event listeners to control rotations from other components
5. The component will smoothly rotate the object when triggered

## Configuration Options

### Basic Settings
- **appID**: Unique identifier for this app instance (auto-generated)
- **Node name**: The name of the 3D node in your scene to rotate
- **Debug Mode**: Enable detailed logging for troubleshooting
- **Add Collision**: Automatically add collision to all meshes in the model
- **Visible?**: Initial visibility state when the app starts

### Animation Settings
- **Sync Changes**: Synchronize rotation changes across all connected clients (default: disabled)
- **Use Delay**: Enable delay before starting rotations (default: disabled)
- **Delay (sec)**: Time to wait before starting rotations, 0.1 to 60 seconds (default: 0)
- **Signal ID**: Unique identifier for triggering rotations from external sources

### Rotation Settings
- **Enable Rotation**: Enable rotation animations (default: true)
- **Rotation Delay (sec)**: Delay before starting rotation animation (default: 0)
- **Rotation Speed (radians/frame)**: Speed of animation in radians per frame (default: 0.01)
- **X Rotation (degrees)**: Target X rotation in degrees (default: 0)
- **Y Rotation (degrees)**: Target Y rotation in degrees (default: 0)
- **Z Rotation (degrees)**: Target Z rotation in degrees (default: 0)
- **Accept Any Event**: Allow receiving events from any emitter (default: disabled)
- **Event Listeners**: JSON array of event configurations

## Event Configuration

The Event Listeners property accepts a JSON array defining which events to listen for and how to respond:

```json
[
  {
    "id": "rotateObj123",
    "actions": [
      {
        "type": "set-rotation",
        "params": {
          "rotationY": 90,
          "rotationSpeed": 0.02,
          "delay": 0
        }
      }
    ]
  }
]
```

### Event Parameters

Each event configuration has:
- **id**: The event name to listen for (required)
- **actions**: Array of actions to execute when the event is received (required)
  - **type**: Action type - supports `"set-rotation"`, `"pause-rotation"`, `"resume-rotation"`, `"reset-rotation"` (required)
  - **params**: Parameters for the action (optional)

### Action Types

| Action | Description | Parameters |
|--------|-------------|------------|
| `set-rotation` | Start rotation animation | `rotationX`, `rotationY`, `rotationZ`, `rotationSpeed`, `delay` |
| `pause-rotation` | Pause current animation | None |
| `resume-rotation` | Resume paused animation | None |
| `reset-rotation` | Reset to initial rotation | `resetSpeed` (optional) |
| `continuous-rotation` | Start continuous rotation | `continuousSpeedX`, `continuousSpeedY`, `continuousSpeedZ`, `delay` |
| `stop-continuous-rotation` | Stop continuous rotation | None |

### Set-Rotation Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rotationX` | number | props value | Target X rotation in degrees |
| `rotationY` | number | props value | Target Y rotation in degrees |
| `rotationZ` | number | props value | Target Z rotation in degrees |
| `rotationSpeed` | number | props value | Animation speed (radians/frame) |
| `delay` | number | 0 | Delay before starting animation |

### Continuous-Rotation Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `continuousSpeedX` | number | 0 | Continuous X rotation speed (radians/frame) |
| `continuousSpeedY` | number | 0 | Continuous Y rotation speed (radians/frame) |
| `continuousSpeedZ` | number | 0 | Continuous Z rotation speed (radians/frame) |
| `delay` | number | 0 | Delay before starting continuous rotation |

## Example Use Cases

### Rotating Platform

**Button Configuration:**
Emit event `rotatePlat789` when pressed

**Rotate Controller Configuration:**
```json
[
  {
    "id": "rotatePlat789",
    "actions": [
      {
        "type": "set-rotation",
        "params": {
          "rotationY": 180,
          "rotationSpeed": 0.02
        }
      }
    ]
  }
]
```

### Spinning Wheel

**Configuration:**
- **Y Rotation**: `360` (full rotation)
- **Rotation Speed**: `0.05` (fast spinning)
- **Rotation Delay**: `0` (immediate start)

### Oscillating Fan

**Configuration:**
```json
{
  "rotationX": 45,
  "rotationSpeed": 0.01,
  "delay": 0.5
}
```

### Multi-Axis Rotation

**Configuration:**
```json
{
  "rotationX": 90,
  "rotationY": 180,
  "rotationZ": 45,
  "rotationSpeed": 0.015
}
```

### Reset Mechanism

**Reset Button Configuration:**
```json
[
  {
    "id": "resetRot123",
    "actions": [
      {
        "type": "reset-rotation",
        "params": {
          "resetSpeed": 0.05
        }
      }
    ]
  }
]
```

### Continuous Rotation Examples

**Spinning Fan:**
```json
[
  {
    "id": "spinFan123",
    "actions": [
      {
        "type": "continuous-rotation",
        "params": {
          "continuousSpeedY": 0.05
        }
      }
    ]
  }
]
```

**Rotating Wheel:**
```json
[
  {
    "id": "wheelRot456",
    "actions": [
      {
        "type": "continuous-rotation",
        "params": {
          "continuousSpeedX": 0.03,
          "continuousSpeedZ": 0.02
        }
      }
    ]
  }
]
```

**Stop Continuous Rotation:**
```json
[
  {
    "id": "stopRot789",
    "actions": [
      {
        "type": "stop-continuous-rotation",
        "params": {}
      }
    ]
  }
]
```

## Server-Client Communication

The Rotate Controller supports seamless communication between server and client instances:

### Accept Any Event Mode

When `Accept Any Event` is enabled, the component can receive events from any emitter that targets the appID directly. This is particularly useful for:

- **Unknown or generative apps** that need to trigger rotations
- **Dynamic event sources** where the emitter ID is not known in advance
- **Cross-component communication** without pre-configuring specific event IDs

### Server-to-Client Broadcasting

When running on the server with `Accept Any Event` enabled:

1. **Server receives event** on the appID
2. **Server broadcasts** the event to all clients using `rotate-server-to-client`
3. **Clients receive** the broadcasted event and execute the rotation
4. **Synchronized rotation** across all connected players

This ensures that rotation events triggered on the server are properly synchronized across all clients in the multiplayer environment.

### Event Flow Example

```
External Emitter → Server AppID → Server Broadcast → All Clients → Rotation Execution
```

This pattern is essential for maintaining consistent rotation states in multiplayer scenarios where one player's action should affect all players' views.

## Advanced Features

### Dynamic Parameter Override

You can override default settings at runtime:

```javascript
// Rotate faster than configured
world.emit('rotateObj123', {
  rotationY: 90,
  rotationSpeed: 0.05  // Override default speed
});

// Rotate to different angles
world.emit('rotateObj123', {
  rotationX: 45,
  rotationY: 90,
  rotationZ: 135
});
```

### Animation State Management

The component tracks animation states:

- **isAnimating**: Overall animation state (true when any animation is active)
- **isRotationAnimating**: Target-based rotation state (can be paused/resumed)
- **isContinuousRotation**: Continuous rotation state (rotates indefinitely until stopped)

### Collision Synchronization

When collision is enabled, the component:
1. Calculates offset between visual mesh and physics rigidbody
2. Applies the same rotation to both elements
3. Maintains synchronization throughout the animation

### Reset Functionality

The reset action:
1. Stores initial rotation when component starts
2. Animates back to initial rotation with fast speed
3. Uses configurable `resetSpeed` (default: 0.05 radians/frame)

## Troubleshooting

### Rotation not starting
- Verify **Enable Rotation** is set to `true`
- Check that event `id` matches exactly what other components are emitting
- Ensure the Event Listeners JSON is valid
- Check Debug Mode logs for detailed information

### Rotation too fast/slow
- Adjust **Rotation Speed** (lower = slower, higher = faster)
- Use `rotationSpeed` parameter in events for runtime control
- Typical range: 0.005 (very slow) to 0.05 (fast)

### Object not rotating smoothly
- Check that **Rotation Speed** is not too high
- Verify the target rotation is different from current rotation
- Enable Debug Mode to see rotation progress

### Collision issues
- Enable **Add Collision** if the object needs physics
- Check that both mesh and rigidbody are rotating together
- Verify collision setup in Debug Mode logs

### Delay not working
- Enable **Use Delay** in settings
- Set **Delay (sec)** to a value greater than 0
- Or use `delay` parameter in event params

## Best Practices

1. **Test speeds**: Start with slow speeds (0.005-0.01) and adjust as needed
2. **Use delays**: Add small delays (0.5-1s) for smoother sequences
3. **Plan rotations**: Consider the object's initial rotation when setting targets
4. **Debug during development**: Enable Debug Mode to understand rotation behavior
5. **Name events clearly**: Use descriptive event names with appID suffixes
6. **Test collision**: Verify collision works correctly with rotated objects
7. **Consider multiplayer**: Test behavior with multiple connected clients
8. **Continuous rotation**: Use for objects that should rotate indefinitely (fans, wheels, etc.)
9. **Stop continuous rotation**: Always provide a way to stop continuous rotation when needed
10. **Performance**: Continuous rotation runs every frame - use sparingly for optimal performance

## Performance Considerations

- Rotation animations run every frame - avoid too many simultaneous animations
- Higher rotation speeds require more CPU per frame
- Collision synchronization adds minimal overhead
- Reset animations use fast speed to minimize duration

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. The position of the component itself doesn't matter - it controls the object specified in the Node name setting.

## Technical Details

- Fully tested with 63 comprehensive unit tests
- 97.59% code coverage
- Supports both client and server execution contexts
- Built-in error handling for invalid configurations
- Efficient frame-based animation system
- Minimal performance impact
- Continuous rotation support for indefinite spinning

## Download

You can download the latest version of the Rotate Controller here:

- [rotate.hyp](https://statics.numinia.xyz/hyperfy-components/rotate.hyp) - Latest version with full rotation control and collision synchronization

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor.
