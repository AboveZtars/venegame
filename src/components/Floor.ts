import * as THREE from "three";

export class Floor {
  mesh: THREE.Object3D;

  constructor(scene: THREE.Scene, size: number = 10000) {
    // Create a large floor plane
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshStandardMaterial({
      color: 0x88aa88,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.mesh.position.y = 0;
    this.mesh.receiveShadow = true;

    // Add grid helper with subtle color
    const gridHelper = new THREE.GridHelper(size, size / 5, 0x444444, 0x444444);
    gridHelper.position.y = 0.01; // Slightly above the floor to avoid z-fighting
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;

    // Add both to scene
    scene.add(this.mesh);
    scene.add(gridHelper);
  }
}
