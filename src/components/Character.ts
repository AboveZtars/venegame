import * as THREE from "three";
import {InputControls} from "../utils/controls";

export class Character {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  isOnGround: boolean;
  controls: InputControls;
  height: number;
  normalHeight: number;
  crouchHeight: number;
  moveSpeed: number;
  runSpeed: number;
  walkSpeed: number; // Slow movement speed
  currentSpeed: number; // Current movement speed
  jumpForce: number;
  gravity: number;
  direction: THREE.Vector3;
  rotationSpeed: number;
  movementDirection: THREE.Vector3;
  isMoving: boolean;
  cameraRotation: number; // Store the camera's horizontal rotation
  movementState: "run" | "normal" | "walk" | "idle" | "jump" | "crouch"; // Current movement state

  // Body parts
  head: THREE.Mesh = new THREE.Mesh();
  torso: THREE.Mesh = new THREE.Mesh();
  leftArm: THREE.Mesh = new THREE.Mesh();
  rightArm: THREE.Mesh = new THREE.Mesh();
  leftLeg: THREE.Mesh = new THREE.Mesh();
  rightLeg: THREE.Mesh = new THREE.Mesh();
  neck: THREE.Mesh = new THREE.Mesh();
  leftShoulder: THREE.Mesh = new THREE.Mesh();
  rightShoulder: THREE.Mesh = new THREE.Mesh();
  leftFoot: THREE.Mesh = new THREE.Mesh();
  rightFoot: THREE.Mesh = new THREE.Mesh();

  // Body part groups for easier animation
  upperBody: THREE.Group = new THREE.Group();
  lowerBody: THREE.Group = new THREE.Group();

  // Character colors
  skinColor: THREE.Color = new THREE.Color(0xf5d0a9); // Skin tone
  clothesColor: THREE.Color = new THREE.Color(0x3366cc); // Blue clothes
  hairColor: THREE.Color = new THREE.Color(0x8b4513); // Brown hair
  shoesColor: THREE.Color = new THREE.Color(0x4d4d4d); // Dark gray shoes

  // Animation properties
  animationTime: number;
  stepFrequency: number;
  stepHeight: number;
  armSwingAmount: number;
  breathingAmount: number;
  breathingSpeed: number;
  lastJumpTime: number;
  jumpAnimationDuration: number;

  // Movement smoothing
  targetSpeed: number;
  speedChangeRate: number;

  constructor(scene: THREE.Scene, controls: InputControls) {
    this.controls = controls;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, -1); // Forward direction (negative z)
    this.isOnGround = false;
    this.rotationSpeed = 10; // Speed at which character rotates
    this.movementDirection = new THREE.Vector3(0, 0, 0);
    this.isMoving = false;
    this.cameraRotation = Math.PI; // Default camera rotation (facing forward)
    this.movementState = "idle"; // Default movement state is now idle

    // Character dimensions and physics values
    this.normalHeight = 2;
    this.crouchHeight = 1;
    this.height = this.normalHeight;

    // Define the three movement speeds
    this.walkSpeed = 2.5; // Slow
    this.moveSpeed = 7.5; // Normal (increased from 5 to 7.5)
    this.runSpeed = 15; // Fast (increased from 10 to 15)
    this.currentSpeed = 0; // Start with zero speed (idle)
    this.targetSpeed = 0; // Target speed for smooth acceleration/deceleration
    this.speedChangeRate = 20; // How quickly speed changes

    this.jumpForce = 10;
    this.gravity = 20;

    // Animation properties
    this.animationTime = 0;
    this.stepFrequency = 5; // Steps per second at normal speed
    this.stepHeight = 0.2; // How high legs lift when walking
    this.armSwingAmount = Math.PI / 4; // How much arms swing when walking
    this.breathingAmount = 0.05; // Subtle breathing animation
    this.breathingSpeed = 1; // Breathing cycles per second
    this.lastJumpTime = 0;
    this.jumpAnimationDuration = 0.5; // Duration of jump animation in seconds

    // Create a humanoid character model
    this.mesh = new THREE.Group();
    this.mesh.position.y = this.normalHeight / 2;
    this.mesh.castShadow = true;

