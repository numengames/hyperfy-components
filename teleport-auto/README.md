# Teleport Auto Component for Hyperfy

This component implements automatic teleportation functionality based on proximity, teleporting players when they enter a configured activation zone.

## Features

- Proximity-based automatic teleportation system
- Configurable cooldown between teleports
- Rotation animation with adjustable speed
- Visual interface that displays information when approaching
- Flexible node naming configuration
- Sound effects for teleportation
- Position customization for portals and destinations
- Trigger zones with adjustable radius
- Comprehensive debug logging options

## How It Works

The teleport auto component creates interactive teleportation zones in your Hyperfy world:

1. When a player enters the configured trigger radius, they are automatically teleported
2. The component displays a visual interface as players approach the teleportation zone
3. Optional rotation animations and sound effects enhance the user experience
4. A configurable cooldown prevents repeated teleportations

The component is designed to create seamless transitions between different areas of your world, without requiring player interaction.

## Usage

1. Add the teleport auto component to your Hyperfy world
2. Configure the base name for your teleportation nodes
3. Set the destination coordinates for teleportation
4. Customize appearance, behavior, interface, and sound settings as needed
5. The component will automatically teleport players who enter the activation radius

## Configuration Options

### Basic Settings
- **Base node name**: Base name for teleportation nodes
- **Debug Mode**: Toggle debug messages (On/Off)
- **Teleport label**: Custom label shown on the interface
- **Node position**: X, Y, Z coordinates for node placement

### Destination Settings
- **Destination coordinates**: X, Y, Z coordinates for the destination point

### Behavior Settings
- **Cooldown**: Time in seconds between allowed teleportations (0-60 seconds)
- **Trigger Radius**: Distance in meters that activates automatic teleportation (0-10 meters)

### UI Settings
- **UI Display Radius**: Distance at which the interface display is activated
- **UI Position**: Customize X, Y, Z offsets for interface display

### Rotation Settings
- **Enable Rotation**: Toggle node rotation animation
- **Rotation Speed**: Control the rotation speed

### Sound Settings
- **Enable Sound**: Toggle sound effects for teleportation
- **Sound File**: Upload an .mp3 file for the teleportation effect
- **Volume**: Adjust sound volume level (0-1)

## Advanced Features

### Automatic Triggering System

The component features a sophisticated proximity detection system:

- It constantly monitors player positions relative to the teleportation node
- When a player enters the trigger radius, teleportation is automatically initiated
- The system prevents multiple consecutive teleportations through its cooldown mechanism
- UI elements appear gradually as players approach the teleportation zone

### Cooldown Management

To prevent teleportation spam or accidental repeated teleportations:

- The cooldown system tracks when a player was last teleported
- Configurable cooldown duration prevents repeated teleportations
- Debug mode provides visibility into the cooldown state

## Example Use Cases

- Create a network of automatic teleporters around your world
- Build quick travel systems between distant locations
- Design portal effects for transitioning between areas
- Create elevator-like vertical transportation systems
- Implement automatic entry points to special areas or experiences

## Compatibility

This component works with all Hyperfy worlds and can be attached to any 3D object. For best results, use with objects that have a clear visual indication of being a teleporter.

## Download

You can download the latest version of the Teleport Auto component here:

- [teleport-auto_20250411.hyp](https://statics.numinia.xyz/hyperfy-components/teleport-auto_20250411.hyp) - Latest version with automatic proximity teleportation

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor. 