# Keyboard Component

A virtual keyboard component for Hyperfy that provides on-screen keypad functionality. This component supports both letter and number keypads with customizable appearance and event-driven interactions.

## Features

- **Dual Keypad Types**: Support for both letter and number keypads
- **Event-Driven**: Emits events for key presses and special actions
- **Server-Client Sync**: Synchronized visibility across multiplayer environments
- **Customizable UI**: Configurable button colors and hover effects
- **Designer Mode**: Preview mode for development and testing

## Installation

1. Copy the `keyboard.js` file to your Hyperfy project
2. Attach the script to a node in your scene
3. Configure the component through the Hyperfy UI

## Configuration

The keyboard component provides the following configuration options:

### Basic Settings

- **App ID**: Unique identifier for the component
- **Node Name**: The name of the 3D node in your scene
- **Debug Logs**: Enable detailed logging for troubleshooting

### Keypad Settings

- **Designer Mode**: Enable to show keypad in preview mode
- **Keypad Type**: Choose between Letters or Numbers keypad

### Signal Settings

- **Receiver ID**: ID for receiving visibility control events

## Usage

### Basic Setup

The keyboard component automatically creates a virtual keypad UI when configured. Users can interact with the keypad by clicking on the virtual buttons.

### Event System

The component emits various events when keys are pressed:

```javascript
// Character key pressed
app.emit('keypad-character-ccx', { character: 'a' });

// Special keys
app.emit('keypad-backspace-ccx');
app.emit('keypad-enter-ccx');
app.emit('keypad-scape-ccx');
```

### Visibility Control

The keypad can be shown or hidden programmatically:

```javascript
// Show keypad
world.emit('visibility-cc', { isVisible: true });

// Hide keypad
world.emit('visibility-cc', { isVisible: false });
```

## Keypad Types

### Letters Keypad

The letters keypad includes:
- Full QWERTY layout
- Special keys: ESC, Backspace (⌫), Enter (⏎)
- Organized in rows for easy typing

### Numbers Keypad

The numbers keypad includes:
- Numbers 0-9
- Special keys: ESC, Backspace (⌫), Enter (⏎)
- Compact layout for numeric input

## Examples

### Basic Character Input

```javascript
// Listen for character input
app.on('keypad-character-ccx', ({ character }) => {
  console.log(`Character pressed: ${character}`);
  // Handle character input
});
```

### Special Key Handling

```javascript
// Listen for special keys
app.on('keypad-backspace-ccx', () => {
  console.log('Backspace pressed');
  // Handle backspace
});

app.on('keypad-enter-ccx', () => {
  console.log('Enter pressed');
  // Handle enter/confirm
});

app.on('keypad-scape-ccx', () => {
  console.log('Escape pressed');
  // Handle escape/cancel
});
```

### Programmatic Visibility Control

```javascript
// Show keypad
world.emit('visibility-cc', { isVisible: true });

// Hide keypad
world.emit('visibility-cc', { isVisible: false });
```

### Server-Client Synchronization

```javascript
// Server-side visibility control
world.emit('receiver-id', { isVisible: true });
// This will automatically sync to all clients
```

## Best Practices

1. **Use Appropriate Keypad Type**: Choose letters for text input, numbers for numeric input
2. **Handle All Events**: Listen for all keypad events to provide complete functionality
3. **Test in Designer Mode**: Use designer mode to preview and test the keypad layout
4. **Configure Receiver ID**: Set a unique receiver ID for proper event handling
5. **Use Debug Mode**: Enable debug logs during development for troubleshooting

## Troubleshooting

### Keypad Not Showing

- Check that the node name is correct
- Verify that Designer Mode is enabled for testing
- Ensure the component is properly attached to a node

### Events Not Working

- Verify that the event listeners are set up correctly
- Check that the Receiver ID is configured properly
- Ensure the component is running in the correct context (client/server)

### UI Layout Issues

- Adjust the keypad type (letters vs numbers) for your use case
- Check that the node has sufficient space for the keypad UI
- Verify that the keypad dimensions are appropriate for your scene

## Version History

- **v1.0.0**: Initial release with basic keypad functionality
- **v1.1.0**: Added server-client synchronization
- **v1.2.0**: Added designer mode and improved UI customization

## License

MIT License - see LICENSE file for details.
