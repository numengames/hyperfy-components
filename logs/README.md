# Logs Component

A centralized logging system component for Hyperfy that handles debug messages from any source. This component provides a unified logging interface with support for different log levels and server-client synchronization.

## Features

- **Centralized Logging**: Single point for all log messages
- **Multiple Log Levels**: Support for log, info, warn, error, and debug levels
- **Server-Client Sync**: Optional synchronization of server logs to client
- **Event-Driven**: Responds to log events from any source
- **Configurable**: Toggle server logs visibility in client

## Installation

1. Copy the `logs.js` file to your Hyperfy project
2. Attach the script to a node in your scene
3. Configure the component through the Hyperfy UI

## Configuration

The logs component provides the following configuration options:

### Logs Settings

- **Server Logs in Client**: Enable this if you want to see server logs in the client

## Usage

### From Any Source

Any script or component can emit log events using the world event system:

```javascript
// Emit a log event from any script or component
world.emit('log', {
  message: 'Script initialized successfully',
  type: 'info'
});

// Different log levels
world.emit('log', { message: 'Debug information', type: 'debug' });
world.emit('log', { message: 'Warning message', type: 'warn' });
world.emit('log', { message: 'Error occurred', type: 'error' });
```

### Supported Log Types

- `log`: General log messages
- `info`: Informational messages
- `warn`: Warning messages
- `error`: Error messages
- `debug`: Debug messages

## Examples

### Basic Logging

```javascript
// Simple info log
world.emit('log', {
  message: 'User clicked button',
  type: 'info'
});
```

### Error Logging

```javascript
// Error logging
world.emit('log', {
  message: 'Failed to load texture: texture.png',
  type: 'error'
});
```

### Debug Information

```javascript
// Debug logging
world.emit('log', {
  message: 'Current position: x=10, y=5, z=0',
  type: 'debug'
});
```

### Server-Side Logging

```javascript
// Server-side logging (will appear in client if enabled)
world.emit('log', {
  message: 'Server processed request',
  type: 'info'
});
```

## Best Practices

1. **Use Appropriate Log Levels**: Choose the right log level for your message
2. **Keep Messages Concise**: Use clear, descriptive log messages
3. **Include Context**: Add relevant context to help with debugging
4. **Use Debug Sparingly**: Only use debug logs for development, not production
5. **Enable Server Logs**: Use server logs in client for debugging multiplayer issues

## Troubleshooting

### Logs Not Appearing

- Check that the logs component is properly attached to a node
- Verify that the script emitting the log is using the correct event format
- Ensure the log type is valid (log, info, warn, error, debug)

### Server Logs Not Showing in Client

- Enable "Server Logs in Client" in the logs component configuration
- Verify that the script is running on the server side
- Check network connectivity in multiplayer environments

### Console Methods Not Working

- The component automatically falls back to `console.log` if specific console methods are unavailable
- This ensures logging works across different environments

## Version History

- **v1.0.0**: Initial release with basic logging functionality
- **v1.1.0**: Added server-client synchronization
- **v1.2.0**: Refactored to class-based architecture for better testability

## License

MIT License - see LICENSE file for details.
