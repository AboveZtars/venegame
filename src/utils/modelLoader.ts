import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader.js";

interface ModelAsset {
  id: string;
  url: string;
  enabled: boolean;
  description?: string;
  excludeMeshes?: string[]; // Names of meshes to exclude when loading
}

export class ModelLoader {
  private static gltfLoader = new GLTFLoader();
  private static fbxLoader = new FBXLoader();
  private static modelRegistry: Map<string, ModelAsset> = new Map();
  private static loadedModels: Map<
    string,
    {
      model: THREE.Group;
      animations: THREE.AnimationClip[];
    }
  > = new Map();

  /**
   * Register a new model asset
   * @param asset Model asset configuration
   */
  static registerModel(asset: ModelAsset): void {
    this.modelRegistry.set(asset.id, asset);
  }

  /**
   * Enable or disable a registered model
   * @param modelId The ID of the model to toggle
   * @param enabled Whether the model should be enabled
   */
  static setModelEnabled(modelId: string, enabled: boolean): void {
    const asset = this.modelRegistry.get(modelId);
    if (asset) {
      asset.enabled = enabled;
      this.modelRegistry.set(modelId, asset);
    }
  }

  /**
   * Set meshes to exclude for a registered model
   * @param modelId The ID of the model
   * @param meshNames Array of mesh names to exclude
   */
  static setExcludedMeshes(modelId: string, meshNames: string[]): void {
    const asset = this.modelRegistry.get(modelId);
    if (asset) {
      asset.excludeMeshes = meshNames;
      this.modelRegistry.set(modelId, asset);

      // If the model is already loaded, we need to clear it from the cache
      // so it will be reloaded with the new excludeMeshes setting
      if (this.loadedModels.has(modelId)) {
        console.log(
          `Clearing cached model ${modelId} to apply mesh exclusions`
        );
        this.loadedModels.delete(modelId);
      }
    } else {
      console.warn(
        `Cannot set excluded meshes: Model with ID ${modelId} not found in registry`
      );
    }
  }

  /**
   * Get all registered models
   * @returns Array of registered model assets
   */
  static getRegisteredModels(): ModelAsset[] {
    return Array.from(this.modelRegistry.values());
  }

  /**
   * Get enabled models
   * @returns Array of enabled model assets
   */
  static getEnabledModels(): ModelAsset[] {
    return Array.from(this.modelRegistry.values()).filter(
      (asset) => asset.enabled
    );
  }

