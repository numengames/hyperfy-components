# Emitter Controller for Hyperfy

This component provides a flexible event emitter system with multiple interaction modes, cooldown management, and proximity detection for creating interactive triggers in your Hyperfy world.

## Features

- Emit custom events through player interactions
- Two interaction modes: KEY (manual button) and AUTO (automatic proximity)
- Configurable cooldown system to prevent spam
- Single-use triggers for one-time interactions
- Proximity detection with visual UI feedback
- Event-driven architecture for dynamic state control
- Configurable delays for timed actions
- Enter/leave proximity events for zone-based interactions

## How It Works

The Emitter Controller creates interactive triggers that emit custom events when activated. It can operate in two modes:

1. **KEY Mode** - Creates an action button that players can press
2. **AUTO Mode** - Automatically triggers when players enter a proximity zone

When triggered, the emitter:
1. Checks if it's active and not in cooldown
2. Applies any configured delay
3. Emits a signal event with player data
4. Starts cooldown timer if enabled
5. Updates UI state accordingly

The component can also receive events to dynamically change its state (enabled/disabled, label text) during gameplay.

## Usage

1. Add the emitter component to any 3D object in your Hyperfy world
2. Configure the interaction type (KEY or AUTO)
3. Set up the trigger distance and other parameters
4. Configure event listeners in other components to respond to the emitted signals
5. The emitter will send events with the format: `<appID>` containing player data

## Configuration Options

### Basic Settings
- **appID**: Unique identifier for this app instance (auto-generated)
- **Node name**: The name of the 3D node in your scene
- **Debug Mode**: Enable to see detailed logs in the console
- **Add Collision**: Automatically add collision to all meshes in the model
- **Visible?**: Initial visibility state when the app starts

### Emitter Settings
- **Has Cooldown?**: Enable cooldown system to prevent rapid-fire triggering (default: disabled)
- **Cooldown (seconds)**: Time in seconds before the emitter can be triggered again (0-60, default: 0)
- **Event Label**: Text displayed on the UI and action button
- **Interaction Type**: Choose between KEY (manual) or AUTO (automatic proximity)
- **Is Enabled?**: If enabled, the emitter will be active and can be triggered (default: false)
- **Single Use?**: If enabled, the emitter can only be triggered once (default: false)
- **Trigger Distance**: Distance in units where the action will be triggered (0-10, default: 2)
- **Proximity Distance**: Distance where UI will be displayed - AUTO mode only (0-15, default: 3)
- **UI Display Radius Y**: Vertical offset for UI display position - AUTO mode only (0-100, default: 1)
- **Enable Enter Event**: Send proximity zone ENTER event - AUTO mode only (default: disabled)
- **Enable Leave Event**: Send proximity zone LEAVE event - AUTO mode only (default: disabled)
- **Accept Any Event**: Allow receiving events from any emitter (default: disabled)
- **Delay (sec)**: Time to wait before triggering emitter actions (0-60, default: 0)
- **Event Listeners**: JSON array of event configurations for dynamic state control

## Interaction Modes

### KEY Mode (Manual Trigger)

In KEY mode, the emitter creates an action button that appears when players get close.

**Characteristics:**
- Shows action button at configured distance
- Player must press the interaction key
- Ideal for doors, buttons, and interactive objects
- Less resource intensive

**Configuration:**
- Set **Interaction Type** to `key`
- Adjust **Trigger Distance** to control button appearance range
- Customize **Event Label** for button text

### AUTO Mode (Proximity Trigger)

In AUTO mode, the emitter automatically triggers when players enter the trigger zone.

**Characteristics:**
- Displays floating UI with label
- Automatically triggers on proximity
- Can emit enter/leave events
- Ideal for checkpoints, zones, and automatic triggers

**Configuration:**
- Set **Interaction Type** to `auto`
- Adjust **Proximity Distance** for UI visibility
- Adjust **Trigger Distance** for automatic activation
- Customize **UI Display Radius Y** for vertical position
- Enable **Enter/Leave Events** for zone detection

## Event Configuration

The Event Listeners property accepts a JSON array for receiving state control events:

