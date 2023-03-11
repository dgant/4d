import * as THREE from 'three';
import { Capsule } from './node_modules/three/examples/jsm/math/Capsule.js';
import constants from './constants.js';
import global from './global.js';

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
  accelV3: new THREE.Vector3(0, 0, 0),
  positionV3: new THREE.Vector3(0, 0, 0), // This is the "foot" position eg. bottom tip of capsule
  capsule: new Capsule(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), constants.playerRadius),  
  updateCamera: function() {
    if (global.camera) {
      global.camera.position.copy(this.positionV3);
      global.camera.position.y += constants.playerEyeLevel;
    }
  },
  updatePosition: function(updateCameraPosition = true) {
    this.capsule.start.copy(this.positionV3)
    this.capsule.end.copy(this.positionV3)
    this.capsule.start.y += constants.playerRadius;
    this.capsule.end.y += constants.playerHeight - 2 * constants.playerRadius;
    if (updateCameraPosition) {
      this.updateCamera();
    }
  },
  // Moves the foot (capsule bottom tip) to a destination
  footSet: function(x, y, z) {
    this.positionV3.set(x, y, z);
    this.updatePosition();
  },
  // Moves the start (one radius above the foot) to a destination
  startSet: function(x, y, z) {
    this.positionV3.set(x, y, z);
    this.positionV3.y -= constants.playerRadius;
    this.updatePosition();
  },
  // Moves the foot (capsule bottom tip) to a destination
  footCopy: function(destinationV3) {
    this.positionV3.copy(destinationV3);
    this.updatePosition();
  },
  // Moves the start (one radius above the foot) to a destination
  startCopy: function(destinationV3) {
    this.positionV3.copy(destinationV3);
    this.positionV3.y -= constants.playerRadius;
    this.updatePosition();
  },
  // Moves the player by a fixed vector
  translate: function(deltaV3) {
    this.positionV3.translate(deltaV3);
    this.updatePosition();
  },
  // Moves the player by a vector, scaled by a multiplier
  addScaledVector: function(v3, scale) {
    this.positionV3.addScaledVector(v3, scale);
    this.updatePosition();
  }
}
player.updatePosition();
export default player;