  /**
   * Load a specific model by ID
   * @param modelId The ID of the model to load
   * @param onProgress Optional progress callback
   * @returns Promise that resolves with the loaded model and animations
   */
  static async loadModelById(
    modelId: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<{model: THREE.Group; animations: THREE.AnimationClip[]} | null> {
    const asset = this.modelRegistry.get(modelId);
    if (!asset) {
      console.warn(`Model with ID ${modelId} not found in registry`);
      return null;
    }

    if (!asset.enabled) {
      console.warn(`Model with ID ${modelId} is disabled`);
      return null;
    }

    // console.log(`Loading model: ${modelId}`, {
    //   asset,
    //   allRegisteredModels: this.getRegisteredModels(),
    //   enabledModels: this.getEnabledModels(),
    //   alreadyLoadedModels: Array.from(this.loadedModels.keys()),
    // });

    // Check if model is already loaded
    const cached = this.loadedModels.get(modelId);
    if (cached) {
      return cached;
    }
    const result = await this.loadModel(
      asset.url,
      onProgress,
      asset.excludeMeshes
    );

    this.loadedModels.set(modelId, result);
    return result;
  }

  /**
   * Load a GLTF/GLB model from a URL
   * @param url Path to the model file
   * @param onProgress Optional progress callback
   * @param excludeMeshes Optional array of mesh names to exclude from the model
   * @returns Promise that resolves with the loaded model and animations
   */
  static loadModel(
    url: string,
    onProgress?: (event: ProgressEvent) => void,
    excludeMeshes?: string[]
  ): Promise<{model: THREE.Group; animations: THREE.AnimationClip[]}> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Enable shadows for all meshes in the model and handle excluded meshes
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Check if this mesh should be excluded
              if (
                excludeMeshes &&
                excludeMeshes.some(
                  (name) =>
                    child.name.includes(name) ||
                    child.name.toLowerCase() === name.toLowerCase()
                )
              ) {
                // Make the mesh invisible
                child.visible = false;
              } else {
                // Enable shadows for included meshes
                child.castShadow = true;
                child.receiveShadow = true;
              }
            }
          });

          // Extract animation clips from the GLTF
          const animations = gltf.animations || [];

          // Log all assets in the GLB model
          console.log("GLB Model Structure:", url);
          const meshes: string[] = [];
          const disabledMeshes: string[] = [];
          const materials: string[] = [];
          const textures: Set<string> = new Set();
          const bones: string[] = [];

          model.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              if (object.visible) {
                meshes.push(`${object.name} (${object.type})`);
              } else {
                disabledMeshes.push(`${object.name} (${object.type})`);
              }

              // Log materials
              if (object.material) {
                const mats = Array.isArray(object.material)
                  ? object.material
                  : [object.material];
                mats.forEach((mat) => {
                  materials.push(`${mat.name || "unnamed"} (${mat.type})`);

                  // Check for textures in material properties
                  Object.entries(mat).forEach(([key, value]) => {
                    if (value instanceof THREE.Texture && value.image) {
                      textures.add(
                        `${key}: ${
                          value.image.src
                            ? value.image.src.split("/").pop()
                            : "embedded"
                        }`
                      );
                    }
                  });
                });
              }
            }

            if (
              object.type === "Bone" ||
              object.name.includes("Bone") ||
              object.name.includes("bone")
            ) {
              bones.push(object.name);
            }
          });

          console.log({
            meshCount: meshes.length,
            meshes,
            disabledMeshCount: disabledMeshes.length,
            disabledMeshes,
            materialCount: materials.length,
            materials,
            textureCount: textures.size,
            textures: Array.from(textures),
            boneCount: bones.length,
            bones:
              bones.length > 20
                ? [...bones.slice(0, 20), `... and ${bones.length - 20} more`]
                : bones,
            animationCount: animations.length,
            animations: animations.map((a) => a.name),
          });

          console.log(
            "Loaded animations:",
            animations.map((a) => a.name)
          );

          resolve({model, animations});
        },
        onProgress,
        (error) => {
          console.error("Error loading model:", error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load external animations from a FBX file
   * @param url Path to the animation model file
   * @param targetNames Optional array of animation names to look for
   * @param onProgress Optional progress callback
   * @returns Promise that resolves with an array of animation clips
   */
  static loadExternalAnimations(
    url: string,
    targetNames?: string[],
    onProgress?: (event: ProgressEvent) => void
  ): Promise<THREE.AnimationClip[]> {
    return new Promise((resolve, reject) => {
      console.log(`Starting to load animations from FBX: ${url}`);

      this.fbxLoader.load(
        url,
        (fbx) => {
          // Extract animation clips from the FBX
          console.log("fbx animations", fbx.animations);
          let animations = fbx.animations || [];
          console.log("hola2");
          console.log(`Loaded FBX file with ${animations.length} animations`);

          // Log the structure of the loaded FBX
          console.log("FBX structure:", {
            animationCount: animations.length,
            animationNames: animations.map((a) => a.name),
            childrenCount: fbx.children.length,
          });

          // Filter by target names if provided
          if (targetNames && targetNames.length > 0) {
            console.log(
              `Filtering animations by names: ${targetNames.join(", ")}`
            );
            animations = animations.filter((anim) =>
              targetNames.some((name) =>
                anim.name.toLowerCase().includes(name.toLowerCase())
              )
            );
          }

          // Remap animation tracks to match the model's bone structure
          animations = animations.map((clip) =>
            this.remapAnimationTracks(clip)
          );

          console.log(
            "Loaded external animations from FBX:",
            animations.map((a) => a.name)
          );

          resolve(animations);
        },
        onProgress,
        (error) => {
          console.error("Error loading FBX animations:", error);
          reject(error);
        }
      );
    });
  }

  /**
   * Remaps animation track names to match the model's bone structure
   * @param clip The animation clip to remap
   * @returns The remapped animation clip
   */
  private static remapAnimationTracks(
    clip: THREE.AnimationClip
  ): THREE.AnimationClip {
    // Create a new clip with the same name and duration
    const newClip = new THREE.AnimationClip(clip.name, clip.duration, []);

    // Define the bone name mapping from animation bones to model bones
    const boneMapping: {[key: string]: string} = {
      mixamorigHips: "Hips",
      mixamorigSpine: "Spine",
      mixamorigSpine1: "Spine1",
      mixamorigSpine2: "Spine2", // Map to closest match
      mixamorigNeck: "Neck",
      mixamorigHead: "Head",
      mixamorigLeftShoulder: "LeftShoulder",
      mixamorigLeftArm: "LeftArm",
      mixamorigLeftForeArm: "LeftForeArm",
      mixamorigLeftHand: "LeftHand",
      mixamorigLeftHandThumb1: "LeftHandThumb1",
      mixamorigLeftHandThumb2: "LeftHandThumb2",
      mixamorigLeftHandThumb3: "LeftHandThumb3",
      mixamorigLeftHandIndex1: "LeftHandIndex1",
      mixamorigLeftHandIndex2: "LeftHandIndex2",
      mixamorigLeftHandIndex3: "LeftHandIndex3", // Map to closest match
      mixamorigLeftHandMiddle1: "LeftHandMiddle1",
      mixamorigLeftHandMiddle2: "LeftHandMiddle2",
      mixamorigLeftHandMiddle3: "LeftHandMiddle3", // Map to closest match
      mixamorigLeftHandRing1: "LeftHandPinky1", // Map to closest match
      mixamorigLeftHandRing2: "LeftHandPinky2", // Map to closest match
      mixamorigLeftHandRing3: "LeftHandPinky3", // Map to closest match
      mixamorigLeftHandPinky1: "LeftHandPinky1",
      mixamorigLeftHandPinky2: "LeftHandPinky2",
      mixamorigLeftHandPinky3: "LeftHandPinky3", // Map to closest match
      // Fix right side mappings to correctly map to right side bones
      mixamorigRightShoulder: "RightShoulder",
      mixamorigRightArm: "RightArm",
      mixamorigRightForeArm: "RightForeArm",
      mixamorigRightHand: "RightHand",
      mixamorigRightHandThumb1: "RightHandThumb1",
      mixamorigRightHandThumb2: "RightHandThumb2",
      mixamorigRightHandThumb3: "RightHandThumb3",
      mixamorigRightHandIndex1: "RightHandIndex1",
      mixamorigRightHandIndex2: "RightHandIndex2",
      mixamorigRightHandIndex3: "RightHandIndex3", // Map to closest match
      mixamorigRightHandMiddle1: "RightHandMiddle1",
      mixamorigRightHandMiddle2: "RightHandMiddle2",
      mixamorigRightHandMiddle3: "RightHandMiddle3", // Map to closest match
      mixamorigRightHandRing1: "RightHandPinky1", // Map to closest match
      mixamorigRightHandRing2: "RightHandPinky2", // Map to closest match
      mixamorigRightHandRing3: "RightHandPinky3", // Map to closest match
      mixamorigRightHandPinky1: "RightHandPinky1",
      mixamorigRightHandPinky2: "RightHandPinky2",
      mixamorigRightHandPinky3: "RightHandPinky3", // Map to closest match
      mixamorigLeftUpLeg: "LeftUpLeg",
      mixamorigLeftLeg: "LeftLeg",
      mixamorigLeftFoot: "LeftFoot",
      mixamorigLeftToeBase: "LeftToeBase",
      // Fix right leg mappings to correctly map to right side bones
      mixamorigRightUpLeg: "RightUpLeg",
      mixamorigRightLeg: "RightLeg",
      mixamorigRightFoot: "RightFoot",
      mixamorigRightToeBase: "RightToeBase",
    };

    // Root bone names that we should remove position tracks from to prevent root motion
    const rootBoneNames = [
      "mixamorigHips",
      "Hips",
      "Root",
      "Character",
      "Armature",
    ];

    // Process each track in the original clip
    for (const track of clip.tracks) {
      // Get the bone name and property from the track name (format: "boneName.property")
      const [boneName, property] = track.name.split(".");

      // Skip position tracks for root bones to prevent character flying away
      if (rootBoneNames.includes(boneName) && property.includes("position")) {
        console.log(
          `Skipping root motion track: ${track.name} to prevent flying`
        );
        continue;
      }

      // Check if we have a mapping for this bone
      if (boneName in boneMapping) {
        // Create a new track with the mapped bone name
        const newTrackName = `${boneMapping[boneName]}.${property}`;

        // Clone the track and update its name
        let newTrack;

        // Create the appropriate track type
        if (track instanceof THREE.QuaternionKeyframeTrack) {
          newTrack = new THREE.QuaternionKeyframeTrack(
            newTrackName,
            track.times,
            track.values.slice()
          );
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          newTrack = new THREE.VectorKeyframeTrack(
            newTrackName,
            track.times,
            track.values.slice()
          );
        } else if (track instanceof THREE.NumberKeyframeTrack) {
          newTrack = new THREE.NumberKeyframeTrack(
            newTrackName,
            track.times,
            track.values.slice()
          );
        } else {
          // For any other track type, try to create a generic KeyframeTrack
          newTrack = new THREE.KeyframeTrack(
            newTrackName,
            track.times,
            track.values.slice(),
            track.getInterpolation()
          );
        }

        // Add the new track to our new clip
        newClip.tracks.push(newTrack);

        // console.log(`Remapped track: ${track.name} -> ${newTrackName}`);
      } else {
        // If no mapping exists, keep the original track unless it's a root position track
        if (rootBoneNames.includes(boneName) && property.includes("position")) {
          // console.log(`Skipping unmapped root motion track: ${track.name}`);
          continue;
        }

        // console.log(`No mapping for track: ${track.name}, keeping original`);
        newClip.tracks.push(track);
      }
    }

    // Return the new clip with remapped tracks
    return newClip;
  }

  // Helper method to get target bone names from animation tracks
  private static getTargetBones(animation: THREE.AnimationClip): string[] {
    const boneNames = new Set<string>();

    for (const track of animation.tracks) {
      // Extract the bone name from the track name (format is usually "boneName.property")
      const boneName = track.name.split(".")[0];
      boneNames.add(boneName);
    }

    return Array.from(boneNames);
  }

  // Helper method to get track types
  private static getTrackTypes(
    animation: THREE.AnimationClip
  ): Record<string, number> {
    const types: Record<string, number> = {};

    for (const track of animation.tracks) {
      const type = track.ValueTypeName;
      types[type] = (types[type] || 0) + 1;
    }

    return types;
  }

  // Helper method to describe object structure
  private static getObjectStructure(
    object: THREE.Object3D,
    depth: number = 0,
    maxDepth: number = 3
  ): any {
    if (depth > maxDepth) return "... (max depth reached)";

    const result: any = {
      name: object.name,
      type: object.type,
    };

    if ("isBone" in object && object.isBone === true) {
      result.isBone = true;
    }

    if (object instanceof THREE.Mesh) {
      result.isMesh = true;
    }

    if (object.children && object.children.length > 0) {
      if (object.children.length <= 5 || depth < 1) {
        result.children = object.children.map((child) =>
          this.getObjectStructure(child, depth + 1, maxDepth)
        );
      } else {
        result.children = `${object.children.length} children (not expanded)`;
      }
    }

    return result;
  }

  /**
   * Get all mesh names from a loaded model
   * @param modelId The ID of the loaded model
   * @returns Array of mesh names or null if the model isn't loaded
   */
  static getMeshNames(modelId: string): string[] | null {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      console.warn(
        `Cannot get mesh names: Model with ID ${modelId} is not loaded`
      );
      return null;
    }

    const meshNames: string[] = [];
    loadedModel.model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshNames.push(object.name);
      }
    });

    return meshNames;
  }
}
