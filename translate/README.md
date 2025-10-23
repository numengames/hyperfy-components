# Translate Controller for Hyperfy

This component provides smooth 3D object translation animations with configurable speed, delays, and event-driven control for creating dynamic movement effects in your Hyperfy world.

## Features

- **Smooth Translation Animations**: Move 3D objects smoothly along X, Y, and Z axes
- **Configurable Speed**: Control animation speed with precise units-per-frame settings
- **Event-Driven Control**: Start, pause, resume, and reset animations through events
- **Multi-Axis Support**: Animate objects on single or multiple axes simultaneously
- **Dynamic Parameters**: Override default settings with runtime parameters
- **Collision Synchronization**: Keep visual mesh and physics rigidbody in sync
- **Delay Support**: Add delays before starting animations for timed sequences
- **Reset Functionality**: Quickly return objects to their initial position
- **Debug Mode**: Built-in logging for troubleshooting animation issues

## How It Works

The Translate Controller animates 3D objects by smoothly interpolating their position over time. It can:

1. **Receive Events** - Listen for animation control events (start, pause, resume, reset)
2. **Process Parameters** - Use dynamic parameters or fall back to configured defaults
3. **Apply Delays** - Wait before starting animations for synchronized effects
4. **Animate Smoothly** - Move objects frame-by-frame with configurable speed
5. **Sync Physics** - Keep visual mesh and collision rigidbody synchronized
6. **Handle States** - Manage animation states (playing, paused, stopped)

The component intelligently handles both visual mesh and physics rigidbody, ensuring they move together smoothly without visual glitches.

## Usage

1. Add the translate component to any 3D object in your Hyperfy world
2. Configure the target node name to point to the object you want to animate
3. Set up translation parameters (speed, target positions, delays)
4. Configure event listeners to control animations from other components
5. The component will smoothly animate the object when triggered

## Configuration Options

### Basic Settings
- **appID**: Unique identifier for this app instance (auto-generated)
- **Node name**: The name of the 3D node in your scene to animate
- **Debug Mode**: Enable detailed logging for troubleshooting
- **Add Collision**: Automatically add collision to all meshes in the model
- **Visible?**: Initial visibility state when the app starts

### Animation Settings
- **Sync Changes**: Synchronize animation changes across all connected clients (default: disabled)
- **Use Delay**: Enable delay before starting animations (default: disabled)
- **Delay (sec)**: Time to wait before starting animations, 0.1 to 60 seconds (default: 0)
- **Signal ID**: Unique identifier for triggering animations from external sources

### Translation Settings
- **Enable Translation**: Enable translation animations (default: true)
- **Translation Delay (sec)**: Delay before starting translation animation (default: 0)
- **Translation Speed (units/frame)**: Speed of animation in units per frame (default: 0.1)
- **X Translation (units)**: Target X position in units (default: 0)
- **Y Translation (units)**: Target Y position in units (default: 0)
- **Z Translation (units)**: Target Z position in units (default: 0)
- **Accept Any Event**: Allow receiving events from any emitter (default: disabled)
- **Event Listeners**: JSON array of event configurations

## Event Configuration

The Event Listeners property accepts a JSON array defining which events to listen for and how to respond:

```json
[
  {
    "id": "movePlat123",
    "actions": [
      {
        "type": "set-translation",
        "params": {
          "translationY": 5,
          "translationSpeed": 0.2,
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
  - **type**: Action type - supports `"set-translation"`, `"pause-translation"`, `"resume-translation"`, `"reset-translation"` (required)
  - **params**: Parameters for the action (optional)

### Action Types

| Action | Description | Parameters |
|--------|-------------|------------|
| `set-translation` | Start translation animation | `translationX`, `translationY`, `translationZ`, `translationSpeed`, `delay` |
| `pause-translation` | Pause current animation | None |
| `resume-translation` | Resume paused animation | None |
| `reset-translation` | Reset to initial position | `resetSpeed` (optional) |

### Set-Translation Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `translationX` | number | props value | Target X position |
| `translationY` | number | props value | Target Y position |
| `translationZ` | number | props value | Target Z position |
| `translationSpeed` | number | props value | Animation speed (units/frame) |
| `delay` | number | 0 | Delay before starting animation |

## Example Use Cases

### Moving Platform

**Button Configuration:**
Emit event `activatePl789` when pressed

**Translate Controller Configuration:**
```json
[
  {
    "id": "activatePl789",
    "actions": [
      {
        "type": "set-translation",
        "params": {
          "translationY": 10,
          "translationSpeed": 0.15
        }
      }
    ]
  }
]
```

### Elevator System

**Configuration:**
- **X Translation**: `0` (no horizontal movement)
- **Y Translation**: `15` (move up 15 units)
- **Translation Speed**: `0.1` (smooth movement)
- **Translation Delay**: `1` (wait 1 second before moving)

### Sliding Door

**Configuration:**
```json
{
  "translationX": 5,
  "translationSpeed": 0.3,
  "delay": 0.5
}
```

### Multi-Axis Movement

**Configuration:**
```json
{
  "translationX": 3,
  "translationY": 2,
  "translationZ": -1,
  "translationSpeed": 0.08
}
```

### Reset Mechanism

**Reset Button Configuration:**
```json
[
  {
    "id": "resetElev123",
    "actions": [
      {
        "type": "reset-translation",
        "params": {
          "resetSpeed": 2.0
        }
      }
    ]
  }
]
```

## Server-Client Communication

The Translate Controller supports seamless communication between server and client instances:

### Accept Any Event Mode

When `Accept Any Event` is enabled, the component can receive events from any emitter that targets the appID directly. This is particularly useful for:

- **Unknown or generative apps** that need to trigger translations
- **Dynamic event sources** where the emitter ID is not known in advance
- **Cross-component communication** without pre-configuring specific event IDs

### Server-to-Client Broadcasting

When running on the server with `Accept Any Event` enabled:

1. **Server receives event** on the appID
2. **Server broadcasts** the event to all clients using `translate-server-to-client`
3. **Clients receive** the broadcasted event and execute the translation
4. **Synchronized translation** across all connected players

This ensures that translation events triggered on the server are properly synchronized across all clients in the multiplayer environment.

### Event Flow Example

```
External Emitter → Server AppID → Server Broadcast → All Clients → Translation Execution
```

This pattern is essential for maintaining consistent translation states in multiplayer scenarios where one player's action should affect all players' views.

## Advanced Features

### Dynamic Parameter Override

You can override default settings at runtime:

```javascript
// Move faster than configured
world.emit('movePlatformXyz', {
  translationY: 10,
  translationSpeed: 0.5  // Override default speed
});

// Move to different position
world.emit('movePlatformXyz', {
  translationX: 5,
  translationY: 8,
  translationZ: -2
});
```

### Animation State Management

The component tracks animation states:

- **isAnimating**: Overall animation state (true when any animation is active)
- **isTranslationAnimating**: Translation-specific state (can be paused/resumed)

### Collision Synchronization

When collision is enabled, the component:
1. Calculates offset between visual mesh and physics rigidbody
2. Applies the same translation to both elements
3. Maintains synchronization throughout the animation

### Reset Functionality

The reset action:
1. Stores initial position when component starts
2. Animates back to initial position with fast speed
3. Uses configurable `resetSpeed` (default: 2x normal speed)

## Troubleshooting

### Animation not starting
- Verify **Enable Translation** is set to `true`
- Check that event `id` matches exactly what other components are emitting
- Ensure the Event Listeners JSON is valid
- Check Debug Mode logs for detailed information

### Animation too fast/slow
- Adjust **Translation Speed** (lower = slower, higher = faster)
- Use `translationSpeed` parameter in events for runtime control
- Typical range: 0.05 (very slow) to 0.5 (fast)

### Object not moving smoothly
- Check that **Translation Speed** is not too high
- Verify the target position is different from current position
- Enable Debug Mode to see animation progress

### Collision issues
- Enable **Add Collision** if the object needs physics
- Check that both mesh and rigidbody are moving together
- Verify collision setup in Debug Mode logs

### Delay not working
- Enable **Use Delay** in settings
- Set **Delay (sec)** to a value greater than 0
- Or use `delay` parameter in event params

## Best Practices

1. **Test speeds**: Start with slow speeds (0.05-0.1) and adjust as needed
2. **Use delays**: Add small delays (0.5-1s) for smoother sequences
3. **Plan movements**: Consider the object's initial position when setting targets
4. **Debug during development**: Enable Debug Mode to understand animation behavior
5. **Name events clearly**: Use descriptive event names with appID suffixes
6. **Test collision**: Verify collision works correctly with animated objects
7. **Consider multiplayer**: Test behavior with multiple connected clients

## Performance Considerations

- Translation animations run every frame - avoid too many simultaneous animations
- Higher translation speeds require more CPU per frame
- Collision synchronization adds minimal overhead
- Reset animations use fast speed to minimize duration

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. The position of the component itself doesn't matter - it controls the object specified in the Node name setting.

## Technical Details

- Fully tested with 58 comprehensive unit tests
- 97.45% code coverage
- Supports both client and server execution contexts
- Built-in error handling for invalid configurations
- Efficient frame-based animation system
- Minimal performance impact

## Download

You can download the latest version of the Translate Controller here:

- [translate.hyp](https://statics.numinia.xyz/hyperfy-components/translate.hyp) - Latest version with full animation control and collision synchronization

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor.
