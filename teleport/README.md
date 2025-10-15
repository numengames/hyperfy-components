# Teleport Component

A flexible teleportation system for Hyperfy that allows players to be teleported to specific destinations in your world through events.

## Features

- **Event-Driven Teleportation**: Teleport players using configurable events
- **Destination Node**: Use any 3D node in your scene as a teleport destination
- **Visual Indicator**: Optional visibility control for destination markers
- **Server/Client Support**: Works in both server and client contexts
- **Accept Any Emitter**: Option to receive teleport events from any emitter
- **Completion Events**: Emits an event when teleportation is complete
- **Debug Mode**: Built-in logging for troubleshooting

## How It Works

1. You place a 3D node in your scene where you want players to teleport to
2. The component reads the node's world position
3. When a teleport event is received with a `playerId`, the component:
   - Extracts the destination coordinates from the node's position
   - Gets the player object
   - Calls `player.teleport(destination)` to move the player
   - Emits a `teleport-complete` event with the details

## Usage

### 1. Add a Destination Node

First, add a 3D model or node to your Hyperfy world where you want players to appear after teleporting:

```
- Name it something descriptive like "teleport-destination"
- Position it where you want players to land
- The component will read its world position automatically
```

### 2. Add the Teleport Component

1. Select or create an object in your world
2. Add this teleport script to it
3. Configure the following in the inspector:
   - **Node name**: The name of your destination node (e.g., "teleport-destination")
   - **AppID**: Automatically set to the instance ID
   - **Visible Destination**: Whether to show or hide the destination node
   - **Accept Any Event**: Enable to receive events from any emitter
   - **Event Listeners**: JSON configuration for specific event receivers

### 3. Configure Event Listeners

The **Event Listeners** field accepts a JSON array of event configurations:

```json
[
  {
    "id": "XA32id21n",
    "actions": [
      {
        "type": "teleport",
        "params": {}
      }
    ]
  }
]
```

**Note**: Replace `XA32id21n` with the actual event ID from your emitter or trigger component.

### 4. Trigger Teleportation

To teleport a player, emit an event to the configured ID with a `playerId`:

```javascript
world.on('XA32id21n', { playerId: 'player-123' });
```

Or if you have **Accept Any Event** enabled, you can emit directly to the teleport component's appID:

```javascript
world.on('YB43mk54p', { playerId: 'player-123' });
```

## Configuration Options

### Basic Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **appID** | text | (auto) | Automatically set to the instance ID |
| **Node name** | text | - | Name of the 3D node to use as teleport destination |
| **Debug Mode** | toggle | false | Enable detailed logging for troubleshooting |

### Teleport Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **Visible Destination** | toggle | true | Show or hide the destination node |
| **Accept Any Event** | toggle | false | Receive events from any emitter that emits to the appID |
| **Event Listeners** | textarea | `[]` | JSON array of event configurations |

## Event Listeners Configuration

The `teleportControllerEventReceivers` prop accepts a JSON array with this structure:

```json
[
  {
    "id": "eventName",
    "actions": [
      {
        "type": "teleport",
        "params": {
          // Optional: add custom params if needed
        }
      }
    ]
  }
]
```

**Parameters:**
- `id`: The event name to listen for
- `type`: Must be `"teleport"` for teleportation
- `params`: Optional parameters (currently no params are required for teleport)

## Advanced Features

### 1. Server-Side Teleportation

You can configure certain events to only run on the server by adding `isServer: true` to the params:

```json
{
  "id": "server-teleport-event",
  "actions": [
    {
      "type": "teleport",
      "params": {
        "isServer": true
      }
    }
  ]
}
```

### 2. Teleport Complete Event

After a successful teleport, the component emits a `teleport-complete-YB43mk54p` event (where `YB43mk54p` is the teleport component's appID) with:

```javascript
{
  playerId: "player-id",
  destination: { x: 10, y: 20, z: 30 },
  timestamp: 1234567890
}
```

You can listen for this event to trigger additional actions in another component:

```json
[
  {
    "id": "teleport-complete-YB43mk54p",
    "actions": [
      {
        "type": "some-action",
        "params": {}
      }
    ]
  }
]
```

### 3. Chaining with Emitter Component

Combine with the **emitter** component to create interactive teleport triggers:

**Emitter Configuration:**
```json
{
  "appID": "ZB45kj32m",
  "emitterControllerInteractionType": "key",
  "emitterControllerEventLabel": "Teleport Here"
}
```

**Teleport Configuration:**
```json
[
  {
    "id": "ZB45kj32m",
    "actions": [
      {
        "type": "teleport",
        "params": {}
      }
    ]
  }
]
```

When a player presses the key, the emitter sends their `playerId`, and the teleport component moves them to the destination.

### 4. Multiple Destinations

Create multiple teleport components with different destination nodes and event IDs:

**Teleport A** → listens to `"teleport-to-spawn"`
**Teleport B** → listens to `"teleport-to-castle"`
**Teleport C** → listens to `"teleport-to-dungeon"`

## Example Use Cases

### 1. Spawn Points

```json
{
  "targetNodeName": "spawn-point",
  "teleportControllerVisible": false,
  "teleportControllerEventReceivers": "[{\"id\":\"respawn-event\",\"actions\":[{\"type\":\"teleport\",\"params\":{}}]}]"
}
```

### 2. Interactive Portal

```json
{
  "targetNodeName": "portal-destination",
  "teleportControllerVisible": true,
  "teleportControllerEventReceivers": "[{\"id\":\"CD67pq89r\",\"actions\":[{\"type\":\"teleport\",\"params\":{}}]}]"
}
```

### 3. Teleport Pad

```json
{
  "targetNodeName": "landing-pad",
  "teleportControllerVisible": true,
  "teleportControllerAcceptAnyEmitter": true
}
```

### 4. Boss Room Entry

```json
{
  "targetNodeName": "boss-room-entrance",
  "teleportControllerVisible": false,
  "teleportControllerEventReceivers": "[{\"id\":\"enter-boss-room\",\"actions\":[{\"type\":\"teleport\",\"params\":{}}]}]"
}
```

## Error Handling

The component handles several error scenarios:

1. **Missing playerId**: Logs a warning and cancels teleportation
2. **Player not found**: Logs a warning if the player ID doesn't exist
3. **Invalid configuration**: Logs warnings for malformed JSON or missing required fields
4. **Unknown action types**: Logs a warning for unrecognized action types

Enable **Debug Mode** to see detailed error messages in the console.

## Compatibility

- **Hyperfy**: Fully compatible with Hyperfy's world system
- **Server/Client**: Works in both server and client contexts
- **Events**: Compatible with any component that emits events with `playerId`
- **Testing**: Includes comprehensive test suite with 15 tests and >95% coverage

## Tips

1. **Test First**: Use debug mode when setting up new teleport destinations
2. **Visual Markers**: Keep destination nodes visible during development
3. **Naming Convention**: Use descriptive names for destination nodes (e.g., "tp-castle-entrance")
4. **Event Naming**: Include your appID in custom event names to avoid conflicts
5. **Accept Any Event**: Enable this for simpler setups with fewer emitters
6. **Chain Actions**: Use the teleport-complete event to trigger sequences (e.g., teleport → fade in → show UI)

## Download

Download the latest version from [GitHub](https://github.com/numengames/hyperfy-components/blob/main/teleport/teleport.js)

## Support

For issues, questions, or contributions, visit the [GitHub repository](https://github.com/numengames/hyperfy-components).
