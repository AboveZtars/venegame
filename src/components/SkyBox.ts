import * as THREE from "three";

export class SkyBox {
  mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    // Create a large sphere geometry for the sky
    const geometry = new THREE.SphereGeometry(400, 32, 32);

    // Create a blue gradient material for the sky
    // Using a shader material for better sky effect
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: {value: new THREE.Color(0x0077ff)}, // Blue sky
      bottomColor: {value: new THREE.Color(0xaaddff)}, // Light blue/white at horizon
      offset: {value: 33},
      exponent: {value: 0.6},
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);
  }
}
