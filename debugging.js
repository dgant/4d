import * as THREE from 'three';
import player from './player.js';
import global from './global.js';

function updateDebugging() {
  logToId("camera", global.camera.position);
  logToId("azimuth", global.controls.getAzimuthalDirection(new THREE.Vector3()));
  logToId("keyboard", player.keyboardV3);
  logToId("velocity", player.velocityV3);
  logToId("acceleration", player.accelV3);
  logToId("deceleration", player.decelV3);
  logToId("running", player.running);
  logToId("colliding", player.colliding);
  logToId("grounded", player.grounded);
}
function logToId(id, value) {
  document.getElementById(id).innerHTML = JSON.stringify(value);
}
export default updateDebugging;