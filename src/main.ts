import * as THREE from "three";
import {Floor} from "./components/Floor";
import {HumanCharacter} from "./components/HumanCharacter";
import {InputControls} from "./utils/controls";

class Game {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  floor: Floor;
  controls: InputControls;
  character: HumanCharacter;
  clock: THREE.Clock;
  cameraOffset: THREE.Vector3;
  targetCameraOffset: THREE.Vector3;
  cameraRotation: number = 0;
  targetCameraRotation: number = 0;
  cameraPitch: number = 0;
  targetCameraPitch: number = 0;
  minZoomDistance: number = 2;
  maxZoomDistance: number = 15;
  cameraLerpFactor: number = 0.3;

  constructor() {
    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Set up lighting
    this.setupLighting();

    // Initialize controls
    this.controls = new InputControls();

    // Create floor
    this.floor = new Floor(this.scene, 100);

    // Create character
    this.character = new HumanCharacter(this.scene, this.controls);

    // Adjust model scale and offset if needed
    this.character.setModelScale(1.5);
    this.character.setModelOffset(new THREE.Vector3(0, 0, 0));

    // Ensure character starts on the ground
    this.character.mesh.position.set(0, 0, 0);
    this.character.velocity.set(0, 0, 0);
    this.character.isOnGround = true;

    // Set up camera
    this.cameraOffset = new THREE.Vector3(0, 3, 8); // Increased initial distance
    this.targetCameraOffset = this.cameraOffset.clone();

    // Set initial camera position and look target
    this.updateCameraPositionAndTarget(0);

    // Set up clock for frame rate independence
    this.clock = new THREE.Clock();

    // Handle window resize
    window.addEventListener("resize", this.onWindowResize.bind(this));

    // Start the game loop
    this.animate();
  }

  setupLighting() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Add directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;

    // Improve shadow quality
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;

    this.scene.add(dirLight);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Calculate lerp factor based on condition
  getLerpFactor(isActive: boolean, activeFactor: number): number {
    return isActive ? activeFactor : this.cameraLerpFactor;
  }

  // Calculate the camera's look target position
  calculateCameraLookTarget(heightOffset: number = 0): THREE.Vector3 {
    const lookHeight =
      this.character.mesh.position.y +
      1.7 +
      heightOffset +
      Math.sin(this.cameraPitch) * 0.5;

    return new THREE.Vector3(
      this.character.mesh.position.x,
      lookHeight,
      this.character.mesh.position.z
    );
  }

  // Calculate desired camera position based on offsets and rotation
  calculateCameraPosition(heightOffset: number = 0): THREE.Vector3 {
    // Calculate horizontal position using sin/cos
    const horizontalDistance = Math.cos(this.cameraPitch) * this.cameraOffset.z;
    const cameraTarget = new THREE.Vector3(
      Math.sin(this.cameraRotation) * horizontalDistance,
      this.cameraOffset.y + Math.sin(this.cameraPitch) * this.cameraOffset.z,
      Math.cos(this.cameraRotation) * horizontalDistance
    );

    // Add character position with any height offset
    return new THREE.Vector3()
      .copy(this.character.mesh.position)
      .add(new THREE.Vector3(0, heightOffset, 0))
      .add(cameraTarget);
  }

  // Update both camera position and target in one method
  updateCameraPositionAndTarget(heightOffset: number = 0) {
    const positionLerpFactor = this.getLerpFactor(this.character.isMoving, 0.3);
    const desiredPosition = this.calculateCameraPosition(heightOffset);

    // Update camera position with appropriate lerp factor
    this.camera.position.lerp(desiredPosition, positionLerpFactor);

    // Update camera look target
    const lookTarget = this.calculateCameraLookTarget(heightOffset);
    this.camera.lookAt(lookTarget);
  }

  handleCameraMovement() {
    // Read mouse movement from controls
    const mouseMovementX = this.controls.mouse.movementX;
    const mouseMovementY = this.controls.mouse.movementY;
    const wheelDelta = this.controls.mouse.wheelDelta;

    // Only update camera rotation when right mouse button is down
    if (this.controls.mouse.rightButtonDown) {
      // Camera horizontal rotation - WoW style (slower horizontal rotation)
      this.targetCameraRotation -= mouseMovementX * 0.003; // Increased sensitivity from 0.001 to 0.003

      // Camera vertical rotation (pitch) - WoW style (slower vertical rotation)
      this.targetCameraPitch += mouseMovementY * 0.003; // Increased sensitivity from 0.001 to 0.003

      // Clamp vertical rotation to prevent flipping - wider range like WoW
      this.targetCameraPitch = Math.max(
        -Math.PI / 2.5, // Allow looking down more
        Math.min(Math.PI / 4, this.targetCameraPitch) // Allow looking up more
      );
    }

    // Handle zoom with mouse wheel - more WoW-like behavior
    if (wheelDelta !== 0) {
      // Adjust zoom distance with non-linear scaling (closer = smaller steps, further = larger steps)
      const currentDistance = this.targetCameraOffset.z;
      const zoomFactor = currentDistance / 5; // Scale factor based on current distance
      const newDistance = THREE.MathUtils.clamp(
        currentDistance + wheelDelta * zoomFactor,
        this.minZoomDistance,
        this.maxZoomDistance
      );

      this.targetCameraOffset.z = newDistance;

      // WoW-like behavior: When zooming in fully, slightly increase height
      if (newDistance < 4) {
        this.targetCameraOffset.y = THREE.MathUtils.lerp(
          3,
          3.5,
          (4 - newDistance) / 2
        );
      } else {
        this.targetCameraOffset.y = 3;
      }
    }

    // Smoothly interpolate camera rotation and pitch
    const rotationLerpFactor = this.getLerpFactor(
      this.controls.mouse.rightButtonDown,
      0.5
    );

    this.cameraRotation = THREE.MathUtils.lerp(
      this.cameraRotation,
      this.targetCameraRotation,
      rotationLerpFactor
    );

    this.cameraPitch = THREE.MathUtils.lerp(
      this.cameraPitch,
      this.targetCameraPitch,
      rotationLerpFactor
    );

    // Update character's movement direction based on camera
    this.character.setRotationFromCamera(this.cameraRotation);

    // Smoothly interpolate camera offset
    this.cameraOffset = this.cameraOffset.lerp(
      this.targetCameraOffset,
      this.cameraLerpFactor
    );

    // Calculate height offset for walking animation
    let heightOffset = 0;
    if (this.character.isMoving) {
      heightOffset = Math.sin(Date.now() * 0.008) * 0.05;
    }

    // Update camera position and look target
    this.updateCameraPositionAndTarget(heightOffset);

    // Reset mouse movement at the end of the frame
    this.controls.resetMouseMovement();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    // Update character
    this.character.update(deltaTime, this.floor.mesh);

    // Update camera
    this.handleCameraMovement();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game when the DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
