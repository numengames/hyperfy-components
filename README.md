# Hyperfy Components

A collection of reusable components for Hyperfy virtual worlds. These plug-and-play solutions enhance your Hyperfy projects with features like player respawn systems, interactive elements, animations, and event-driven behaviors. All components are well-documented, thoroughly tested, and ready to use in any Hyperfy world.

## Available Components

### Core Animation Components

#### **Visibility Controller** (`visibility/`)
Manages the visibility and collision state of 3D objects with event-driven control. Perfect for creating interactive elements that appear/disappear based on player actions or triggers. [Learn more](./visibility/README.md)

#### **Rotate Controller** (`rotate/`)
Provides smooth 3D object rotation animations with configurable speed, delays, and event-driven control. Supports both target-based and continuous rotation modes. [Learn more](./rotate/README.md)

#### **Translate Controller** (`translate/`)
Handles smooth 3D object translation animations with configurable speed, delays, and event-driven control. Perfect for moving platforms, doors, and interactive elements. [Learn more](./translate/README.md)

### Interactive Components

#### **Emitter Controller** (`emitter/`)
Creates interactive trigger zones that emit events when players interact with them. Supports both manual (key-based) and automatic (proximity-based) triggering modes. [Learn more](./emitter/README.md)

#### **Teleport Controller** (`teleport/`)
Implements teleportation functionality that moves players to specific locations when triggered. Perfect for creating portals, fast travel systems, and spatial navigation. [Learn more](./teleport/README.md)

#### **Redirect Controller** (`redirect/`)
Handles external URL redirection when triggered by events. Opens websites or external resources in new browser windows/tabs. [Learn more](./redirect/README.md)

#### **Dialog Controller** (`dialog/`)
Interactive dialog system for character conversations with support for multiple lines, character names, auto-advance, and text splitting. Perfect for creating immersive storytelling experiences. [Learn more](./dialog/README.md)

#### **Logs Controller** (`logs/`)
Centralized logging system that handles debug messages across all components. Provides unified logging interface with support for different log levels and server-client synchronization. [Learn more](./logs/README.md)

#### **Keyboard Controller** (`keyboard/`)
Virtual keyboard component that provides on-screen keypad functionality. Supports both letter and number keypads with customizable appearance and event-driven interactions. [Learn more](./keyboard/README.md)

#### **Password Manager** (`password-manager/`)
Secure password management component with input UI, validation, and keyboard integration. Provides password-protected access to features and seamless integration with keyboard components. [Learn more](./password-manager/README.md)

#### **Privacy Policy** (`privacy-policy/`)
Privacy policy display component that shows privacy policy information to users. Provides a clean interface for displaying legal information and terms of service. [Learn more](./privacy-policy/README.md)

### Legacy Components

#### **Respawn System** (`respawn/`)
The respawn component tracks player positions and automatically returns them to their last safe position when they fall below a configurable threshold. [Learn more](./respawn/README.md)

## Key Features

- **Event-Driven Architecture**: All components communicate through a unified event system
- **Server-Client Synchronization**: Multiplayer-ready with automatic state synchronization
- **Collision Management**: Built-in collision detection and physics integration
- **Comprehensive Testing**: All components include extensive test suites with >95% coverage
- **Debug Support**: Built-in logging and debugging capabilities
- **Flexible Configuration**: Highly configurable through Hyperfy's UI system
- **Documentation**: Complete documentation with examples and best practices

## Installation

Each component is available as an individual .hyp file that can be imported into your Hyperfy world. Check the component's documentation for specific installation instructions.

## Development

This project uses Jest for testing and follows a consistent architecture pattern across all components. Each component includes:

- Main component file (`.js`)
- Comprehensive test suite (`.test.js`)
- Detailed documentation (`README.md`)
- Configuration through `getConfig()` static method

## License

This project is licensed under the MIT License - see the LICENSE file for details.
