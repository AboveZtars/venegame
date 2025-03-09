# Vene Game - 3D Web Game

A 3D web game with character movement capabilities built with Three.js and TypeScript.

## Features

- 3D character with full movement controls:
  - Walk (WASD keys)
  - Run (Hold SHIFT while walking)
  - Jump (SPACE key)
  - Crouch (C key)
- Large floor/level canvas with grid
- Realistic lighting and shadows
- Responsive design that works on different screen sizes

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

Start the development server:

```bash
npm run dev
```

This will start a development server at http://localhost:3000

### Building for Production

Build the project for production:

```bash
npm run build
```

The production build will be available in the `dist` directory.

### Preview Production Build

Preview the production build:

```bash
npm run preview
```

## Project Structure

- `src/` - Source code
  - `components/` - Game components (Character, Floor, etc.)
  - `utils/` - Utility functions and helpers
  - `models/` - 3D models and assets
  - `textures/` - Texture files
  - `main.ts` - Main application entry point

## Tech Stack

- [Three.js](https://threejs.org/) - 3D JavaScript library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## Future Enhancements

- Add more detailed 3D models
- Implement game physics using a physics engine
- Add collectible items in the game world
- Create multiple levels
- Add enemy characters and gameplay objectives
