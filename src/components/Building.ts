import * as THREE from "three";

export class Building {
  mesh: THREE.Group;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    width: number,
    depth: number,
    height: number,
    type: "apartment" | "house" | "skyscraper" = "apartment"
  ) {
    // Apply scale correction - making buildings appropriate size
    width *= 5;
    depth *= 5;
    height *= 5;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    // Create base building structure
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);

    // Different materials for different building types
    let material;

    switch (type) {
      case "house":
        // Houses - brownish, reddish with some texture
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(
            Math.random() * 0.2 + 0.6,
            Math.random() * 0.2 + 0.3,
            Math.random() * 0.1 + 0.1
          ),
          roughness: 0.8,
          metalness: 0.1,
        });
        break;
      case "skyscraper":
        // Skyscrapers - glass like, blue/gray tint with reflective surface
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(
            Math.random() * 0.1 + 0.7,
            Math.random() * 0.1 + 0.7,
            Math.random() * 0.2 + 0.8
          ),
          roughness: 0.1,
          metalness: 0.9,
          envMapIntensity: 1.5,
        });
        break;
      case "apartment":
      default:
        // Apartment buildings - varied colors with slight texture
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(
            Math.random() * 0.4 + 0.4,
            Math.random() * 0.4 + 0.4,
            Math.random() * 0.4 + 0.4
          ),
          roughness: 0.6,
          metalness: 0.2,
        });
    }

    const building = new THREE.Mesh(buildingGeometry, material);
    building.position.y = height / 2; // Position on ground
    building.castShadow = true;
    building.receiveShadow = true;

    this.mesh.add(building);

    // Add windows
    this.addWindows(building, width, height, depth, type);

    // Add door
    this.addDoor(width, height, depth, type);

    // Add roof for houses
    if (type === "house") {
      this.addRoof(width, depth, height);
    }

    // Add architectural details based on building type
    if (type === "apartment" || type === "skyscraper") {
      this.addLedges(width, height, depth, type);
    }

    scene.add(this.mesh);
  }

  addWindows(
    building: THREE.Mesh,
    width: number,
    height: number,
    depth: number,
    type: string
  ) {
    // Random chance some windows will be lit
    const createLitWindow = () => {
      const isLit = Math.random() > 0.6;
      return new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: isLit ? 0xffffaa : 0x222222,
        emissiveIntensity: isLit ? 0.5 : 0.1,
        roughness: 0.1,
        metalness: 0.8,
      });
    };

    // Window dimensions and spacing depend on building type
    let windowWidth, windowHeight, spacingX, spacingY, startY;

    switch (type) {
      case "skyscraper":
        windowWidth = 1.5;
        windowHeight = 2.0;
        spacingX = 3.0;
        spacingY = 3.5;
        startY = 3.0;
        break;
      case "house":
        windowWidth = 1.8;
        windowHeight = 2.4;
        spacingX = 4.5;
        spacingY = 4.0;
        startY = 3.5;
        break;
      case "apartment":
      default:
        windowWidth = 1.8;
        windowHeight = 2.2;
        spacingX = 3.8;
        spacingY = 4.0;
        startY = 3.0;
    }

    // Create window frame geometry for more detail
    const frameSize = 0.1;

    // Add windows to front and back
    for (let side of [-1, 1]) {
      for (
        let x = -width / 2 + spacingX;
        x < width / 2 - spacingX;
        x += spacingX
      ) {
        for (let y = startY; y < height - spacingY; y += spacingY) {
          // Window glass
          const windowGeometry = new THREE.PlaneGeometry(
            windowWidth,
            windowHeight
          );
          const windowMesh = new THREE.Mesh(windowGeometry, createLitWindow());

          windowMesh.position.set(x, y, (side * depth) / 2 + 0.05);
          windowMesh.rotation.y = side === 1 ? Math.PI : 0;

          // Window frame
          const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.5,
          });

          const frameGeometry = new THREE.BoxGeometry(
            windowWidth + frameSize,
            windowHeight + frameSize,
            0.1
          );

          const frame = new THREE.Mesh(frameGeometry, frameMaterial);
          frame.position.set(x, y, (side * depth) / 2 + 0.02);
          frame.rotation.y = side === 1 ? Math.PI : 0;

          this.mesh.add(frame);
          this.mesh.add(windowMesh);
        }
      }
    }

    // Add windows to sides
    for (let side of [-1, 1]) {
      for (
        let z = -depth / 2 + spacingX;
        z < depth / 2 - spacingX;
        z += spacingX
      ) {
        for (let y = startY; y < height - spacingY; y += spacingY) {
          // Window glass
          const windowGeometry = new THREE.PlaneGeometry(
            windowWidth,
            windowHeight
          );
          const windowMesh = new THREE.Mesh(windowGeometry, createLitWindow());

          windowMesh.position.set((side * width) / 2 + 0.05, y, z);
          windowMesh.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

          // Window frame
          const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.5,
          });

          const frameGeometry = new THREE.BoxGeometry(
            windowWidth + frameSize,
            windowHeight + frameSize,
            0.1
          );

          const frame = new THREE.Mesh(frameGeometry, frameMaterial);
          frame.position.set((side * width) / 2 + 0.02, y, z);
          frame.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

          this.mesh.add(frame);
          this.mesh.add(windowMesh);
        }
      }
    }
  }

  addDoor(width: number, depth: number, height: number, type: string) {
    // Door dimensions based on building type
    let doorWidth, doorHeight;

    switch (type) {
      case "skyscraper":
        doorWidth = 3.0;
        doorHeight = 4.0;
        break;
      case "house":
        doorWidth = 2.0;
        doorHeight = 3.0;
        break;
      case "apartment":
      default:
        doorWidth = 2.5;
        doorHeight = 3.5;
    }

    // Door materials
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: type === "skyscraper" ? 0x333333 : 0x5c2e1d,
      roughness: 0.5,
      metalness: type === "skyscraper" ? 0.8 : 0.2,
    });

    // Door frame material
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.5,
    });

    // Create door and frame
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    // Position door in front of building
    door.position.set(0, doorHeight / 2, depth / 2);

    // Create door frame
    const frameWidth = 0.4;
    const frameGeometry = new THREE.BoxGeometry(
      doorWidth + frameWidth,
      doorHeight + frameWidth / 2,
      0.1
    );
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, doorHeight / 2, depth / 2 + 0.02);

    this.mesh.add(door);
    this.mesh.add(frame);

    // Add steps for houses and apartments
    if (type === "house" || type === "apartment") {
      const stepsWidth = doorWidth * 1.5;
      const stepsDepth = 1.0;
      const stepsHeight = 0.5;

      const stepsGeometry = new THREE.BoxGeometry(
        stepsWidth,
        stepsHeight,
        stepsDepth
      );
      const stepsMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.8,
        metalness: 0.1,
      });

      const steps = new THREE.Mesh(stepsGeometry, stepsMaterial);
      steps.position.set(0, stepsHeight / 2, depth / 2 + stepsDepth / 2);

      this.mesh.add(steps);
    }
  }

  addRoof(width: number, depth: number, height: number) {
    // Create a triangular roof for houses
    const roofHeight = width * 0.3;
    const roofGeometry = new THREE.ConeGeometry(
      Math.max(width, depth) * 0.7,
      roofHeight,
      4
    );
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x883333,
      roughness: 0.7,
      metalness: 0.1,
    });

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.y = Math.PI / 4; // Rotate to align with building
    roof.position.y = height + roofHeight / 2;
    roof.castShadow = true;

    this.mesh.add(roof);

    // Add chimney
    if (Math.random() > 0.5) {
      const chimneyWidth = width * 0.1;
      const chimneyHeight = roofHeight * 0.7;
      const chimneyGeometry = new THREE.BoxGeometry(
        chimneyWidth,
        chimneyHeight,
        chimneyWidth
      );
      const chimneyMaterial = new THREE.MeshStandardMaterial({
        color: 0x663333,
        roughness: 0.9,
        metalness: 0.1,
      });

      const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
      chimney.position.set(
        width * 0.25 * (Math.random() > 0.5 ? 1 : -1),
        height + roofHeight * 0.6,
        depth * 0.25 * (Math.random() > 0.5 ? 1 : -1)
      );

      this.mesh.add(chimney);
    }
  }

  addLedges(width: number, height: number, depth: number, type: string) {
    // Add ledges/balconies to apartments and decorative elements to skyscrapers
    const ledgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.8,
      metalness: 0.2,
    });

    const floorHeight = type === "skyscraper" ? 3.5 : 4.0;
    const ledgeDepth = type === "skyscraper" ? 0.3 : 1.0;
    const ledgeThickness = 0.2;

    // Add ledges at floor intervals
    for (let y = floorHeight; y < height - floorHeight / 2; y += floorHeight) {
      if (type === "apartment" || Math.random() > 0.7) {
        // Create a ledge that goes around the entire building
        const frontBackGeometry = new THREE.BoxGeometry(
          width,
          ledgeThickness,
          ledgeDepth
        );
        const sidesGeometry = new THREE.BoxGeometry(
          ledgeDepth,
          ledgeThickness,
          depth
        );

        // Front ledge
        const frontLedge = new THREE.Mesh(frontBackGeometry, ledgeMaterial);
        frontLedge.position.set(0, y, depth / 2 + ledgeDepth / 2);
        this.mesh.add(frontLedge);

        // Back ledge
        const backLedge = new THREE.Mesh(frontBackGeometry, ledgeMaterial);
        backLedge.position.set(0, y, -depth / 2 - ledgeDepth / 2);
        this.mesh.add(backLedge);

        // Left ledge
        const leftLedge = new THREE.Mesh(sidesGeometry, ledgeMaterial);
        leftLedge.position.set(-width / 2 - ledgeDepth / 2, y, 0);
        this.mesh.add(leftLedge);

        // Right ledge
        const rightLedge = new THREE.Mesh(sidesGeometry, ledgeMaterial);
        rightLedge.position.set(width / 2 + ledgeDepth / 2, y, 0);
        this.mesh.add(rightLedge);
      }
    }

    // Add roof details for skyscrapers
    if (type === "skyscraper") {
      const roofDetailSize = Math.min(width, depth) * 0.3;
      const roofDetailHeight = height * 0.1;

      const roofDetailGeometry = new THREE.BoxGeometry(
        roofDetailSize,
        roofDetailHeight,
        roofDetailSize
      );
      const roofDetailMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.8,
      });

      const roofDetail = new THREE.Mesh(roofDetailGeometry, roofDetailMaterial);
      roofDetail.position.y = height + roofDetailHeight / 2;

      this.mesh.add(roofDetail);

      // Add antenna for tall buildings
      const antennaHeight = height * 0.2;
      const antennaGeometry = new THREE.CylinderGeometry(
        0.1,
        0.3,
        antennaHeight
      );
      const antennaMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.9,
      });

      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.y = height + roofDetailHeight + antennaHeight / 2;

      this.mesh.add(antenna);
    }
  }
}
