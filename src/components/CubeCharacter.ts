import * as THREE from "three";
import {InputControls} from "../utils/controls";

export class CubeCharacter {
  mesh: THREE.Object3D;
  cube: THREE.Mesh = new THREE.Mesh();
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
  movementState: "run" | "normal" | "walk" | "idle" | "jump";

  constructor(scene: THREE.Scene, controls: InputControls) {
    this.controls = controls;
    this.velocity = new THREE.Vector3();
    this.isOnGround = false;
    this.rotationSpeed = 10;
    this.movementDirection = new THREE.Vector3(0, 0, 0);
    this.isMoving = false;
    this.cameraRotation = Math.PI;

    // Movement properties
    this.moveSpeed = 5;
    this.runSpeed = 8;
    this.walkSpeed = 2;
    this.currentSpeed = this.moveSpeed;
    this.targetSpeed = this.moveSpeed;
    this.speedChangeRate = 5;
    this.jumpForce = 10;
    this.gravity = 20;
    this.movementState = "idle";

    // Create the mesh container for the cube
    this.mesh = new THREE.Object3D();
    this.mesh.position.set(0, 1, 0);

    // Create the colored cube
    this.createCube();

    // Add to scene
    scene.add(this.mesh);
  }

  createCube() {
    // Create a cube geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Create materials for different faces
    // BoxGeometry faces order: right, left, top, bottom, front, back
    const materials = [
      new THREE.MeshBasicMaterial({color: 0x808080}), // Right face (positive X) - gray
      new THREE.MeshBasicMaterial({color: 0x808080}), // Left face (negative X) - gray
      new THREE.MeshBasicMaterial({color: 0x808080}), // Top face (positive Y) - gray
      new THREE.MeshBasicMaterial({color: 0x808080}), // Bottom face (negative Y) - gray
      new THREE.MeshBasicMaterial({color: 0x0000ff}), // Front face (positive Z) - blue
      new THREE.MeshBasicMaterial({color: 0xff0000}), // Back face (negative Z) - red
    ];

    // Create the cube with the materials
    this.cube = new THREE.Mesh(geometry, materials);

    // Rotate the cube so the blue face is looking forward (negative Z in world space)
    // By default, the "front" face of BoxGeometry is positive Z, but we want it to face negative Z
    this.cube.rotation.y = Math.PI; // 180 degrees around Y axis

    // Add the cube to the mesh container
    this.mesh.add(this.cube);
  }

  // Update the movement state based on key presses
  updateMovementState() {
    const isAnyMovementKeyPressed =
      this.controls.keys.forward ||
      this.controls.keys.backward ||
      this.controls.keys.left ||
      this.controls.keys.right;

    if (!isAnyMovementKeyPressed && this.isOnGround) {
      this.movementState = "idle";
      this.targetSpeed = 0;
    } else if (this.controls.keys.jump && !this.isOnGround) {
      this.movementState = "jump";
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
      if (this.movementDirection.lengthSq() > 0) {
        this.movementDirection.normalize();
      }

      // Transform movement by camera - this handles rotation and direction transformation
      this.transformMovementByCamera();

      // Apply current speed to velocity
      this.velocity.x = this.movementDirection.x * this.currentSpeed;
      this.velocity.z = this.movementDirection.z * this.currentSpeed;
    }
    // If we just stopped moving, we still want to face forward
    else if (wasMoving) {
      // Always face the same direction as the camera
      this.mesh.rotation.y = this.cameraRotation;
    }

    // Apply movement to position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.z += this.velocity.z * deltaTime;
  }

  // Transform movement direction based on camera rotation
  transformMovementByCamera() {
    // Create a rotation matrix based on the camera's horizontal rotation
    const rotationMatrix = new THREE.Matrix4().makeRotationY(
      this.cameraRotation
    );

    // Apply the rotation to the movement direction
    this.movementDirection.applyMatrix4(rotationMatrix);

    // Always face the same direction as the camera
    this.mesh.rotation.y = this.cameraRotation;
  }

  // Set cube rotation based on camera horizontal rotation
  setRotationFromCamera(cameraHorizontalRotation: number) {
    // Store the camera rotation for movement calculations
    this.cameraRotation = cameraHorizontalRotation;

    // Always keep the character facing the same direction as the camera
    this.mesh.rotation.y = this.cameraRotation;
  }

  // Handle jumping
  handleJump(deltaTime: number) {
    // Apply gravity
    this.velocity.y -= this.gravity * deltaTime;

    // Handle jump button press when on ground
    if (this.controls.keys.jump && this.isOnGround) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;
    }

    // Apply vertical velocity
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  // Check collisions with the floor
  checkCollisions(floor: THREE.Object3D) {
    // Simple floor collision
    if (this.mesh.position.y < 0.5) {
      // 0.5 is half the cube's height
      this.mesh.position.y = 0.5;
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }
  }

  // Main update method called every frame
  update(deltaTime: number, floor: THREE.Object3D) {
    // First update movement state based on keys
    this.updateMovementState();

    // Handle movement - this includes rotation based on movement direction
    this.handleMovement(deltaTime);

    // Handle jumping
    this.handleJump(deltaTime);

    // Check for collisions with the floor
    this.checkCollisions(floor);
  }
}
