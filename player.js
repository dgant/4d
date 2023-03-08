import * as THREE from 'three';
const player = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  rotateOut: false,
  rotateIn: false,
  running: false,
  grounded: false,
  colliding: false,  
  velocityV3: new THREE.Vector3(0, 0, 0),
  keyboardV3: new THREE.Vector3(0, 0, 0),
  decelV3: new THREE.Vector3(0, 0, 0),
  accelV3: new THREE.Vector3(0, 0, 0)
}
export default player;