    // Create body parts
    this.createBodyParts();

    // Add to scene
    scene.add(this.mesh);
  }

  createBodyParts() {
    // Create materials with improved rendering properties
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: this.skinColor,
      roughness: 0.7,
      metalness: 0.1,
    });

    const clothesMaterial = new THREE.MeshStandardMaterial({
      color: this.clothesColor,
      roughness: 0.5,
      metalness: 0.1,
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: this.hairColor,
      roughness: 0.9,
      metalness: 0.0,
    });

    const shoesMaterial = new THREE.MeshStandardMaterial({
      color: this.shoesColor,
      roughness: 0.3,
      metalness: 0.5,
    });

    // Create body groups
    this.upperBody = new THREE.Group();
    this.lowerBody = new THREE.Group();

    // Head with more detail
    const headGeometry = new THREE.SphereGeometry(0.25, 24, 24);
    this.head = new THREE.Mesh(headGeometry, skinMaterial);
    this.head.castShadow = true;

    // Add simple hair (flattened sphere on top of head)
    const hairGeometry = new THREE.SphereGeometry(
      0.26,
      16,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 0.05;
    hair.rotation.x = -0.2;
    this.head.add(hair);

    // Neck
    const neckGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.1, 16);
    this.neck = new THREE.Mesh(neckGeometry, skinMaterial);
    this.neck.position.y = -0.15;
    this.neck.castShadow = true;
    this.head.add(this.neck);

    // Torso with better proportions - make it slightly longer to connect with legs
    const torsoGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.25);
    this.torso = new THREE.Mesh(torsoGeometry, clothesMaterial);
    this.torso.castShadow = true;

    // Shoulders (rounded edges)
    const shoulderGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    this.leftShoulder = new THREE.Mesh(shoulderGeometry, clothesMaterial);
    this.leftShoulder.position.set(0.31, 0.2, 0);
    this.leftShoulder.castShadow = true;

    this.rightShoulder = new THREE.Mesh(shoulderGeometry, clothesMaterial);
    this.rightShoulder.position.set(-0.31, 0.2, 0);
    this.rightShoulder.castShadow = true;

    // Arms with better shape (slightly tapered)
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 16);

    this.leftArm = new THREE.Mesh(armGeometry, skinMaterial);
    this.leftArm.position.set(0.31, -0.05, 0);
    this.leftArm.rotation.z = 0.1;
    this.leftArm.castShadow = true;

    this.rightArm = new THREE.Mesh(armGeometry, skinMaterial);
    this.rightArm.position.set(-0.31, -0.05, 0);
    this.rightArm.rotation.z = -0.1;
    this.rightArm.castShadow = true;

    // Add pants (upper part of legs that connects to torso)
    const pantsGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.25);
    const pants = new THREE.Mesh(pantsGeometry, clothesMaterial);
    pants.position.y = -0.5;
    pants.castShadow = true;

    // Legs with better proportions
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.5, 16);

    this.leftLeg = new THREE.Mesh(legGeometry, clothesMaterial);
    this.leftLeg.position.set(0.12, -0.35, 0);
    this.leftLeg.castShadow = true;

    this.rightLeg = new THREE.Mesh(legGeometry, clothesMaterial);
    this.rightLeg.position.set(-0.12, -0.35, 0);
    this.rightLeg.castShadow = true;

    // Feet
    const footGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.2);

    this.leftFoot = new THREE.Mesh(footGeometry, shoesMaterial);
    this.leftFoot.position.set(0, -0.29, 0.05);
    this.leftFoot.castShadow = true;
    this.leftLeg.add(this.leftFoot);

    this.rightFoot = new THREE.Mesh(footGeometry, shoesMaterial);
    this.rightFoot.position.set(0, -0.29, 0.05);
    this.rightFoot.castShadow = true;
    this.rightLeg.add(this.rightFoot);

    // Organize body parts into groups for better animation control
    this.upperBody.add(this.head);
    this.upperBody.add(this.torso);
    this.upperBody.add(this.leftShoulder);
    this.upperBody.add(this.rightShoulder);
    this.upperBody.add(this.leftArm);
    this.upperBody.add(this.rightArm);
    this.upperBody.add(pants);

    this.lowerBody.add(this.leftLeg);
    this.lowerBody.add(this.rightLeg);

    // Position the groups - adjust to connect properly
    this.upperBody.position.y = 0.5;
    this.lowerBody.position.y = 0;

    // Add groups to the main mesh
    this.mesh.add(this.upperBody);
    this.mesh.add(this.lowerBody);

    // Position head relative to upper body
    this.head.position.y = 0.55;
  }

  update(deltaTime: number, floor: THREE.Object3D) {
    // Update animation time
    this.animationTime += deltaTime;

    this.updateMovementState();
    this.handleMovement(deltaTime);
    this.handleJump(deltaTime);
    this.handleCrouch();
    this.checkCollisions(floor);

    // Update animations based on movement state
    this.updateAnimations(deltaTime);
  }

  // Update the movement state based on key presses
  updateMovementState() {
    // Determine if we're moving at all
    const isAnyMovementKeyPressed =
      this.controls.keys.forward ||
      this.controls.keys.backward ||
      this.controls.keys.left ||
      this.controls.keys.right;

    // Determine movement state based on key presses
    if (!isAnyMovementKeyPressed && this.isOnGround) {
      this.movementState = "idle";
      this.targetSpeed = 0;
    } else if (this.controls.keys.jump && !this.isOnGround) {
      this.movementState = "jump";
    } else if (this.controls.keys.crouch) {
      this.movementState = "crouch";
      this.targetSpeed = this.walkSpeed * 0.5; // Slower when crouching
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

    // Update UI to show current movement state
    this.updateMovementStateUI();
  }

  // Update the UI to show the current movement state
  updateMovementStateUI() {
    const infoElement = document.getElementById("info");
    if (infoElement) {
      const cameraMode = infoElement.textContent?.includes("orbit")
        ? "orbit"
        : "follow";
      infoElement.textContent = `Vene Game - Camera: ${cameraMode} - State: ${this.movementState}`;
    }
  }

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
      if (this.movementDirection.lengthSq() > 0) {
        this.movementDirection.normalize();
      }

      // Transform movement by camera - this also handles character rotation
      this.transformMovementByCamera();

      // Apply current speed to velocity
      this.velocity.x = this.movementDirection.x * this.currentSpeed;
      this.velocity.z = this.movementDirection.z * this.currentSpeed;
    }

    // Apply movement to position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.z += this.velocity.z * deltaTime;

    // Ensure the lower body follows the main body rotation
    this.lowerBody.rotation.y = 0; // Reset to match the main body
  }

  // Transform movement direction based on camera rotation
  transformMovementByCamera() {
    // Create a rotation matrix based on the camera's horizontal rotation
    const rotationMatrix = new THREE.Matrix4().makeRotationY(
      this.cameraRotation
    );

    // Apply the rotation to the movement direction
    this.movementDirection.applyMatrix4(rotationMatrix);

    // Store the movement angle for character rotation
    if (this.movementDirection.lengthSq() > 0) {
      // This is the direction we want the character to face
      const movementAngle = Math.atan2(
        this.movementDirection.x,
        -this.movementDirection.z
      );

      // Force the character to face the movement direction immediately
      this.mesh.rotation.y = movementAngle;

      // Reset any upper body twist to ensure the whole body faces forward
      this.upperBody.rotation.y = 0;
    }
  }

  // Set character rotation based on camera horizontal rotation
  setRotationFromCamera(cameraHorizontalRotation: number) {
    // Store the camera rotation for movement calculations
    this.cameraRotation = cameraHorizontalRotation;

    // If not moving, gradually rotate to face the camera direction
    if (!this.isMoving) {
      // Smoothly rotate to camera direction when not moving
      const currentRotation = this.mesh.rotation.y;
      const newRotation = this.lerpAngle(
        currentRotation,
        cameraHorizontalRotation,
        this.rotationSpeed * 0.1
      );

      this.mesh.rotation.y = newRotation;

      // Reset any upper body twist
      this.upperBody.rotation.y = THREE.MathUtils.lerp(
        this.upperBody.rotation.y,
        0,
        0.1
      );
    }

    // Note: When moving, rotation is handled in transformMovementByCamera
    // to ensure the character always faces the direction of movement
  }

  // Helper function to interpolate between angles (handles wrapping)
  lerpAngle(a: number, b: number, t: number): number {
    // Find the shortest path between angles
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + diff * Math.min(1, t);
  }

  handleJump(deltaTime: number) {
    // Apply gravity
    this.velocity.y -= this.gravity * deltaTime;

    // Handle jumping
    if (this.controls.keys.jump && this.isOnGround) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;
      this.lastJumpTime = this.animationTime;
    }

    // Apply vertical movement
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  handleCrouch() {
    // Handle crouching
    if (this.controls.keys.crouch) {
      if (this.height !== this.crouchHeight) {
        this.height = this.crouchHeight;
        this.updateCharacterHeight();
      }
    } else {
      if (this.height !== this.normalHeight) {
        this.height = this.normalHeight;
        this.updateCharacterHeight();
      }
    }
  }

  updateCharacterHeight() {
    // Adjust y position to keep feet at the same level
    if (this.height === this.crouchHeight) {
      this.mesh.position.y -= (this.normalHeight - this.crouchHeight) / 2;

      // Scale the character model for crouching
      this.torso.scale.y = 0.7;
      this.torso.position.y = 0.2;
      this.head.position.y = 0.5;
      this.leftArm.scale.y = 0.8;
      this.rightArm.scale.y = 0.8;
      this.leftArm.position.y = 0.2;
      this.rightArm.position.y = 0.2;
    } else {
      this.mesh.position.y += (this.normalHeight - this.crouchHeight) / 2;

      // Restore normal scale
      this.torso.scale.y = 1;
      this.torso.position.y = 0.35;
      this.head.position.y = 0.8;
      this.leftArm.scale.y = 1;
      this.rightArm.scale.y = 1;
      this.leftArm.position.y = 0.3;
      this.rightArm.position.y = 0.3;
    }
  }

  checkCollisions(floor: THREE.Object3D) {
    // Simple floor collision detection
    const characterBottom = this.mesh.position.y - this.height / 2;

    if (characterBottom <= 0) {
      this.mesh.position.y = this.height / 2;
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }
  }

  updateAnimations(deltaTime: number) {
    // Reset rotations first
    this.leftArm.rotation.x = 0;
    this.rightArm.rotation.x = 0;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;

    // Apply animations based on movement state
    if (this.movementState === "idle") {
      this.animateIdle(deltaTime);
    } else if (this.movementState === "jump") {
      this.animateJump(deltaTime);
    } else if (this.movementState === "crouch") {
      this.animateCrouch(deltaTime);
    } else {
      // Walking/running animations
      this.animateWalkRun(deltaTime);
    }

    // Add head movement - subtle look around when idle
    if (this.movementState === "idle") {
      const headTurn = Math.sin(this.animationTime * 0.3) * 0.1;
      const headNod = Math.sin(this.animationTime * 0.2) * 0.05;
      this.head.rotation.y = headTurn;
      this.head.rotation.x = headNod;
    } else {
      // Subtle head bobbing during movement
      const headBob =
        Math.sin(this.animationTime * this.currentSpeed * 0.5) * 0.03;
      this.head.rotation.x = headBob;

      // Reset head turn during movement
      this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, 0, 0.1);
    }
  }

  animateIdle(deltaTime: number) {
    // Subtle breathing animation
    const breathingOffset =
      Math.sin(this.animationTime * this.breathingSpeed * Math.PI * 2) *
      this.breathingAmount;
    this.torso.position.y = breathingOffset;
    this.head.position.y = 0.55 + breathingOffset;

    // Subtle arm movement
    const armOffset = Math.sin(this.animationTime * 0.5 * Math.PI * 2) * 0.02;
    this.leftArm.position.y = -0.05 + armOffset;
    this.rightArm.position.y = -0.05 + armOffset;

    // Subtle weight shifting
    const weightShift = Math.sin(this.animationTime * 0.3) * 0.02;
    this.upperBody.position.x = weightShift;
    this.lowerBody.rotation.z = -weightShift * 0.2;
  }

  animateJump(deltaTime: number) {
    // Jump animation timing
    const jumpProgress = Math.min(
      1,
      (this.animationTime - this.lastJumpTime) / this.jumpAnimationDuration
    );

    // Initial jump pose (arms up, legs tucked)
    if (jumpProgress < 0.5) {
      // Going up - arms raise, legs tuck
      const upProgress = jumpProgress * 2; // 0 to 1 during first half
      this.leftArm.rotation.x = (-Math.PI / 4) * upProgress;
      this.rightArm.rotation.x = (-Math.PI / 4) * upProgress;
      this.leftLeg.rotation.x = (Math.PI / 6) * upProgress;
      this.rightLeg.rotation.x = (Math.PI / 6) * upProgress;
    } else {
      // Coming down - prepare for landing
      const downProgress = (jumpProgress - 0.5) * 2; // 0 to 1 during second half
      this.leftArm.rotation.x = -Math.PI / 4 + (Math.PI / 4) * downProgress;
      this.rightArm.rotation.x = -Math.PI / 4 + (Math.PI / 4) * downProgress;
      this.leftLeg.rotation.x = Math.PI / 6 - (Math.PI / 12) * downProgress;
      this.rightLeg.rotation.x = Math.PI / 6 - (Math.PI / 12) * downProgress;
    }
  }

  animateCrouch(deltaTime: number) {
    // Subtle movement while crouched
    if (this.isMoving) {
      // Crouched walking animation (smaller movements)
      const walkCycleSpeed = this.currentSpeed * this.stepFrequency * 0.5;
      const legAngle =
        Math.sin(this.animationTime * walkCycleSpeed * Math.PI * 2) *
        (this.stepHeight * 0.5);
      const armAngle =
        -Math.sin(this.animationTime * walkCycleSpeed * Math.PI * 2) *
        (this.armSwingAmount * 0.5);

      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;
      this.leftArm.rotation.x = armAngle;
      this.rightArm.rotation.x = -armAngle;
    } else {
      // Static crouch pose
      this.leftArm.rotation.x = Math.PI / 12;
      this.rightArm.rotation.x = Math.PI / 12;
    }
  }

  animateWalkRun(deltaTime: number) {
    // Walking/running animation
    // Speed up animation based on movement speed
    const speedFactor = this.currentSpeed / this.moveSpeed;
    const walkCycleSpeed = speedFactor * this.stepFrequency;

    // Leg and arm swing animations
    const legAngle =
      Math.sin(this.animationTime * walkCycleSpeed * Math.PI * 2) *
      this.stepHeight *
      2;
    const armAngle =
      -Math.sin(this.animationTime * walkCycleSpeed * Math.PI * 2) *
      this.armSwingAmount;

    // Apply rotations
    this.leftLeg.rotation.x = legAngle;
    this.rightLeg.rotation.x = -legAngle;
    this.leftArm.rotation.x = armAngle;
    this.rightArm.rotation.x = -armAngle;

    // Add a slight bounce to the body
    const bodyBounce =
      Math.abs(Math.sin(this.animationTime * walkCycleSpeed * Math.PI * 4)) *
      0.05 *
      speedFactor;
    this.mesh.position.y = this.height / 2 + bodyBounce;

    // Add torso lean forward when running
    if (this.movementState === "run") {
      this.upperBody.rotation.x = 0.1;
    } else {
      this.upperBody.rotation.x = THREE.MathUtils.lerp(
        this.upperBody.rotation.x,
        0,
        0.1
      );
    }

    // Add slight side-to-side sway
    const sway =
      Math.sin(this.animationTime * walkCycleSpeed * Math.PI * 2) *
      0.02 *
      speedFactor;
    this.upperBody.rotation.z = sway;

    // Ensure all body parts are aligned with the movement direction
    this.upperBody.rotation.y = 0;
    this.lowerBody.rotation.y = 0;
  }
}
