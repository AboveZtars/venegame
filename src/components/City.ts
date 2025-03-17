import * as THREE from "three";
import {Building} from "./Building";

export class City {
  buildings: Building[] = [];
  citySize: number;
  buildingDensity: number;
  buildingSpacing: number;
  scene: THREE.Scene;
  buildingDimensions: Map<Building, {width: number; depth: number}> = new Map();

  constructor(
    scene: THREE.Scene,
    citySize: number = 160,
    buildingDensity: number = 0.5,
    buildingSpacing: number = 2
  ) {
    this.scene = scene;
    this.citySize = citySize;
    this.buildingDensity = buildingDensity;
    this.buildingSpacing = buildingSpacing;

    this.generateCity();
  }

  generateCity() {
    // City grid dimensions - use smaller grid cells for better spacing
    const gridSize = Math.floor(this.citySize / 10);
    const gridCellSize = this.citySize / gridSize;

    // Create buildings on a grid
    for (let x = -gridSize / 2; x < gridSize / 2; x++) {
      for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        // Skip some grid cells based on density
        if (Math.random() > this.buildingDensity) continue;

        // Randomize position slightly within grid cell
        // Reduced randomization factor from 0.5 to 0.3 for more orderly placement
        const posX =
          x * gridCellSize + (Math.random() - 0.5) * (gridCellSize * 0.3);
        const posZ =
          z * gridCellSize + (Math.random() - 0.5) * (gridCellSize * 0.3);

        // Skip building if too close to center (player starting area)
        const distFromCenter = Math.sqrt(posX * posX + posZ * posZ);
        if (distFromCenter < 25) continue; // Keep center area clear - increased from 15

        // Randomize building properties
        const buildingType = this.getBuildingType(distFromCenter);
        const width = this.getRandomDimension(buildingType);
        const depth = this.getRandomDimension(buildingType);
        const height = this.getRandomHeight(buildingType);

        // Skip if too close to another building
        if (this.isTooCloseToOtherBuildings(posX, posZ, width, depth)) continue;

        // Create building
        const building = new Building(
          this.scene,
          new THREE.Vector3(posX, 0, posZ),
          width,
          depth,
          height,
          buildingType
        );

        // Store building dimensions for later use
        this.buildingDimensions.set(building, {width, depth});
        this.buildings.push(building);
      }
    }

    // Add roads between buildings
    this.addRoads();
  }

  isTooCloseToOtherBuildings(
    x: number,
    z: number,
    newWidth: number,
    newDepth: number
  ): boolean {
    // Calculate dimensions with scaling factor applied (same as in Building constructor)
    const scaledNewWidth = newWidth * 5;
    const scaledNewDepth = newDepth * 5;

    for (const building of this.buildings) {
      const position = building.mesh.position;
      const dx = position.x - x;
      const dz = position.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Get building dimensions from our stored map
      const dimensions = this.buildingDimensions.get(building);
      if (!dimensions) continue;

      // Apply the same scaling as in Building constructor
      const scaledWidth = dimensions.width * 5;
      const scaledDepth = dimensions.depth * 5;

      // Calculate minimum distance based on the sizes of both buildings plus spacing
      const minDistance =
        Math.max(scaledWidth, scaledDepth) / 2 +
        Math.max(scaledNewWidth, scaledNewDepth) / 2 +
        this.buildingSpacing;

      if (distance < minDistance) {
        return true;
      }
    }

    return false;
  }

  getBuildingType(
    distanceFromCenter: number
  ): "apartment" | "house" | "skyscraper" {
    // Central area is more likely to have skyscrapers
    // Outer areas are more likely to have houses
    const cityEdge = this.citySize / 2;

    if (distanceFromCenter < cityEdge * 0.3) {
      // Downtown area - higher chance of skyscrapers
      const rand = Math.random();
      if (rand < 0.6) return "skyscraper";
      if (rand < 0.9) return "apartment";
      return "house";
    } else if (distanceFromCenter < cityEdge * 0.7) {
      // Mid city - higher chance of apartments
      const rand = Math.random();
      if (rand < 0.2) return "skyscraper";
      if (rand < 0.7) return "apartment";
      return "house";
    } else {
      // Suburbs - higher chance of houses
      const rand = Math.random();
      if (rand < 0.1) return "skyscraper";
      if (rand < 0.4) return "apartment";
      return "house";
    }
  }

  getRandomDimension(type: "apartment" | "house" | "skyscraper"): number {
    switch (type) {
      case "skyscraper":
        return 4 + Math.random() * 3; // 4-7 units
      case "apartment":
        return 5 + Math.random() * 4; // 5-9 units
      case "house":
        return 3 + Math.random() * 2; // 3-5 units
      default:
        return 4 + Math.random() * 2; // 4-6 units
    }
  }

  getRandomHeight(type: "apartment" | "house" | "skyscraper"): number {
    switch (type) {
      case "skyscraper":
        return 15 + Math.random() * 25; // 15-40 units
      case "apartment":
        return 8 + Math.random() * 7; // 8-15 units
      case "house":
        return 3 + Math.random() * 2; // 3-5 units
      default:
        return 5 + Math.random() * 5; // 5-10 units
    }
  }

  addRoads() {
    // Create a grid of roads
    const roadWidth = 3; // Increased from 2.5
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Create main roads
    const gridSize = Math.floor(this.citySize / 12); // Adjusted from 10 to 12
    const gridCellSize = this.citySize / gridSize;

    for (let i = -gridSize / 2; i <= gridSize / 2; i += 2) {
      // X-axis roads
      const roadX = new THREE.Mesh(
        new THREE.PlaneGeometry(this.citySize, roadWidth),
        roadMaterial
      );
      roadX.rotation.x = -Math.PI / 2;
      roadX.position.set(0, 0.05, i * gridCellSize);
      roadX.receiveShadow = true;
      this.scene.add(roadX);

      // Z-axis roads
      const roadZ = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, this.citySize),
        roadMaterial
      );
      roadZ.rotation.x = -Math.PI / 2;
      roadZ.position.set(i * gridCellSize, 0.05, 0);
      roadZ.receiveShadow = true;
      this.scene.add(roadZ);
    }
  }
}
