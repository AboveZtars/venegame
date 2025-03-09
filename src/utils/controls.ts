export class InputControls {
  keys: {[key: string]: boolean} = {};
  mouse: {
    x: number;
    y: number;
    isLocked: boolean;
    isDragging: boolean;
    rightButtonDown: boolean;
    sensitivity: number;
    movementX: number;
    movementY: number;
    wheelDelta: number;
  };

  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      crouch: false,
      run: false,
      walk: false, // For slow movement
    };

    this.mouse = {
      x: 0,
      y: 0,
      isLocked: false,
      isDragging: false,
      rightButtonDown: false,
      sensitivity: 0.5, // Increased sensitivity for WoW-like feel
      movementX: 0,
      movementY: 0,
      wheelDelta: 0,
    };

    // Keyboard event listeners
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));

    // Mouse event listeners
    document.addEventListener("mousedown", (e) => this.onMouseDown(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("wheel", (e) => this.onMouseWheel(e));

    // Prevent context menu on right-click
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Pointer lock change event
    document.addEventListener("pointerlockchange", () =>
      this.onPointerLockChange()
    );
    document.addEventListener("pointerlockerror", () =>
      console.error("Pointer lock error")
    );
  }

  onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case "KeyW":
        this.keys.forward = true;
        break;
      case "KeyS":
        this.keys.backward = true;
        break;
      case "KeyA":
        this.keys.left = true;
        break;
      case "KeyD":
        this.keys.right = true;
        break;
      case "Space":
        this.keys.jump = true;
        break;
      case "KeyC":
        this.keys.crouch = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.run = true;
        break;
      case "AltLeft":
      case "AltRight":
        this.keys.walk = true;
        break;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case "KeyW":
        this.keys.forward = false;
        break;
      case "KeyS":
        this.keys.backward = false;
        break;
      case "KeyA":
        this.keys.left = false;
        break;
      case "KeyD":
        this.keys.right = false;
        break;
      case "Space":
        this.keys.jump = false;
        break;
      case "KeyC":
        this.keys.crouch = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.run = false;
        break;
      case "AltLeft":
      case "AltRight":
        this.keys.walk = false;
        break;
    }
  }

  onMouseDown(event: MouseEvent) {
    // Left mouse button (button 0)
    if (event.button === 0) {
      this.mouse.isDragging = true;
    }
    // Right mouse button (button 2) - for camera rotation
    else if (event.button === 2) {
      this.mouse.rightButtonDown = true;
      document.body.requestPointerLock();
    }
  }

  onMouseUp(event: MouseEvent) {
    // Left mouse button (button 0)
    if (event.button === 0) {
      this.mouse.isDragging = false;
    }
    // Right mouse button (button 2)
    else if (event.button === 2) {
      this.mouse.rightButtonDown = false;
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }

  onMouseMove(event: MouseEvent) {
    // Store mouse position
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    // If pointer is locked and right mouse button is down (WoW style camera)
    if (this.mouse.isLocked && this.mouse.rightButtonDown) {
      // Get mouse movement (with sensitivity applied)
      this.mouse.movementX = event.movementX * this.mouse.sensitivity;
      this.mouse.movementY = event.movementY * this.mouse.sensitivity;
    } else {
      this.mouse.movementX = 0;
      this.mouse.movementY = 0;
    }
  }

  onMouseWheel(event: WheelEvent) {
    // Normalize wheel delta across browsers
    const delta = Math.sign(event.deltaY) * 0.5;
    this.mouse.wheelDelta = delta;
  }

  onPointerLockChange() {
    // Update lock state
    this.mouse.isLocked = document.pointerLockElement === document.body;
  }

  // Reset mouse movement and wheel delta at the end of each frame
  resetMouseMovement() {
    this.mouse.movementX = 0;
    this.mouse.movementY = 0;
    this.mouse.wheelDelta = 0;
  }
}
