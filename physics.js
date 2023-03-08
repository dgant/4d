import * as THREE from 'three';
import constants from './constants.js';
import player from './player.js';
import global from './global.js';

let prevMs = performance.now();
function updatePhysics() {  
  const nowMs = performance.now();
  // Cap the amount of time that can elapse between updates
  // For example, alt-tabbing out of the window should not result in a ton of updates
  let deltaRemainingS = Math.min(constants.physicsMaxStepS * 10, (nowMs - prevMs) * 0.001);
  while (deltaRemainingS > 0) {
    const deltaStepS = Math.min(deltaRemainingS, constants.physicsMaxStepS);
    deltaRemainingS -= deltaStepS;
    stepPhysics(deltaStepS);
  }
  prevMs = nowMs;
}
function stepPhysics(deltaS) {
  // 4D rotation
  global.camera.addW4d(deltaS * constants.player4dRotation * (Number(player.rotateOut) - Number(player.rotateIn)));

  // Protagonist movement
  const forward         = new THREE.Vector3(0, 0, -1);
  const azimuth         = global.controls.getAzimuthalDirection(new THREE.Vector3());
  const cameraAngle     = forward.angleTo(azimuth) * Math.sign(new THREE.Vector3().crossVectors(forward, azimuth).y);
  const topSpeedRun     = constants.playerTopSpeedRun * (player.running ? 1.0 : constants.playerTopSpeedWalkMultiplier);
  const playerVYBefore  = player.velocityV3.y;
  
  // Treat player movement as 2d until later  
  player.velocityV3.y = 0;

  // Vectorize keyboard input. This is with respect to the "forward" orientation
  player.keyboardV3.set(
      Number(player.moveRight)     * constants.playerStrafeMultiplier
    - Number(player.moveLeft)      * constants.playerStrafeMultiplier,
      0,
      Number(player.moveBackward)  * constants.playerStrafeMultiplier
    - Number(player.moveForward)   * 1.0);

  // 1. Decelerate against the direction of velocity
  // 2. Reorient deceleration in the same "forward" orientation the player global.controls have, for clear distinction between X/Z
  // 3. Restrict deceleration in directions the player is moving
  // 4. Flip deceleration to oppose velocity, then reorient it back to the global.camera frame
  // TODO: We allow some deceleration in the direction of travel to account for running -> walking/strafing.
  //       This likely results in excessive deceleration
  // TODO: Could this just be decelV3.addScaledVector(playerControlV3, - decelV3.dot(playerControlV3)) ?
  player.decelV3.copy(player.velocityV3).applyAxisAngle(global.camera.up, -cameraAngle).clampLength(0, 1);
  player.decelV3.x = player.decelV3.x > 0
    ? Math.max(0, player.decelV3.x - Math.max(0, player.keyboardV3.x))
    : Math.min(0, player.decelV3.x - Math.min(0, player.keyboardV3.x));
  player.decelV3.z = player.decelV3.z > 0
    ? Math.max(0, player.decelV3.z - Math.max(0, player.keyboardV3.z))
    : Math.min(0, player.decelV3.z - Math.min(0, player.keyboardV3.z));  
  player.decelV3.negate().applyAxisAngle(global.camera.up, cameraAngle);

  // Accelerate according to player global.controls, oriented towards global.camera, clamped to avoid diagonal speeding
  player.accelV3.copy(player.keyboardV3).applyAxisAngle(global.camera.up, cameraAngle).clampLength(0.0, 1.0);
  player.velocityV3.addScaledVector(player.decelV3, deltaS * constants.playerDecel);
  player.velocityV3.addScaledVector(player.accelV3, deltaS * constants.playerAccel);
  player.velocityV3.clampLength(0, topSpeedRun);
  player.velocityV3.y = playerVYBefore - deltaS * constants.playerGravity;
  player.velocityV3.clampLength(0, constants.playerTopSpeedTotal);
  global.camera.position.addScaledVector(player.velocityV3, deltaS);

  // Player collisions
  global.camera.updateMatrixWorld();
  const footBeforeV3 = new THREE.Vector3().copy(global.camera.position);
  footBeforeV3.y = footBeforeV3.y - constants.playerEyeLevel
  const playerCapsule = new THREE.Line3();  
  playerCapsule.start.copy(footBeforeV3);
  playerCapsule.end.copy(footBeforeV3);
  playerCapsule.start.y = footBeforeV3.y + constants.playerRadius
  playerCapsule.end.y   = footBeforeV3.y + constants.playerHeight - constants.playerRadius;

  // Get the axis-aligned bounding box of the capsule
  const capsuleBoundingBox = new THREE.Box3();
  capsuleBoundingBox.makeEmpty();
  capsuleBoundingBox.expandByPoint(playerCapsule.start);
  capsuleBoundingBox.expandByPoint(playerCapsule.end);
  capsuleBoundingBox.min.addScalar( - constants.playerRadius);
  capsuleBoundingBox.max.addScalar(   constants.playerRadius);

  const collisionObjectV3 = new THREE.Vector3(0, 0, 0);
  const collisionPlayerV3 = new THREE.Vector3(0, 0, 0);
  player.colliding = false;
  global.collider.geometry.boundsTree.shapecast({
    intersectsBounds: box => box.intersectsBox(capsuleBoundingBox),
    intersectsTriangle: tri => {
      const distance = tri.closestPointToSegment(playerCapsule, collisionObjectV3, collisionPlayerV3);
      if (distance < constants.playerRadius) {
        const depth = constants.playerRadius - distance;
        const direction = collisionPlayerV3.sub(collisionObjectV3).normalize();
        playerCapsule.start.addScaledVector(direction, depth);
        playerCapsule.end.addScaledVector(direction, depth);
        player.colliding = true;
      }
    }
  });

  player.grounded &&= player.colliding;
  if (player.colliding) {
    const footAfterV3 = new THREE.Vector3().copy(playerCapsule.start);
    footAfterV3.y = footAfterV3.y - constants.playerRadius;
    const displacementV3 = new THREE.Vector3().copy(footAfterV3).sub(footBeforeV3);
    player.grounded = Math.abs(displacementV3.y) >= displacementV3.length() / 2;
    global.camera.position.add(displacementV3);
    displacementV3.normalize();
    player.velocityV3.addScaledVector(displacementV3, - displacementV3.dot(player.velocityV3));    
  }
  if (global.camera.position.y < constants.playerEyeLevel) {
    player.velocityV3.y = 0;
    global.camera.position.y = constants.playerEyeLevel;
    player.grounded = true;
    console.log("Fell through Earth");
  }
}
export default updatePhysics;