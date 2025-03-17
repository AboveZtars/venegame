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
  headBone: THREE.Object3D | null = null; // Head bone reference
  cameraPosition: THREE.Vector3 = new THREE.Vector3(); // Camera position for head tracking
  cameraDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1); // Camera look direction
  headTrackingEnabled: boolean = true; // Toggle for head tracking
  headRotationLimit: number = Math.PI / 4; // Limit head rotation (45 degrees)
  isJumping: boolean = false;
  startingJump: boolean = false;

  // Collision visualization
  collisionHelper: THREE.Group | null = null;
  showCollisionHelpers: boolean = false;

  constructor(scene: THREE.Scene, controls: InputControls) {
    this.controls = controls;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isOnGround = true;
    this.rotationSpeed = 5;
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

    // Create collision visualization helpers
    this.createCollisionHelpers(scene);

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
    this.loadModel().catch((error) => {
      console.error("Failed to load character model:", error);
    });
  }

  // Load the 3D model
  async loadModel() {
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

      // Find the head bone for head tracking
      this.findHeadBone();

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

  /**
   * Find and store the head bone for head tracking
   */
  findHeadBone() {
    if (!this.model) return;

    // Common head bone names in 3D models
    const headBoneNames = [
      "mixamorigHead", // Mixamo naming
      "Head", // Standard naming
      "head", // Lowercase
      "Cabeza", // Spanish
      "neck1", // Sometimes neck1 is the head
      "Neck1", // Alternative
    ];

    // Search through the model to find the head bone
    this.model.traverse((object) => {
      if (headBoneNames.includes(object.name) && !this.headBone) {
        console.log(`Found head bone: ${object.name}`);
        this.headBone = object;
      }
    });

    if (!this.headBone) {
      console.warn("Could not find head bone for head tracking");
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
      // for (const anim of animationsToLoad) {
      //   if (
      ///     !ModelLoader.getRegisteredModels().some(
      //       (model) => model.id === anim.id
      //     )
      //   ) {
      //     console.warn(
      //       `Animation ${anim.id} is not registered. Make sure to register it in the constructor.`
      //     );
      //   }
      // }

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
      this.controls.keys.right ||
      this.controls.keys.jump
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
    if (this.isJumping) {
      return;
    }

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

    if (!isAnyMovementKeyPressed) {
      this.movementState = "idle";
      this.targetSpeed = 0;
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
    if (!this.mixer || Object.keys(this.animations).length === 0) return;

    // Determine which animation to play based on current state
    let targetAnimation: string;
    // console.log("this.movementState", this.movementState);
    if (this.movementState === "run") {
      targetAnimation = "run";
    } else if (this.movementState === "jumpRun") {
      targetAnimation = "jumpRun";
    } else if (this.movementState === "jump") {
      targetAnimation = "jump";
    } else if (this.movementState === "walk") {
      targetAnimation = "walk";
    } else if (this.movementState === "normal") {
      targetAnimation = "walk";
    } else {
      targetAnimation = "idle";
    }
    // console.log("targetAnimation", targetAnimation);
    // Get the target animation action
    const targetAction = this.animations[targetAnimation];
    if (!targetAction) return;

    // Check which animations are currently active
    const animationsPlaying: string[] = [];
    Object.entries(this.animations).forEach(([name, action]) => {
      if (action.isRunning()) {
        animationsPlaying.push(name);
      }
    });

    // console.log("animationsPlaying", animationsPlaying);
    // If the target animation is already playing, don't do anything
    if (targetAction.isRunning() && !targetAction.paused) return;

    // Stop all currently running animations with a fade out
    Object.entries(this.animations).forEach(([name, action]) => {
      if (action.isRunning() && name !== targetAnimation) {
        action.fadeOut(0.2);
      }
    });

    // Reset the target animation and start it with a fade in
    targetAction.reset();
    targetAction.fadeIn(0.2);
    targetAction.play();

    // Add event listener for jump animation completion
    if (targetAnimation === "jump") {
      // Remove any existing listeners to avoid duplicates
      this.mixer.removeEventListener("finished", () => {});

      // Add listener for animation completion
      this.mixer.addEventListener("finished", this.onJumpAnimationComplete);

      // // Ensure the animation plays only once and then stops
      // targetAction.setLoop(THREE.LoopOnce, 1);
      // targetAction.clampWhenFinished = true;
    }
  }

  // Handler for jump animation completion
  onJumpAnimationComplete = () => {
    this.isJumping = false;
  };

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

        // Normalize current and target angles to ensure shortest rotation path
        let currentAngle = this.mesh.rotation.y % (Math.PI * 2);
        if (currentAngle < 0) currentAngle += Math.PI * 2;

        let targetAngle = targetRotation % (Math.PI * 2);
        if (targetAngle < 0) targetAngle += Math.PI * 2;

        // Find the shortest rotation direction
        let angleDiff = targetAngle - currentAngle;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Calculate the new rotation angle
        const newRotation =
          currentAngle + angleDiff * this.rotationSpeed * 0.02;

        // Apply the rotation
        this.mesh.rotation.y = newRotation;
      }
    }
    // else {
    //   // When not moving, face the camera direction
    //   const targetRotation = this.cameraRotation;

    //   // Normalize current and target angles to ensure shortest rotation path
    //   let currentAngle = this.mesh.rotation.y % (Math.PI * 2);
    //   if (currentAngle < 0) currentAngle += Math.PI * 2;

    //   let targetAngle = targetRotation % (Math.PI * 2);
    //   if (targetAngle < 0) targetAngle += Math.PI * 2;

    //   // Find the shortest rotation direction
    //   let angleDiff = targetAngle - currentAngle;
    //   if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    //   if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    //   // Calculate the new rotation angle with a slower rotation speed
    //   const newRotation = currentAngle + angleDiff * this.rotationSpeed * 0.01;

    //   // Apply the rotation
    //   this.mesh.rotation.y = newRotation;
    // }
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
      this.isJumping = false;
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
      this.movementState = this.determineJumpAnimationType();

      if (this.movementState === "jump" || this.movementState === "jumpRun") {
        this.isJumping = true;
      }
      this.updateAnimation();
    }

    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  // Main update method called every frame
  update(deltaTime: number, floor: THREE.Object3D) {
    // Cap deltaTime to prevent excessive jumps in physics when frame rate drops
    const cappedDeltaTime = Math.min(deltaTime, 0.3);

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(cappedDeltaTime);
    }

    // First update movement state based on keys
    this.updateMovementState();
    console.log("this.movementState", this.movementState);
    console.log("this.startingJump", this.startingJump);
    // Handle all physics in sequence, with a single collision check at the end
    this.handleMovement(cappedDeltaTime);

    this.handleJump(cappedDeltaTime);

    // Perform a single collision check after all movement is applied
    this.checkCollisions(floor);

    // Update head tracking if enabled
    this.updateHeadTracking();

    // Update collision helpers position
    this.updateCollisionHelpers();
  }

  /**
   * Update head tracking to look in the camera direction
   */
  updateHeadTracking() {
    // Skip if head tracking is disabled or head bone wasn't found
    if (!this.headTrackingEnabled || !this.headBone) return;

    // Get the world position of the head for context
    const headWorldPosition = new THREE.Vector3();
    this.headBone.getWorldPosition(headWorldPosition);

    // Create a target position that extends from the head in the camera's direction
    // This makes the head look in the same direction as the camera instead of at the camera
    const targetPosition = new THREE.Vector3()
      .copy(headWorldPosition)
      .add(this.cameraDirection.clone().multiplyScalar(10)); // Look 10 units forward in the camera direction

    // Save original rotation
    const originalRotation = new THREE.Euler().copy(this.headBone.rotation);

    // Make the head look in the camera direction
    this.headBone.lookAt(targetPosition);

    // Limit the rotation to prevent unnatural head movements
    // Only limit the Y-axis rotation (left/right)
    if (
      Math.abs(this.headBone.rotation.y - originalRotation.y) >
      this.headRotationLimit
    ) {
      // If rotation is too extreme, clamp it
      const direction = this.headBone.rotation.y > originalRotation.y ? 1 : -1;
      this.headBone.rotation.y =
        originalRotation.y + this.headRotationLimit * direction;
    }

    // Preserve the original X and Z rotations to maintain the animation's natural head posture
    this.headBone.rotation.x = originalRotation.x;
    this.headBone.rotation.z = originalRotation.z;
  }

  /**
   * Set the current camera position and direction for head tracking
   * @param position The camera position
   * @param direction The camera look direction (normalized)
   */
  setCameraPositionForHeadTracking(
    position: THREE.Vector3,
    direction?: THREE.Vector3
  ) {
    this.cameraPosition.copy(position);
    if (direction) {
      this.cameraDirection.copy(direction);
    }
  }

  /**
   * Toggle head tracking on/off
   * @param enabled Whether head tracking should be enabled
   */
  setHeadTrackingEnabled(enabled: boolean) {
    this.headTrackingEnabled = enabled;
  }

  /**
   * Create visual helpers for collision detection
   */
  createCollisionHelpers(scene: THREE.Scene) {
    // Create a group to hold all collision helpers
    this.collisionHelper = new THREE.Group();
    scene.add(this.collisionHelper);

    // Create a vertical line to show character position
    const verticalLineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});
    const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 3, 0),
    ]);
    const verticalLine = new THREE.Line(
      verticalLineGeometry,
      verticalLineMaterial
    );
    this.collisionHelper.add(verticalLine);

    // Create a circle to show ground collision area
    const circleGeometry = new THREE.CircleGeometry(0.5, 32);
    circleGeometry.rotateX(-Math.PI / 2); // Make it horizontal
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.position.y = 0.01; // Slightly above ground to avoid z-fighting
    this.collisionHelper.add(circle);

    // Create a box to show character bounds
    const boxGeometry = new THREE.BoxGeometry(1, 2, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 1; // Center at character height
    this.collisionHelper.add(box);

    // Hide by default
    this.collisionHelper.visible = this.showCollisionHelpers;
  }

  /**
   * Toggle collision helpers visibility
   */
  toggleCollisionHelpers(show?: boolean) {
    if (show !== undefined) {
      this.showCollisionHelpers = show;
    } else {
      this.showCollisionHelpers = !this.showCollisionHelpers;
    }

    if (this.collisionHelper) {
      this.collisionHelper.visible = this.showCollisionHelpers;
    }
  }

  /**
   * Update the position of collision helpers to match character position
   */
  updateCollisionHelpers() {
    if (this.collisionHelper && this.showCollisionHelpers) {
      this.collisionHelper.position.copy(this.mesh.position);
    }
  }
}
