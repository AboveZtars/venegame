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

interface LoadedModel {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
}

export class ModelLoader {
  private static gltfLoader = new GLTFLoader();
  private static fbxLoader = new FBXLoader();
  private static modelRegistry: Map<string, ModelAsset> = new Map();
  private static loadedModels: Map<string, LoadedModel> = new Map();

  // Root bone names that we should remove position tracks from to prevent root motion
  private static rootBoneNames = [
    "mixamorigHips",
    "Hips",
    "Root",
    "Character",
    "Armature",
  ];

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
  ): Promise<LoadedModel | null> {
    const asset = this.modelRegistry.get(modelId);
    if (!asset) {
      console.warn(`Model with ID ${modelId} not found in registry`);
      return null;
    }

    if (!asset.enabled) {
      console.warn(`Model with ID ${modelId} is disabled`);
      return null;
    }

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
  ): Promise<LoadedModel> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Process model meshes (apply shadows and handle exclusions)
          this.processMeshes(model, excludeMeshes);

          // Extract animation clips from the GLTF
          const animations = gltf.animations || [];

          // Log model structure
          this.logModelStructure(model, url, animations);

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
   * Processes meshes in a model (apply shadows and handle mesh exclusions)
   * @param model The model to process
   * @param excludeMeshes Optional array of mesh names to exclude
   */
  private static processMeshes(
    model: THREE.Group,
    excludeMeshes?: string[]
  ): void {
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
  }

  /**
   * Log the structure and contents of a loaded model
   * @param model The model to analyze
   * @param url The URL the model was loaded from
   * @param animations The animations from the model
   */
  private static logModelStructure(
    model: THREE.Group,
    url: string,
    animations: THREE.AnimationClip[]
  ): void {
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
   * Generate bone mapping between mixamorig bones and standard bone names
   * @returns Object with bone name mappings
   */
  private static generateBoneMapping(): {[key: string]: string} {
    const mapping: {[key: string]: string} = {};

    // Define bone names to map (without the side prefix)
    const boneNames = [
      "Hips",
      "Spine",
      "Spine1",
      "Spine2",
      "Neck",
      "Head",
      "Shoulder",
      "Arm",
      "ForeArm",
      "Hand",
      "HandThumb1",
      "HandThumb2",
      "HandThumb3",
      "HandIndex1",
      "HandIndex2",
      "HandIndex3",
      "HandMiddle1",
      "HandMiddle2",
      "HandMiddle3",
      "HandRing1",
      "HandRing2",
      "HandRing3",
      "HandPinky1",
      "HandPinky2",
      "HandPinky3",
      "UpLeg",
      "Leg",
      "Foot",
      "ToeBase",
    ];

    // Define sides
    const sides = ["Left", "Right"];

    // Add mapping for central bones (no side prefix)
    ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"].forEach((bone) => {
      mapping[`mixamorig${bone}`] = bone;
    });

    // Add mapping for sided bones
    sides.forEach((side) => {
      boneNames.forEach((bone) => {
        // Skip central bones that don't have sides
        if (
          ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"].includes(bone)
        ) {
          return;
        }

        mapping[`mixamorig${side}${bone}`] = `${side}${bone}`;
      });
    });

    // Add special mappings for ring fingers to pinky (since some models use different names)
    sides.forEach((side) => {
      ["Ring1", "Ring2", "Ring3"].forEach((ringPart, i) => {
        mapping[`mixamorig${side}Hand${ringPart}`] = `${side}HandPinky${i + 1}`;
      });
    });

    return mapping;
  }

  /**
   * Create a new keyframe track of the appropriate type
   * @param trackName The name for the new track
   * @param originalTrack The original track to copy data from
   * @returns A new keyframe track
   */
  private static createNewTrack(
    trackName: string,
    originalTrack: THREE.KeyframeTrack
  ): THREE.KeyframeTrack {
    if (originalTrack instanceof THREE.QuaternionKeyframeTrack) {
      return new THREE.QuaternionKeyframeTrack(
        trackName,
        originalTrack.times,
        originalTrack.values.slice()
      );
    } else if (originalTrack instanceof THREE.VectorKeyframeTrack) {
      return new THREE.VectorKeyframeTrack(
        trackName,
        originalTrack.times,
        originalTrack.values.slice()
      );
    } else if (originalTrack instanceof THREE.NumberKeyframeTrack) {
      return new THREE.NumberKeyframeTrack(
        trackName,
        originalTrack.times,
        originalTrack.values.slice()
      );
    } else {
      // For any other track type, try to create a generic KeyframeTrack
      return new THREE.KeyframeTrack(
        trackName,
        originalTrack.times,
        originalTrack.values.slice(),
        originalTrack.getInterpolation()
      );
    }
  }

  /**
   * Check if a track is a root position track that should be skipped
   * @param boneName The name of the bone
   * @param property The property of the track
   * @returns Whether the track should be skipped
   */
  private static isRootPositionTrack(
    boneName: string,
    property: string
  ): boolean {
    return (
      this.rootBoneNames.includes(boneName) && property.includes("position")
    );
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

    // Get the bone mapping
    const boneMapping = this.generateBoneMapping();

    // Process each track in the original clip
    for (const track of clip.tracks) {
      // Get the bone name and property from the track name (format: "boneName.property")
      const [boneName, property] = track.name.split(".");

      // Skip position tracks for root bones to prevent character flying away
      if (this.isRootPositionTrack(boneName, property)) {
        console.log(
          `Skipping root motion track: ${track.name} to prevent flying`
        );
        continue;
      }

      // Check if we have a mapping for this bone
      if (boneName in boneMapping) {
        // Create a new track with the mapped bone name
        const newTrackName = `${boneMapping[boneName]}.${property}`;

        // Create new track with appropriate type
        const newTrack = this.createNewTrack(newTrackName, track);

        // Add the new track to our new clip
        newClip.tracks.push(newTrack);
      } else {
        // If no mapping exists, keep the original track unless it's a root position track
        if (this.isRootPositionTrack(boneName, property)) {
          continue;
        }

        newClip.tracks.push(track);
      }
    }

    // Return the new clip with remapped tracks
    return newClip;
  }

  // // Helper method to get target bone names from animation tracks
  // private static getTargetBones(animation: THREE.AnimationClip): string[] {
  //   const boneNames = new Set<string>();

  //   for (const track of animation.tracks) {
  //     // Extract the bone name from the track name (format is usually "boneName.property")
  //     const boneName = track.name.split(".")[0];
  //     boneNames.add(boneName);
  //   }

  //   return Array.from(boneNames);
  // }

  // // Helper method to get track types
  // private static getTrackTypes(
  //   animation: THREE.AnimationClip
  // ): Record<string, number> {
  //   const types: Record<string, number> = {};

  //   for (const track of animation.tracks) {
  //     const type = track.ValueTypeName;
  //     types[type] = (types[type] || 0) + 1;
  //   }

  //   return types;
  // }

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