```json
[
  {
    "id": "enable-emitter-myAppId",
    "actions": [
      {
        "type": "set-state",
        "params": {
          "active": true,
          "label": "Press to Continue",
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
- **actions**: Array of actions to execute (required)
  - **type**: Action type - currently supports `"set-state"` (required)
  - **params**: Parameters for the action (optional)

### Set-State Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `active` | boolean | `Is Enabled?` | Enable or disable the emitter |
| `label` | string | `Event Label` | Update the button/UI label text |
| `delay` | number | `0` | Delay in seconds before applying state change |

## Emitted Events

The emitter sends the following events:

### Main Signal Event
**Event Name:** `<appID>`
```javascript
{
  playerId: "player-id",
  timestamp: 1234567890
}
```
Emitted when the emitter is triggered (KEY press or AUTO proximity).

### Proximity Events (AUTO Mode)

**Enter Event:** `enter-proximity-zone-<appID>`
```javascript
{
  playerId: "player-id",
  timestamp: 1234567890
}
```
Emitted when player enters the proximity zone (if enabled).

**Leave Event:** `leave-proximity-zone-<appID>`
```javascript
{
  playerId: "player-id",
  timestamp: 1234567890
}
```
Emitted when player leaves the proximity zone (if enabled).

## Example Use Cases

### Simple Button to Open Door

**Emitter Configuration:**
- **Interaction Type**: `key`
- **Event Label**: "Open Door"
- **Trigger Distance**: `2`
- **appID**: `door-button-123`

**Door Component:**
Listen for event `door-button-123` and animate door open.

### Checkpoint System

**Emitter Configuration:**
- **Interaction Type**: `auto`
- **Trigger Distance**: `1.5`
- **Single Use?**: `true`
- **appID**: `checkpoint-1`

**Game Manager:**
Listen for event `checkpoint-1` and save player progress.

### Timed Puzzle Button

**Emitter Configuration:**
- **Interaction Type**: `key`
- **Has Cooldown?**: `true`
- **Cooldown**: `5` seconds
- **Event Label**: "Activate"

Prevents players from spamming the button - useful for timed puzzles.

### Zone Detection

**Emitter Configuration:**
- **Interaction Type**: `auto`
- **Enable Enter Event**: `true`
- **Enable Leave Event**: `true`
- **appID**: `danger-zone`

**Warning System:**
Listen for `enter-proximity-zone-danger-zone` to show warning UI.
Listen for `leave-proximity-zone-danger-zone` to hide warning.

### Dynamic Emitter Control

**Control Script:**
Emit event `enable-button-abc` to dynamically enable an emitter:
```javascript
world.emit('enable-button-abc', { 
  active: true,
  label: "Now Available!"
});
```

**Emitter Configuration:**
```json
[
  {
    "id": "enable-button-abc",
    "actions": [
      {
        "type": "set-state",
        "params": {}
      }
    ]
  }
]
```

### Delayed Activation

**Emitter Configuration:**
- **Delay (sec)**: `2`

When triggered, waits 2 seconds before emitting the signal - useful for creating anticipation or timed sequences.

## Advanced Features

### Cooldown System

The cooldown system prevents rapid-fire triggering:

1. **Trigger occurs** - Signal is emitted
2. **Cooldown starts** - Timer begins counting down
3. **Emitter disabled** - Cannot be triggered during cooldown
4. **Cooldown ends** - Emitter becomes active again

**When to use:**
- Prevent button spam
- Create timed puzzles
- Limit resource generation
- Add gameplay pacing

### Single Use Mode

When enabled, the emitter can only be triggered once and then becomes permanently inactive.

**When to use:**
- One-time events (cutscenes, reveals)
- Collectibles
- Irreversible actions
- Tutorial steps

### Proximity Events

In AUTO mode, you can emit enter/leave events separately from the trigger event:

- **Enter Event**: Fires when player enters proximity zone (before trigger)
- **Leave Event**: Fires when player exits proximity zone
- **Trigger Event**: Fires when player enters trigger zone (smaller radius)

This allows for multi-stage interactions like warnings before triggers.

### Dynamic State Control

Emitters can receive events to change their state during gameplay:

```javascript
// Enable an emitter
world.emit('control-emitter-123', { active: true });

// Change label
world.emit('control-emitter-123', { 
  active: true, 
  label: "New Text!" 
});

// Delayed state change
world.emit('control-emitter-123', { 
  active: false, 
  delay: 3 
});
```

## Troubleshooting

### Emitter not triggering
- Verify **Is Enabled?** is set to `true`
- Check **Trigger Distance** is appropriate
- Ensure emitter is not in cooldown
- In KEY mode, verify players can see the action button
- Check Debug Mode logs for detailed information

### UI not appearing (AUTO mode)
- Verify **Proximity Distance** is larger than trigger distance
- Check **UI Display Radius Y** is visible in your scene
- Ensure the node exists in your scene

### Cooldown not working
- Enable **Has Cooldown?**
- Set **Cooldown** to a value greater than 0
- Check Debug Mode to see cooldown timer updates

### Events not being received
- Verify other components are listening for the correct appID
- Check that the emitter is actually triggering (Debug Mode)
- Ensure event listeners are properly configured

### Single use not working
- Enable **Single Use?**
- Verify cooldown is also enabled if you want proper feedback
- Check that the emitter was actually triggered once

## Best Practices

1. **Test distances**: Adjust trigger and proximity distances based on your world scale
2. **Provide visual feedback**: Use appropriate labels and UI positioning
3. **Consider cooldowns**: Prevent spam and improve gameplay with appropriate cooldown times
4. **Debug during development**: Enable Debug Mode to understand emitter behavior
5. **Choose appropriate mode**: Use KEY for intentional interactions, AUTO for automatic triggers
6. **Plan event flow**: Map out which emitters trigger which actions in your world
7. **Test multiplayer**: Verify behavior works correctly with multiple players

## Performance Considerations

- KEY mode is more performant than AUTO mode (no UI rendering)
- Proximity detection happens continuously in AUTO mode
- Cooldown timers use setTimeout - many concurrent timers may impact performance
- Consider using single-use emitters where appropriate to reduce active listeners

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. The position of the object determines where the trigger/UI will appear.

## Technical Details

- Fully tested with 13 comprehensive unit tests
- Supports both client execution contexts
- Built-in error handling for invalid configurations
- Efficient event-driven architecture
- Minimal performance impact in KEY mode

## Download

You can download the latest version of the Emitter Controller here:

- [emitter.hyp](https://statics.numinia.xyz/hyperfy-components/emitter.hyp) - Latest version with dual interaction modes and cooldown support

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor.

