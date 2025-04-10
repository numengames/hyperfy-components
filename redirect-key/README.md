# Redirect Key Component for Hyperfy

An interactive component that lets users click on objects to be redirected to external websites or URLs.

## Features

- Click-based URL redirection system
- One-time activation (redirects immediately upon interaction)
- Rotation animation with adjustable speed
- Sound effects for redirection
- Position customization for interactive objects
- Flexible URL configuration options with new window support
- Adjustable trigger distance for interaction
- Signal emission system for notifying other components
- Comprehensive debug logging options

## How It Works

The component transforms any 3D object into an interactive portal that can redirect users to external websites:

1. When a player approaches the object, they see an interaction prompt
2. Upon interaction, the component can optionally emit a signal to other components
3. The player is then immediately redirected to the configured URL
4. Optional sound effects and animations enhance the user experience

## Usage

1. Add the redirect-key component to your Hyperfy world
2. Configure the base node name to match your target object
3. Set up the destination URL for redirection
4. Customize appearance, behavior, and sound settings as needed
5. Configure signal emission if you want to notify other components
6. Test the redirect functionality in your world

## Configuration Options

### Basic Settings
- **Base node name**: Set the base name for the redirect nodes
- **Debug Mode**: Toggle debug messages (On/Off)
- **Redirect label**: Custom label shown on interaction prompt
- **Node position**: X, Y, Z coordinates for placement

### Redirect Settings
- **Redirect Type**: Choose between external URL or internal position
- **Destination URL**: The web address users will be redirected to
- **Open in New Window**: Toggle whether links open in new tab or same window
- **Trigger Distance**: Distance in meters that activates redirect prompt (0-10 meters)

### Rotation Settings
- **Enable Rotation**: Toggle object rotation animation
- **Rotation Speed**: Control the speed of rotation

### Sound Settings
- **Enable Sound**: Toggle sound effects for redirection
- **Sound File**: Upload an .mp3 file for redirect effect
- **Volume**: Adjust sound volume level (0-1)

### Emitter Settings
- **Enable Emitter**: Toggle signal emission when redirect is triggered
- **Signal Name**: Name of the signal to emit (must match receiver configurations)

## Advanced Features

### Signal System

The component can emit signals that other components can listen for, enabling:

- Tracking when redirects occur
- Triggering custom behaviors in response to redirections
- Coordinating multiple components in a scene
- Building analytics or user interaction systems

### Signal Data Format

When a redirect occurs, the emitted signal includes:

```javascript
{
  position: [x, y, z],        // Position of the redirect node
  redirectUrl: "https://...", // URL the user is being redirected to
  redirectType: "external",   // Type of redirect (external/internal)
  timestamp: 1234567890,      // Timestamp when the redirect occurred
  source: "redirect-key",     // Component identifier 
  nodeName: "myNode"          // Name of the node that triggered the redirect
}
```

### Creating Receivers

To listen for these signals, create a component that:

1. Configures the same signal name
2. Sets up a listener with `world.on(signalName, handlerFunction)`
3. Processes the signal data as needed

See the `signal-receiver-test.js` file for a sample implementation.

## Example Use Cases

- Add clickable links to information panels or displays
- Create portal objects that transport users to other websites
- Build interactive product showcases with links to purchase pages
- Develop in-world advertising with trackable click-through rates
- Connect multiple experiences across different Hyperfy worlds

## Technical Implementation

The component uses a modular architecture:

- Clean separation between configuration and functionality
- Efficient resource management with proper cleanup
- Comprehensive error handling for robustness
- Optional features that only activate when needed
- Signal emission that's fully configurable and optional

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. It requires the object to be clickable/interactable.

## Download

You can download the latest version of the Redirect Key component here:

- [redirect-key_20240701.hyp](https://statics.numinia.xyz/hyperfy-components/redirect-key_20240701.hyp) - Latest version with signal emission capability

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor.
