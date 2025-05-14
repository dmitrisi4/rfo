# RF Online MOBA Game

A MOBA game inspired by RF Online using BabylonJS for rendering. This project features a three-tower lane system with heroes and mechanics from the RF Online universe.

## Project Structure

```
src/
├── assets/      # Game assets (models, textures, sounds)
├── components/  # Game components (heroes, towers, etc.)
├── scenes/      # Game scenes (main menu, gameplay, etc.)
└── utils/       # Utility functions and helpers
```

## Prerequisites

- Node.js (v14+)
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Development

To start the development server:

```bash
npm start
```

This will start a development server at http://localhost:9000

## Building

To build the game for production:

```bash
npm run build
```

The output will be in the `dist` directory.

## Project Tasks

See [TASKS.md](TASKS.md) for the complete list of project tasks and their status.

## License

MIT

## 🌌 Project Overview

This project aims to bring the immersive and faction-driven world of RF Online into a competitive MOBA format. Players will choose heroes from different RF races (Bellato, Cora, Accretia), engage in team-based battles, and fight for control across a three-tower lane map.

## 🚧 Development Roadmap

### 1. Project Setup
- BabylonJS integration
- Build system configuration
- CI/CD and testing infrastructure

### 2. Game Design
- Core mechanics & rules
- Hero and map design
- Art style guide based on RF Online

### 3. Core Engine
- Game loop and state management
- ECS pattern
- Basic physics and input handling

### 4. Multiplayer & Networking
- Client-server architecture
- State sync, matchmaking, lag compensation
- Dedicated server setup

### 5. Map & Environment
- Three-lane MOBA map
- Tower and jungle area design
- Spawning and environmental art

### 6. Character System
- RF race-based characters
- Progression and customization systems

### 7. Hero Development
- 10 total heroes
- Abilities, animations, and balancing
- Hero selection UI

### 8. Combat System
- Auto-attacks and ability casting
- Cooldowns, CC, damage calculation

### 9. AI Systems
- Minion, tower, jungle AI
- Practice bots and pathfinding

### 10. User Interface
- In-game HUD and minimap
- Scoreboard, ping system, menus

### 11. Game Systems
- Item shop and gold economy
- Respawn, win conditions, match phases
- Spectator mode

### 12. Audio
- BGM, ability SFX, voice lines, ambient sounds

### 13. Visual Effects
- VFX for spells, hits, deaths, environment

### 14. Optimization
- LODs, memory and network optimization

### 15. QA and Testing
- Performance and balance testing
- User playtesting and automation

### 16. Deployment & Operations
- Live server setup
- Monitoring, analytics, patching system
- Community management

### 17. Polish & Features
- Tutorial and achievements
- Seasonal events
- Social systems and moderation

## 🛠️ Tech Stack

- **Engine**: BabylonJS
- **Languages**: TypeScript / JavaScript
- **Networking**: WebSockets / Custom backend
- **Build Tools**: Vite / Webpack
- **CI/CD**: GitHub Actions / Docker (planned)

## 🎯 Goals

- Faithfully adapt RF Online universe into MOBA format
- Deliver responsive and visually engaging gameplay
- Ensure scalable multiplayer infrastructure

## 📂 Project Structure (Planned)