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
  // Define key mappings for better maintainability
  keyMap: {[code: string]: string} = {
    KeyW: "forward",
    KeyS: "backward",
    KeyA: "left",
    KeyD: "right",
    Space: "jump",
    KeyC: "crouch",
    ShiftLeft: "run",
    ShiftRight: "run",
    AltLeft: "walk",
    AltRight: "walk",
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
      sensitivity: 0.6, // Adjusted sensitivity for WoW-like feel
      movementX: 0,
      movementY: 0,
      wheelDelta: 0,
    };

    // Keyboard event listeners
    window.addEventListener("keydown", (e) => this.handleKeyEvent(e, true));
    window.addEventListener("keyup", (e) => this.handleKeyEvent(e, false));

    // Mouse event listeners
    document.addEventListener("mousedown", (e) =>
      this.handleMouseButtonEvent(e, true)
    );
    document.addEventListener("mouseup", (e) =>
      this.handleMouseButtonEvent(e, false)
    );
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("wheel", (e) => this.onMouseWheel(e));

    // Prevent context menu on right-click (essential for WoW-style camera)
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Pointer lock change event
    document.addEventListener("pointerlockchange", () =>
      this.onPointerLockChange()
    );
    document.addEventListener("pointerlockerror", () =>
      console.error("Pointer lock error")
    );
  }

  // Unified key handling method
  handleKeyEvent(event: KeyboardEvent, isKeyDown: boolean) {
    const keyAction = this.keyMap[event.code];
    if (keyAction && this.keys[keyAction] !== undefined) {
      this.keys[keyAction] = isKeyDown;
    }
  }

  // Unified mouse button handling method
  handleMouseButtonEvent(event: MouseEvent, isButtonDown: boolean) {
    // Left mouse button (button 0)
    if (event.button === 0) {
      this.mouse.isDragging = isButtonDown;
    }
    // Right mouse button (button 2) - for camera rotation (WoW style)
    else if (event.button === 2) {
      this.mouse.rightButtonDown = isButtonDown;

      // Handle pointer lock based on button state
      if (isButtonDown) {
        // Request pointer lock when right button is pressed
        document.body.requestPointerLock();
      } else if (document.pointerLockElement) {
        // Exit pointer lock when right button is released
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
      // Apply sensitivity to mouse movement for camera rotation
      // Add dampening to reduce jerkiness on larger movements (like WoW)
      const dampeningFactor = Math.min(
        1,
        10 / (Math.abs(event.movementX) + Math.abs(event.movementY) + 5)
      );
      this.mouse.movementX =
        event.movementX * this.mouse.sensitivity * dampeningFactor;
      this.mouse.movementY =
        event.movementY * this.mouse.sensitivity * dampeningFactor;
    } else {
      this.mouse.movementX = 0;
      this.mouse.movementY = 0;
    }
  }

  onMouseWheel(event: WheelEvent) {
    // Normalize wheel delta across browsers with smoother scaling for WoW-like zooming
    const delta = Math.sign(event.deltaY) * 0.3;
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
