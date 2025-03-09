# 3D Models Directory

This directory is for storing 3D models used in the game.

## How to Add Your Character Model

1. Place your 3D model file (preferably in GLB or GLTF format) in this directory
2. Rename your model to `character.glb` or update the path in `src/main.ts` to match your model's filename
3. If your model has different proportions or orientation:
   - Adjust the scale using `character.setModelScale(value)` in `src/main.ts`
   - Adjust the position offset using `character.setModelOffset(new THREE.Vector3(x, y, z))` in `src/main.ts`

## Model Requirements

- Formats: GLB or GLTF (preferred), FBX, OBJ
- Orientation: Model should face the negative Z-axis (forward)
- Scale: Approximately 1-2 units tall for proper proportions
- Origin: Model's origin should be at the bottom center of the model

## Troubleshooting

If your model doesn't appear:

1. Check the browser console for loading errors
2. Verify the file path is correct
3. Try a different model format
4. Ensure the model file is not too large (keep under 10MB if possible)
