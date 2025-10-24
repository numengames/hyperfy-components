# Password Manager Component

A secure password management component for Hyperfy that provides password input UI, validation, and integration with keyboard components.

## Features

- **Password Input UI**: Clean, customizable password input interface
- **Password Validation**: Secure password checking against master password
- **Keyboard Integration**: Works seamlessly with keyboard components
- **Designer Mode**: Test password UI in designer mode
- **Server-Client Sync**: Multiplayer synchronization support
- **Event-Driven**: Responds to external triggers from other components
- **Configurable**: Full control over appearance and behavior

## Installation

1. Copy the `password-manager.js` script to your Hyperfy project
2. Attach the script to a node in your scene
3. Configure the component through the Hyperfy UI

## Configuration

### Basic Settings

- **App ID**: Unique identifier for this password manager (max 10 characters)
- **Node Name**: Name of the node in the scene
- **Debug Mode**: Enable/disable debug logging
- **Add Collision**: Forces all meshes to have collision
- **Start Visible**: Initial visibility state of the node

### Password Manager Settings

- **Designer Mode**: Show password input UI in designer mode for testing
- **Master Password**: The password that will be validated against user input
- **Title**: Title displayed in the password input UI (default: "Enter Password")

### Signal Settings

- **Receiver ID**: ID for receiving visibility control signals from other components

## Usage Examples

### Basic Password Input

```javascript
// Show password input
world.emit('passwordManager123', {
  action: 'show-password-input'
});
```

### Hide Password Input

```javascript
// Hide password input
world.emit('passwordManager123', {
  action: 'hide-password-input'
});
```

### Validate Password Programmatically

```javascript
// Validate password
world.emit('passwordManager123', {
  action: 'validate-password',
  password: 'userInput'
});
```

## Action Types

### show-password-input
Shows the password input UI.

**Parameters**: None

### hide-password-input
Hides the password input UI.

**Parameters**: None

### validate-password
Validates a password against the master password.

**Parameters**:
- `password` (string): The password to validate

## Event Listeners

The component listens for the following events:

### Keyboard Events
- `keypad-character-ccx`: Adds character to password input
- `keypad-backspace-ccx`: Removes last character from password input
- `keypad-enter-ccx`: Triggers password validation

### Visibility Events
- `visibility-sc`: Controls password input visibility
- `visibility-cc`: Controls password input visibility

### Validation Events
- `validate-cs`: Server-side password validation request
- `validate-sc`: Client-side password validation response

## Emitted Events

The component emits the following events:

### Password Events
- `password-error-cc`: Emitted when password validation fails
- `password-success-cc`: Emitted when password validation succeeds

### Visibility Events
- `visibility-sc`: Sent to control other components' visibility
- `visibility-cc`: Sent to control other components' visibility

## Integration with Keyboard Component

The password manager is designed to work seamlessly with the keyboard component:

1. **Character Input**: Receives characters from keyboard component
2. **Backspace**: Handles backspace from keyboard component
3. **Enter**: Triggers validation when Enter is pressed
4. **Error Display**: Shows error messages for invalid passwords

## Server-Client Communication

The component supports multiplayer environments:

- **Server Context**: Relays visibility events to clients
- **Client Context**: Handles UI updates and user interactions
- **Synchronization**: Ensures consistent state across all clients

## Best Practices

### Security
- Use strong master passwords
- Consider implementing additional security measures
- Test password validation thoroughly

### UI Design
- Position the password input UI appropriately
- Test in designer mode before deployment
- Ensure good contrast for accessibility

### Integration
- Use consistent event naming conventions
- Test keyboard integration thoroughly
- Implement proper error handling

## Troubleshooting

### Password Input Not Showing
- Check that the node is visible
- Verify Receiver ID configuration
- Ensure proper event emission

### Keyboard Not Working
- Verify keyboard component is properly configured
- Check event naming consistency
- Test keyboard events independently

### Validation Issues
- Verify master password configuration
- Check password comparison logic
- Test with known good passwords

## Version History

- **v1.0.0**: Initial release with basic password management functionality
- **v1.1.0**: Added keyboard integration and improved UI
- **v1.2.0**: Added server-client synchronization
- **v1.3.0**: Refactored to follow standard component architecture

## License

MIT License - see LICENSE file for details.
