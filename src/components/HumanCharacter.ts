import * as THREE from "three";
import {InputControls} from "../utils/controls";
import {ModelLoader} from "../utils/modelLoader";

export class HumanCharacter {
  mesh: THREE.Object3D;
  model: THREE.Object3D | null = null;
  mixer: THREE.AnimationMixer | null = null;
  animations: {[key: string]: THREE.AnimationAction} = {};
  velocity: THREE.Vector3;
  isOnGround: boolean;
  controls: InputControls;
  moveSpeed: number;
  runSpeed: number;
  walkSpeed: number;
  currentSpeed: number;
  jumpForce: number;
  gravity: number;
  rotationSpeed: number;
  movementDirection: THREE.Vector3;
  isMoving: boolean;
  cameraRotation: number;
  targetSpeed: number;
  speedChangeRate: number;
  movementState: "run" | "normal" | "walk" | "idle" | "jump" | "jumpRun";
  modelOffset: THREE.Vector3;
  modelScale: number;
  isModelLoaded: boolean = false;
  wasRunningBeforeJump: boolean = false;

  constructor(scene: THREE.Scene, controls: InputControls) {
    this.controls = controls;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isOnGround = true;
    this.rotationSpeed = 10;
    this.movementDirection = new THREE.Vector3(0, 0, 0);
    this.isMoving = false;
    this.cameraRotation = Math.PI;
    this.modelOffset = new THREE.Vector3(0, 0, 0);
    this.modelScale = 1.0;

    // Movement properties
    this.moveSpeed = 5;
    this.runSpeed = 8;
    this.walkSpeed = 2;
    this.currentSpeed = this.moveSpeed;
    this.targetSpeed = this.moveSpeed;
    this.speedChangeRate = 5;
    this.jumpForce = 8;
    this.gravity = 25;
    this.movementState = "idle";

    // Create the mesh container for the model
    this.mesh = new THREE.Object3D();
    this.mesh.position.set(0, 0, 0);

    // Add to scene
    scene.add(this.mesh);

    // Register the models in the ModelLoader registry
    ModelLoader.registerModel({
      id: "humanCharacter",
      url: "/models/elDA.glb",
      enabled: true,
      description: "Main human character model",
    });

    // Exclude specific meshes from the human character model
    ModelLoader.setExcludedMeshes("humanCharacter", []);

    ModelLoader.registerModel({
      id: "idleAnimation",
      url: "/models/animations/Idle.fbx",
      enabled: true,
      description: "Idle animation for human character",
    });

    ModelLoader.registerModel({
      id: "walkAnimation",
      url: "/models/animations/Walking.fbx",
      enabled: true,
      description: "Walking animation for human character",
    });

    ModelLoader.registerModel({
      id: "runAnimation",
      url: "/models/animations/Run.fbx",
      enabled: true,
      description: "Running animation for human character",
    });

    ModelLoader.registerModel({
      id: "jumpAnimation",
      url: "/models/animations/Jump.fbx",
      enabled: true,
      description: "Jump animation for human character",
    });

    ModelLoader.registerModel({
      id: "jumpRunAnimation",
      url: "/models/animations/JumpWhileRunning.fbx",
      enabled: true,
      description: "Jump while running animation for human character",
    });

    // Load the model asynchronously
    this.loadModel(scene).catch((error) => {
      console.error("Failed to load character model:", error);
    });
  }

