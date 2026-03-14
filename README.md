# Homebrew Physics Arcade

A browser mini-arcade built for fun experimentation with a custom 2D physics engine in vanilla JavaScript.

This project is not intended as a production game framework. It is a learning playground to test movement, gravity, collisions, bounce behavior, hazards, and level flow on the web.

Built by @jayyvarmaa

## Highlights

- One homebrew physics engine powering all game modes
- Five playable mini-levels with unique objectives
- Axis-aligned collision detection and resolution
- Elastic and non-elastic platform behavior
- Lives, hazards, coin collection, moving platforms
- In-game HUD with FPS and step timing
- Lightweight setup with no build tooling required

## Controls

- A: move left
- D: move right
- Space: jump
- S: fast-fall

## Games

1. Gateway Run
Reach the goal to finish.

2. Bounce Trial
Use orange bouncy platforms to chain jumps.

3. Coin Climber
Collect all coins, then reach the goal.

4. Moving Bridge
Time jumps using moving platforms.

5. Hazard Gauntlet
Avoid hazards and finish before lives run out.

## Quick Start

1. Clone or download this repository.
2. Open index.html in any modern browser.
3. Select a game from the Game dropdown.
4. Press Restart any time to retry the current level.

## Project Structure

```text
simple-2d-physics/
	index.html        # UI shell, controls, tutorial panel, canvas
	src/
		styles.css      # layout and visual styling
		main.js         # physics engine, game data, runtime loop
```

## Engine Overview

The runtime is organized around four core pieces:

- PhysicsEntity
Stores position, velocity, acceleration, dimensions, and collision attributes.

- CollisionDetector
Performs rectangle overlap checks.

- CollisionSolver
Resolves collisions as either displacement or elastic bounce.

- Engine
Runs per-frame integration, applies gravity, detects collisions, and resolves contact.

## Design Notes

- The engine uses axis-aligned rectangles for simplicity and speed.
- The system is intentionally compact and readable.
- Level behavior is data-driven through the GAMES configuration array.

## Future Ideas

- Sound effects and background music toggles
- Save best time per level
- Better camera and parallax backgrounds
- Touch controls for mobile play

## License

Use this project freely for personal learning and experimentation.
