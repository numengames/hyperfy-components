# Respawn Component for Hyperfy

This component tracks player positions and automatically returns them to their last safe position when they fall below a configurable threshold.

## Features

- Tracks player heights at configurable sampling rates
- Analyzes player movement to detect stable positions
- Intelligently detects when players are falling based on height history
- Teleports players back to their last known safe position when they fall
- Optional sound effect on respawn
- Comprehensive debug logging options

## How It Works

The respawn component continuously tracks the height of the player at configurable intervals. It uses this height history to:

1. Detect when a player is falling
2. Identify stable positions that can be considered "safe" for respawning
3. Teleport players back to their last safe position when they fall below a threshold

The component is designed to be intelligent about when to save safe positions, waiting until a player has been stable for a certain amount of time before considering their position "safe" for respawning.

## Usage

1. Add the respawn component to your Hyperfy world
2. Configure the fall threshold, height sampling rate, and other settings
3. The system will automatically track player positions and respawn them when needed
4. Place the component anywhere in your world (the position doesn't matter)

## Configuration Options

### Basic Settings
- **Base node name**: The name of the node in your 3D model (default: 'RespawnZone')
- **Debug Mode**: Enable to see detailed logs in the console

### Respawn Settings
- **Fall Y Threshold**: The Y coordinate difference to consider as a fall, triggering respawn (default: 4)
- **Position Tracking Interval**: How often player positions are recorded in seconds (default: 1)
- **Height History Length**: Number of height samples to keep for analyzing player movement (default: 5)
- **Height Sampling Rate**: How often to sample the player's movement in seconds - lower is more frequent (default: 0.2)
- **Safe Position Save Delay**: Time to wait before saving a position as safe (default: 1.5)
- **Significant Movement Threshold**: Minimum movement distance to consider as significant (default: 0.1)

### Feedback Settings
- **Enable Sound**: Whether to play a sound when a player is respawned (default: enabled)
- **Sound URL**: URL to the sound file to play when respawning
- **Sound Volume**: Volume of the respawn sound (0-1, default: 0.5)

## Advanced Features

### Intelligent Fall Detection

The component doesn't just respawn players when they go below a certain height. Instead, it analyzes the player's movement history to determine if they're actually falling:

- It tracks the player's height over time
- It analyzes the trend to determine if the player is falling (when more than 75% of recent height changes are downward)
- This prevents respawns during normal activities like walking down stairs or slopes

### Stable Position Detection

The component also intelligently determines when a position should be considered "safe" for respawning:

- It waits until the player has been stable (minimal height changes) for a configured time
- It ensures the player isn't falling when saving a safe position
- It requires significant movement from the previous safe position

## Example Use Cases

- Prevent players from falling into the void in elevated worlds
- Create a safety net for platforming challenges
- Ensure players don't get stuck in inaccessible areas

## Compatibility

This component works with all Hyperfy worlds and doesn't require any specific model. It can be added to any object in your scene.

## Download

You can download the latest version of the Respawn component here:

- [respawn_20240701.hyp](https://statics.numinia.xyz/hyperfy-components/respawn_20240701.hyp) - Latest version with intelligent fall detection and stable position tracking

To use this component in your Hyperfy world, download the .hyp file and import it into your project using the Hyperfy Editor.