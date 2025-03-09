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
  cameraLerpFactor: number = 0.1;

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
    this.cameraOffset = new THREE.Vector3(0, 3, 5);
    this.targetCameraOffset = this.cameraOffset.clone();
    this.camera.position
      .copy(this.character.mesh.position)
      .add(this.cameraOffset);

    // Look at the character's upper body, similar to how it's done in handleCameraMovement
    const lookHeight = this.character.mesh.position.y + 1.7; // Match your character's proportions
    const lookTarget = new THREE.Vector3(
      this.character.mesh.position.x,
      lookHeight,
      this.character.mesh.position.z
    );
    this.camera.lookAt(lookTarget);

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

  handleCameraMovement() {
    // Read mouse movement from controls
    const mouseMovementX = this.controls.mouse.movementX;
    const mouseMovementY = this.controls.mouse.movementY;
    const wheelDelta = this.controls.mouse.wheelDelta;

    // Only update camera rotation when right mouse button is down
    if (this.controls.mouse.rightButtonDown) {
      // Camera horizontal rotation - WoW style (slower horizontal rotation)
      this.targetCameraRotation -= mouseMovementX * 0.002;

      // Camera vertical rotation (pitch) - WoW style (slower vertical rotation)
      this.targetCameraPitch += mouseMovementY * 0.002;

      // Clamp vertical rotation to prevent flipping
      this.targetCameraPitch = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 6, this.targetCameraPitch)
      );
    }

    // Handle zoom with mouse wheel
    if (wheelDelta !== 0) {
      // Adjust zoom distance
      const currentDistance = this.targetCameraOffset.z;
      const newDistance = THREE.MathUtils.clamp(
        currentDistance + wheelDelta * 1.0,
        this.minZoomDistance,
        this.maxZoomDistance
      );

      this.targetCameraOffset.z = newDistance;
    }

    // Smoothly interpolate camera rotation and pitch
    this.cameraRotation = THREE.MathUtils.lerp(
      this.cameraRotation,
      this.targetCameraRotation,
      this.cameraLerpFactor
    );

    this.cameraPitch = THREE.MathUtils.lerp(
      this.cameraPitch,
      this.targetCameraPitch,
      this.cameraLerpFactor
    );

    // Update character's movement direction based on camera
    this.character.setRotationFromCamera(this.cameraRotation);

    // Position camera behind character with pitch - WoW style
    const cameraTarget = new THREE.Vector3(
      Math.sin(this.cameraRotation) * this.cameraOffset.z,
      this.cameraOffset.y +
        Math.sin(this.cameraPitch) * this.cameraOffset.z -
        1.5,
      Math.cos(this.cameraRotation) * this.cameraOffset.z - 1.5
    );

    // Smoothly interpolate camera offset
    this.cameraOffset = this.cameraOffset.lerp(
      this.targetCameraOffset,
      this.cameraLerpFactor
    );

    // Calculate desired camera position
    const desiredPosition = new THREE.Vector3()
      .copy(this.character.mesh.position)
      .add(cameraTarget);

    // Smoothly move camera to follow character
    this.camera.position.lerp(desiredPosition, this.cameraLerpFactor);

    // Look at character's head, adjusted by pitch
    const lookHeight =
      this.character.mesh.position.y + 1.3 + Math.sin(this.cameraPitch) * 2;

    const lookTarget = new THREE.Vector3(
      this.character.mesh.position.x,
      lookHeight,
      this.character.mesh.position.z
    );

    // Have the camera directly look at the target - WoW style
    this.camera.lookAt(lookTarget);

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
