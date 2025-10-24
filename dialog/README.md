# Dialog Component

A comprehensive dialog system component for Hyperfy that provides interactive text-based conversations with characters. This component supports multiple dialog lines, character names, auto-advance functionality, and seamless integration with other components.

## Features

- **Multiple Dialog Lines**: Support for complex conversations with multiple pages
- **Character Names**: Display character names above dialog text
- **Auto-Advance**: Automatic progression through dialog lines
- **User-Controlled Text**: No automatic text splitting - users control dialog length
- **Default Dialog**: Shows multiple welcome phrases when no content is provided (configurable)
- **Customizable UI**: Full control over dialog appearance and behavior
- **Event-Driven**: Responds to external triggers from other components
- **Server-Client Sync**: Multiplayer synchronization support
- **Configurable Event Listeners**: Flexible event reception system

## Installation

1. Copy the `dialog.js` file to your Hyperfy project
2. Attach the script to a node in your scene
3. Configure the component through the Hyperfy UI

## Configuration

### Basic Settings

- **App ID**: Unique identifier for this dialog controller (max 10 characters)
- **Node Name**: Name of the node in the scene
- **Debug Mode**: Enable/disable debug logging
- **Add Collision**: Enable collision detection for the node
- **Visible**: Initial visibility state of the node

### Dialog Settings

- **Sync Changes**: Synchronize dialog changes across all connected clients
- **Use Delay**: Enable delay before showing dialogs
- **Delay (sec)**: Time to wait before showing dialogs (0.1-60 seconds)
- **Dialog Width**: Width of the dialog box (10-1200px)
- **Dialog Height**: Height of the dialog box (5-800px)
- **Dialog Scale**: Scale factor for the dialog (0.1-2.0)
- **Dialog Background**: Background color with transparency
- **Dialog Border**: Border color with transparency
- **Border Radius**: Corner rounding (0-20px)

### Text Settings

- **Text Color**: Color of the dialog text
- **Font Size**: Size of the dialog text (8-24px)
- **Font Weight**: Normal or bold text
- **Show Character Name**: Display character name above dialog
- **Character Name**: Name of the character speaking
- **Name Label Color**: Color of the character name
- **Name Label Size**: Size of the character name (8-24px)

### Content Settings

- **Auto Advance**: Automatically advance to next dialog line after a delay
- **Dialog Duration (sec)**: Time to wait before auto-advancing to next line (1-30 seconds)
- **Default Dialog Phrases**: Default phrases to show when no dialog content is provided (one phrase per line)

### Event Settings

- **Accept Any Event**: Allow any component to trigger this dialog by emitting to the App ID
- **Event Listeners**: JSON array of event configurations for specific event handling

## Action Types

### next-dialog

Smart dialog action that handles all dialog functionality:
- Shows dialog if not visible
- Advances to next line if already visible
- Hides dialog when reaching the end
- Stays hidden if dialog was completed

**Parameters:**
- `dialogText` (string): Single dialog text to show (only used if dialog is not visible)
- `dialogPhrases` (array): Multiple dialog phrases to show sequentially (only used if dialog is not visible)
- `characterName` (string): Character name (only used if dialog is not visible)
- `delay` (number): Delay before showing dialog (only used if dialog is not visible)

**Behavior:**
1. **First call**: Shows dialog with provided content
2. **Subsequent calls**: Advances to next line
3. **Last line**: Hides dialog and marks as completed
4. **After completion**: Any further calls will hide the dialog completely

**Example:**
```javascript
// First call - shows dialog
world.emit('dialog123', {
  dialogText: 'Hello, welcome!',
  characterName: 'Guide'
});

// Second call - advance to next line
world.emit('dialog123', {});

// Third call - advance to next line
world.emit('dialog123', {});

// Fourth call - dialog hides (reached end)
world.emit('dialog123', {});

// Fifth call - dialog stays hidden (was completed)
world.emit('dialog123', {});
```

### hide-dialog

Explicitly hides the currently visible dialog. Useful for closing dialogs that might be stuck open.

**Parameters:** None

**Example:**
```javascript
// Hide dialog explicitly
world.emit('dialog123', {
  // No parameters needed
});
```

## Event Listener Configuration

The component supports flexible event listener configuration through the "Event Listeners" setting. This allows you to listen to specific events from other components.

### Basic Event Listener Setup

```json
[
  {
    "id": "emitter123",
    "actions": [
      {
        "type": "next-dialog",
        "params": {
          "dialogText": "Welcome message!",
          "characterName": "Guide"
        }
      }
    ]
  }
]
```

### Multiple Event Listeners

```json
[
  {
    "id": "emitter123",
    "actions": [
      {
        "type": "next-dialog",
        "params": {
          "dialogPhrases": [
            "Welcome to this area!",
            "Be careful of the dangers ahead.",
            "Good luck on your journey!"
          ],
          "characterName": "Area Guide"
        }
      }
    ]
  },
  {
    "id": "button456",
    "actions": [
      {
        "type": "next-dialog",
        "params": {
          "dialogText": "Button was pressed!",
          "characterName": "System"
        }
      }
    ]
  },
  {
    "id": "closeButton789",
    "actions": [
      {
        "type": "hide-dialog",
        "params": {}
      }
    ]
  }
]
```

### Dynamic Parameters

```json
[
  {
    "id": "emitter123",
    "actions": [
      {
        "type": "next-dialog",
        "params": {
          "characterName": "NPC",
          "delay": 1
        }
      }
    ]
  }
]
```

