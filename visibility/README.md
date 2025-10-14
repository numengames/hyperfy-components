# Visibility Controller for Hyperfy

This component provides advanced control over 3D object visibility and collision detection, with support for client-server synchronization, delayed transitions, and event-driven actions.

## Features

- Show/hide 3D objects dynamically through events
- Enable/disable collision detection on demand
- Synchronize visibility changes across all connected clients
- Apply visibility changes with configurable delays
- Emit custom events when visibility changes occur
- Support for both client and server-side logic
- Event-driven architecture for complex interactions
- User-specific visibility control

## How It Works

The Visibility Controller listens for custom events in your Hyperfy world and responds by changing the visibility and collision state of 3D objects. It can:

1. **Receive events** - Listen for specific events configured in the Event Listeners property
2. **Process changes** - Determine whether to apply changes locally or sync across all clients
3. **Apply delays** - Optionally wait before applying visibility changes for smooth transitions
4. **Update state** - Change the object's visibility and collision properties
5. **Emit events** - Notify other components when visibility changes occur

The component intelligently handles client-server communication, allowing you to choose whether changes should be local to one client or synchronized across all users.

## Usage

1. Add the visibility component to any 3D object in your Hyperfy world
2. Configure the target node name to point to the object you want to control
3. Set up event listeners in the Event Listeners configuration
4. Emit events from other components (buttons, triggers, etc.) to control visibility
5. The component will automatically handle visibility and collision changes

## Configuration Options

### Basic Settings
- **appID**: Unique identifier for this app instance (auto-generated)
- **Node name**: The name of the 3D node in your scene to control
- **Debug Mode**: Enable to see detailed logs in the console
- **Add Collision**: Automatically add collision to all meshes in the model
- **Visible?**: Initial visibility state when the app starts

### Visibility Settings
- **Sync Changes**: When enabled, visibility changes will be synchronized across all connected clients (default: disabled)
- **Default Visible**: Default visibility state used when events don't specify a visibility parameter (default: true)
- **Default Collision**: Default collision state used when events don't specify a collision parameter (default: true)
- **Use Delay**: Enable delay before applying visibility changes (default: disabled)
- **Delay (sec)**: Time to wait before applying visibility changes, from 0.1 to 60 seconds (default: 0)
- **Emit When Shown**: Emit a custom event when the object becomes visible (default: disabled)
- **Emit When Hidden**: Emit a custom event when the object becomes hidden (default: disabled)
- **Accept Any Event**: Allow receiving events from any emitter that emits to the appID directly (default: disabled)
- **Event Listeners**: JSON array of event configurations to listen for

## Event Configuration

The Event Listeners property accepts a JSON array defining which events to listen for and how to respond:

```json
[
  {
    "id": "show-door-myAppId",
    "actions": [
      {
        "type": "set-visibility",
        "params": {
          "isVisible": true,
          "hasCollision": false,
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
  - **type**: Action type - currently supports `"set-visibility"` (required)
  - **params**: Parameters for the action (optional)

### Set-Visibility Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `isVisible` | boolean | Default Visible | Show or hide the object |
| `hasCollision` | boolean | Default Collision | Enable or disable collision |
| `isSync` | boolean | `false` | Synchronize this change across all clients |
| `delay` | number | Delay (sec) | Delay in seconds before applying changes |
| `userId` | string | - | Target specific user (server context only) |
| `isServer` | boolean | - | Process this event on the server |

## Example Use Cases

### Simple Show/Hide Button

**Button Configuration:**
Emit event `toggle-door-abc123` when clicked

**Visibility Controller Configuration:**
```json
[
  {
    "id": "toggle-door-abc123",
    "actions": [
      {
        "type": "set-visibility",
        "params": {
          "isVisible": true,
          "hasCollision": false
        }
      }
    ]
  }
]
```

### Delayed Reveal

Show an object 3 seconds after a trigger:

1. Enable **Use Delay**
2. Set **Delay (sec)** to `3`
3. Configure event listener as usual

Or use the delay parameter directly in the event:
```json
{
  "type": "set-visibility",
  "params": {
    "isVisible": true,
    "delay": 3
  }
}
```

### Synchronized Door

Open a door for all players at once:

1. Enable **Sync Changes**, OR
2. Use the `isSync` parameter in the event:
```json
{
  "type": "set-visibility",
  "params": {
    "isVisible": false,
    "hasCollision": false,
    "isSync": true
  }
}
```

### Event Chaining

Make one object's visibility trigger another:

**Object A:**
- Enable **Emit When Shown**
- AppID: `object-a-123`

**Object B:**
- Listen for event: `visibility-enabled-object-a-123`
```json
[
  {
    "id": "visibility-enabled-object-a-123",
    "actions": [
      {
        "type": "set-visibility",
        "params": {
          "isVisible": true
        }
      }
    ]
  }
]
```

### Collision-Only Toggle

Toggle collision without changing visibility:

```json
{
  "type": "set-visibility",
  "params": {
    "hasCollision": false
  }
}
```
(Visibility will use the current state or default value)

## Advanced Features

### Client-Server Synchronization

The component supports two operational contexts:

**Client Mode** (default):
- Processes events and applies visibility changes locally
- Can send synchronization requests to the server
- Receives synchronized changes from the server

**Server Mode**:
- Acts as a relay for synchronized visibility changes
- Broadcasts changes to all connected clients
- Enables multi-user synchronized experiences

When **Sync Changes** is enabled or an event has `isSync: true`, the component will:
1. Send the change to the server
2. Server broadcasts to all clients
3. All clients apply the change simultaneously

### User-Specific Updates

In server mode, you can target specific users with the `userId` parameter. The server will broadcast the change, but only the specified user will apply it.

### Emitted Events

When **Emit When Shown** or **Emit When Hidden** are enabled, the component will emit events that other components can listen for:

- `visibility-enabled-<appID>` - Emitted when object becomes visible
- `visibility-disabled-<appID>` - Emitted when object becomes hidden

These events include:
```javascript
{
  userId: "user-id",
  timestamp: 1234567890
}
```

## Troubleshooting

### Object not responding to events
- Verify the event `id` matches exactly what other components are emitting
- Check that the Event Listeners JSON is valid (use a JSON validator)
- Enable Debug Mode to see detailed logs
- Ensure the Node name is correct

### Collision not working
- Make sure **Add Collision** is enabled
- Verify your model has geometry meshes
- Check that `hasCollision` is set to `true` in event parameters

### Synchronization not working
- Enable **Sync Changes** in settings, OR use `isSync: true` in event params
- Test with multiple connected clients
- Verify the server is running and connected

### Delay not working
- Enable **Use Delay** in settings
- Set **Delay (sec)** to a value greater than 0, OR use `delay` parameter in events
- Check Debug Mode logs for delay application

## Best Practices

- **Use unique appIDs**: When using multiple instances, ensure each has a unique appID
- **Test with Debug Mode**: Enable debug logging during development
- **Validate JSON**: Always validate your Event Listeners JSON configuration
- **Sync wisely**: Only use synchronization when needed - it has network overhead
- **Name events clearly**: Use descriptive event names with appID suffixes for clarity
- **Start simple**: Test basic visibility changes before adding delays and synchronization

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. The position of the component itself doesn't matter - it controls the object specified in the Node name setting.

## Technical Details

- Fully tested with 28 comprehensive unit tests
- Supports both client and server execution contexts
- Built-in error handling for invalid configurations
- Efficient event-driven architecture
- Minimal performance impact

## Download

You can download the latest version of the Visibility Controller here:

- [visibility.hyp](https://statics.numinia.xyz/hyperfy-components/visibility.hyp) - Latest version with full synchronization and event support

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor.