  // Load the 3D model
  async loadModel(scene: THREE.Scene) {
    try {
      // Use ModelLoader to load the model by ID
      const result = await ModelLoader.loadModelById(
        "humanCharacter",
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        }
      );

      if (!result) {
        throw new Error("Failed to load model: Model not found or disabled");
      }

      this.model = result.model;

      // Apply model properties using the new helper methods
      this.applyModelScale();
      this.applyModelOffset();

      // Make sure the model faces forward (negative Z)
      this.model.rotation.y = Math.PI;

      // Add the model to the mesh container
      this.mesh.add(this.model);

      // Create animation mixer
      this.mixer = new THREE.AnimationMixer(this.model);

      // Load animations
      await this.loadAnimations();

      this.isModelLoaded = true;
      console.log("Human character model loaded successfully");
    } catch (error) {
      console.error("Error loading model:", error);
    }
  }

  // Load animations
  async loadAnimations() {
    if (!this.mixer || !this.model) {
      console.warn("Cannot load animations: mixer or model not ready");
      return;
    }

    try {
      console.log("Starting to load character animations...");

      // Define all animations to load
      const animationsToLoad = [
        {id: "idleAnimation", name: "idle"},
        {id: "walkAnimation", name: "walk"},
        {id: "runAnimation", name: "run"},
        {id: "jumpAnimation", name: "jump"},
        {id: "jumpRunAnimation", name: "jumpRun"},
      ];

      // Register any animations that aren't already registered
      for (const anim of animationsToLoad) {
        if (
          !ModelLoader.getRegisteredModels().some(
            (model) => model.id === anim.id
          )
        ) {
          console.warn(
            `Animation ${anim.id} is not registered. Make sure to register it in the constructor.`
          );
        }
      }

      // Load all animations
      for (const anim of animationsToLoad) {
        console.log(`Loading animation: ${anim.name} (${anim.id})`);

        try {
          // Get the registered model to get the URL
          const registeredModel = ModelLoader.getRegisteredModels().find(
            (model) => model.id === anim.id
          );

          if (!registeredModel) {
            console.warn(`Animation ${anim.id} is not registered, skipping.`);
            continue;
          }

          // Use loadExternalAnimations for FBX animation files
          const animationClips = await ModelLoader.loadExternalAnimations(
            registeredModel.url
          );

          if (animationClips && animationClips.length > 0) {
            // Create animation action from the first animation clip
            const action = this.mixer.clipAction(animationClips[0]);

            // Store the animation in our animations dictionary
            this.animations[anim.name] = action;

            // Configure the animation based on its type
            if (anim.name === "run") {
              this.configureRunAnimation(action);
            } else if (anim.name === "jump" || anim.name === "jumpRun") {
              this.configureJumpAnimation(action);
            } else {
              // Default configuration for other animations
              action.clampWhenFinished = true;
              action.loop = THREE.LoopRepeat;
            }

            console.log(`Successfully loaded ${anim.name} animation`);
          } else {
            console.warn(
              `Failed to load ${anim.name} animation: No animation clips found`
            );
          }
        } catch (error) {
          console.error(`Error loading ${anim.name} animation:`, error);
        }
      }

      // Start with idle animation
      if (this.animations["idle"]) {
        this.animations["idle"].play();
        console.log("Started idle animation");
      }

      console.log("All animations loaded:", Object.keys(this.animations));
    } catch (error) {
      console.error("Error loading animations:", error);
    }
  }

  /**
   * Configure the run animation with specific settings
   */
  configureRunAnimation(action: THREE.AnimationAction) {
    // Run animation should loop continuously
    action.loop = THREE.LoopRepeat;

    // Don't clamp when finished since it should loop
    action.clampWhenFinished = false;

    // Optional: Adjust the time scale to control the speed of the run animation
    action.timeScale = 1.2; // Make it slightly faster than normal

    console.log("Run animation configured with custom settings");
  }

  /**
   * Configure jump animations with specific settings
   */
  configureJumpAnimation(action: THREE.AnimationAction) {
    // Jump animation should play once and not loop
    action.loop = THREE.LoopOnce;

    // Clamp when finished to hold the last frame
    action.clampWhenFinished = true;

    // Prevent animation blending issues
    action.reset();

    console.log(`Jump animation configured with custom settings`);
  }

  // HELPER METHODS FOR MODEL PROPERTIES

  /**
   * Apply model scale to the 3D model
   */
  private applyModelScale() {
    if (this.model) {
      this.model.scale.set(this.modelScale, this.modelScale, this.modelScale);
    }
  }

  /**
   * Apply model offset to the 3D model
   */
  private applyModelOffset() {
    if (this.model) {
      this.model.position.copy(this.modelOffset);
    }
  }

  /**
   * Set model scale and apply it
   */
  setModelScale(scale: number) {
    this.modelScale = scale;
    this.applyModelScale();
  }

  /**
   * Set model offset and apply it
   */
  setModelOffset(offset: THREE.Vector3) {
    this.modelOffset = offset;
    this.applyModelOffset();
  }

  /**
   * Helper to check if any movement key is pressed
   */
  isAnyMovementKeyPressed(): boolean {
    return (
      this.controls.keys.forward ||
      this.controls.keys.backward ||
      this.controls.keys.left ||
      this.controls.keys.right
    );
  }

  /**
   * Helper to determine which jump animation to use
   */
  determineJumpAnimationType(): "jump" | "jumpRun" {
    return this.wasRunningBeforeJump ? "jumpRun" : "jump";
  }

  /**
   * Helper to check if movement direction is valid (non-zero)
   */
  hasValidMovementDirection(): boolean {
    return this.movementDirection.lengthSq() > 0;
  }

  // Update the movement state based on key presses
  updateMovementState() {
    const isAnyMovementKeyPressed = this.isAnyMovementKeyPressed();

    // Track if we were running before jumping
    if (
      this.movementState === "run" &&
      this.controls.keys.jump &&
      this.isOnGround
    ) {
      this.wasRunningBeforeJump = true;
    } else if (this.isOnGround) {
      this.wasRunningBeforeJump = false;
    }

    if (!isAnyMovementKeyPressed && this.isOnGround) {
      this.movementState = "idle";
      this.targetSpeed = 0;
    } else if (this.controls.keys.jump && !this.isOnGround) {
      // Use the helper method to determine jump animation type
      this.movementState = this.determineJumpAnimationType();
    } else if (this.controls.keys.run && isAnyMovementKeyPressed) {
      this.movementState = "run";
      this.targetSpeed = this.runSpeed;
    } else if (this.controls.keys.walk && isAnyMovementKeyPressed) {
      this.movementState = "walk";
      this.targetSpeed = this.walkSpeed;
    } else if (isAnyMovementKeyPressed) {
      this.movementState = "normal";
      this.targetSpeed = this.moveSpeed;
    }

    // Update animations based on movement state
    this.updateAnimation();
  }

  // Update the current animation based on movement state
  updateAnimation() {
    if (!this.mixer || !this.animations) return;

    // Determine which animation to play
    let targetAnimation: string;

    switch (this.movementState) {
      case "idle":
        targetAnimation = "idle";
        break;
      case "walk":
        targetAnimation = "walk";
        break;
      case "normal":
        targetAnimation = "walk";
        break;
      case "run":
        targetAnimation = "run";
        break;
      case "jump":
        targetAnimation = "jump";
        break;
      case "jumpRun":
        targetAnimation = "jumpRun";
        break;
      default:
        targetAnimation = "idle";
    }

    // Play the target animation if it's not already playing
    const currentAction = this.animations[targetAnimation];
    if (currentAction && !currentAction.isRunning()) {
      // For jump animations, we want to finish other animations quickly
      const fadeOutTime =
        targetAnimation === "jump" || targetAnimation === "jumpRun" ? 0.1 : 0.5;

      // Fade out all current animations
      Object.values(this.animations).forEach((action) => {
        if (action.isRunning()) {
          action.fadeOut(fadeOutTime);
        }
      });

      // Fade in the new animation
      currentAction.reset();
      currentAction.fadeIn(fadeOutTime);
      currentAction.play();

      // If it's a jump animation, automatically transition back to appropriate animation when done
      if (targetAnimation === "jump" || targetAnimation === "jumpRun") {
        // Store reference to the current action for comparison in the listener
        const actionToMonitor = currentAction;

        // Use a properly typed event listener function
        const onAnimationFinished = (e: {
          action: THREE.AnimationAction;
          direction: number;
        }) => {
          if (e.action === actionToMonitor) {
            // Once the jump animation finishes, we need to transition to the appropriate animation
            // Remove this listener to prevent multiple calls
            this.mixer?.removeEventListener("finished", onAnimationFinished);

            // Determine which animation to go back to based on current keys
            this.updateMovementState();
          }
        };

        this.mixer.addEventListener("finished", onAnimationFinished);
      }
    }
  }

  // Handle character movement
  handleMovement(deltaTime: number) {
    // Smooth speed transitions
    this.currentSpeed = THREE.MathUtils.lerp(
      this.currentSpeed,
      this.targetSpeed,
      Math.min(1, this.speedChangeRate * deltaTime)
    );

    // Reset horizontal velocity
    this.velocity.x = 0;
    this.velocity.z = 0;

    // Track if we're moving
    const wasMoving = this.isMoving;
    this.isMoving = false;

    // Reset movement direction
    this.movementDirection.set(0, 0, 0);

    // Apply movement based on key presses
    if (this.controls.keys.forward) {
      this.movementDirection.z = -1;
      this.isMoving = true;
    }
    if (this.controls.keys.backward) {
      this.movementDirection.z = 1;
      this.isMoving = true;
    }
    if (this.controls.keys.left) {
      this.movementDirection.x = -1;
      this.isMoving = true;
    }
    if (this.controls.keys.right) {
      this.movementDirection.x = 1;
      this.isMoving = true;
    }

    // If we're moving, transform movement direction based on camera rotation
    if (this.isMoving) {
      // Normalize the movement direction if it's not zero
      if (this.hasValidMovementDirection()) {
        this.movementDirection.normalize();
      }

      // Transform movement by camera - this handles rotation and direction transformation
      this.updateCharacterRotation(true);

      // Apply current speed to velocity
      this.velocity.x = this.movementDirection.x * this.currentSpeed;
      this.velocity.z = this.movementDirection.z * this.currentSpeed;
    }
    // If we just stopped moving, we still want to face forward
    else if (wasMoving) {
      // Update rotation when not moving
      this.updateCharacterRotation(false);
    }

    // Apply movement to position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.z += this.velocity.z * deltaTime;
  }

  /**
   * Consolidated character rotation logic
   * @param isMoving Whether the character is currently moving
   */
  updateCharacterRotation(isMoving: boolean) {
    if (isMoving) {
      // Create a rotation matrix based on the camera's horizontal rotation
      const rotationMatrix = new THREE.Matrix4().makeRotationY(
        this.cameraRotation
      );

      // Apply the rotation to the movement direction
      this.movementDirection.applyMatrix4(rotationMatrix);

      // Only rotate when moving and has valid direction
      if (this.hasValidMovementDirection()) {
        // Calculate the target rotation based on movement direction
        const targetRotation = Math.atan2(
          -this.movementDirection.x,
          -this.movementDirection.z
        );

        // Smoothly rotate to face movement direction (WoW-like)
        const rotationSpeed = this.rotationSpeed * 0.05;
        this.mesh.rotation.y = THREE.MathUtils.lerp(
          this.mesh.rotation.y,
          targetRotation,
          rotationSpeed
        );
      }
    } else {
      // When not moving, face the camera direction
      // Smooth rotation to camera direction (slower than movement-based rotation)
      const rotationSpeed = this.rotationSpeed * 0.02;
      // The character should face the same direction as the camera
      const targetRotation = this.cameraRotation;
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        targetRotation,
        rotationSpeed
      );
    }
  }

  // Set character rotation based on camera horizontal rotation
  setRotationFromCamera(cameraHorizontalRotation: number) {
    // Store the camera rotation for movement calculations
    this.cameraRotation = cameraHorizontalRotation;

    // Update character rotation if not moving
    if (!this.isMoving) {
      this.updateCharacterRotation(false);
    }
    // Note: When moving, character faces movement direction (handled in updateCharacterRotation)
  }

  // Check collisions with the floor
  checkCollisions(floor: THREE.Object3D) {
    // Get the floor position - typically at y=0 but let's be safer
    const floorY = floor.position.y;

    // Check if character is below or at floor level (allowing for a small buffer)
    const collisionBuffer = 0.01; // Small buffer to ensure proper collision

    if (this.mesh.position.y <= floorY + collisionBuffer) {
      // Clamp position to floor level
      this.mesh.position.y = floorY;
      // Reset vertical velocity
      this.velocity.y = 0;
      // Set grounded state
      this.isOnGround = true;
    } else {
      // Character is above the floor
      this.isOnGround = false;
    }
  }

  // Handle jumping
  handleJump(deltaTime: number) {
    // Always apply gravity (even when on ground, but will be reset in collision)
    // This ensures we're always getting pulled down
    this.velocity.y -= this.gravity * deltaTime;

    // Apply a terminal velocity - maximum falling speed
    const terminalVelocity = -50;
    if (this.velocity.y < terminalVelocity) {
      this.velocity.y = terminalVelocity;
    }

    // Handle jump button press when on ground
    if (this.controls.keys.jump && this.isOnGround) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;

      // Set the appropriate jump animation based on current movement
      // Using the helper method for consistency
      this.movementState = this.determineJumpAnimationType();

      // Update animation immediately
      this.updateAnimation();
    }

    // Apply vertical velocity
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  // Main update method called every frame
  update(deltaTime: number, floor: THREE.Object3D) {
    // Cap deltaTime to prevent excessive jumps in physics when frame rate drops
    const cappedDeltaTime = Math.min(deltaTime, 0.1);

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(cappedDeltaTime);
    }

    // First update movement state based on keys
    this.updateMovementState();

    // Handle all physics in sequence, with a single collision check at the end
    this.handleMovement(cappedDeltaTime);
    this.handleJump(cappedDeltaTime);

    // Perform a single collision check after all movement is applied
    this.checkCollisions(floor);
  }
}