## Usage Examples

### Default Dialog (No Content Provided)

```javascript
// Show default welcome dialog with multiple phrases
world.emit('dialog123', {
  characterName: 'Assistant'
});
// This will show the phrases configured in "Default Dialog Phrases" setting
// Default configuration includes:
// 1. "Welcome! How can I help you today?"
// 2. "I'm here to assist you with any questions you might have."
// 3. "Feel free to explore and interact with the environment."
// 4. "Is there anything specific you'd like to know about?"
```

### Basic Single Line Dialog

```javascript
// Show a simple dialog
world.emit('dialog123', {
  dialogText: 'Welcome to our world!',
  characterName: 'Guide'
});
```

### Multi-Phrase Dialog

```javascript
// Show a conversation with multiple phrases
world.emit('dialog123', {
  dialogPhrases: [
    'Hello there!',
    'Welcome to our magical world.',
    'I hope you enjoy your stay!',
    'Feel free to explore around.'
  ],
  characterName: 'Friendly NPC'
});

// Advance through each phrase
world.emit('dialog123', {}); // Shows "Welcome to our magical world."
world.emit('dialog123', {}); // Shows "I hope you enjoy your stay!"
world.emit('dialog123', {}); // Shows "Feel free to explore around."
world.emit('dialog123', {}); // Dialog hides (reached end)
```

### Long Text (User-Controlled)

```javascript
// Long text is displayed as-is, user controls the length
world.emit('dialog123', {
  dialogText: 'This is a very long text that will be displayed exactly as provided. The user is responsible for controlling the length and formatting of the dialog text.',
  characterName: 'Storyteller'
});
```

### Interactive Dialog Control

```javascript
// Show dialog (first call)
world.emit('dialog123', {
  dialogText: 'Press the button to continue...',
  characterName: 'Guide'
});

// Advance to next line (second call)
world.emit('dialog123', {});

// Advance to next line (third call)
world.emit('dialog123', {});

// Dialog automatically hides when reaching the end
```

### Dialog with Delay

```javascript
// Show dialog with 2 second delay
world.emit('dialog123', {
  dialogText: 'This message appears after 2 seconds!',
  characterName: 'Delayed Guide',
  delay: 2
});
```

### Force Hide Dialog

```javascript
// If dialog gets stuck open, force hide it
world.emit('dialog123', {
  // No parameters needed - just hide the dialog
});
```

## Component Communication

### Using Accept Any Event

When "Accept Any Event" is enabled, any component can trigger the dialog by emitting to the App ID:

```javascript
// From any component - just emit to the App ID
world.emit('dialog123', {
  dialogText: 'You found a treasure!',
  characterName: 'System'
});
```

### Using Specific Event Listeners

Configure specific event listeners for more control:

```json
[
  {
    "id": "treasure123",
    "actions": [
      {
        "type": "show-dialog",
        "params": {
          "dialogText": "You found a treasure!",
          "characterName": "Treasure System"
        }
      }
    ]
  },
  {
    "id": "npc456",
    "actions": [
      {
        "type": "show-dialog",
        "params": {
          "dialogText": "Hello there!",
          "characterName": "Friendly NPC"
        }
      }
    ]
  }
]
```

### Server-Client Communication

When `Accept Any Event` is enabled, the component supports server-client synchronization:

```javascript
// Server sends to all clients
world.emit('dialog123', {
  dialogText: 'Server announcement!',
  characterName: 'Server'
});
```



## Best Practices

1. **Control Dialog Length**: Users are responsible for keeping dialog text at appropriate lengths
2. **Use Character Names**: Always specify character names for better immersion
3. **Set Appropriate Delays**: Use delays sparingly and only when needed
4. **Test Dialog Display**: Verify that dialog text displays correctly without automatic splitting
5. **Use Auto-Advance Sparingly**: Only use auto-advance for non-interactive sequences
6. **Provide Manual Control**: Allow users to advance dialogs manually for important content
7. **Configure Event Listeners**: Use specific event listeners for better control over when dialogs appear
8. **Use Accept Any Event**: Enable this for simple setups where any component can trigger dialogs

## Troubleshooting

### Dialog Not Showing
- Check that the node name is correct
- Verify that the App ID is unique
- Ensure the component is properly attached to a node
- Check that the event is being emitted to the correct App ID

### Text Display Issues
- Verify that dialog text is not too long for the UI
- Check that text formatting is appropriate for the dialog box size
- Ensure special characters are properly handled

### Event Listeners Not Working
- Verify the JSON format in the Event Listeners field
- Check that the event IDs match the emitting components
- Ensure the action types are correct (`show-dialog`, `hide-dialog`, `next-dialog`)

### Server-Client Issues
- Enable `Accept Any Event` for server-client communication
- Check that App IDs are consistent across components
- Verify network connectivity in multiplayer environments

## Version History

- **v1.0.0**: Initial release with basic dialog functionality
- **v1.1.0**: Added multi-line support and user-controlled text length
- **v1.2.0**: Added character names and auto-advance
- **v1.3.0**: Added server-client synchronization
- **v1.4.0**: Added configurable event listeners and improved integration
- **v1.5.0**: Removed automatic text splitting, added default welcome message
- **v1.6.0**: Enhanced default dialog with multiple welcome phrases
- **v1.7.0**: Made default dialog phrases configurable through UI settings

## License

MIT License - see LICENSE file for details.