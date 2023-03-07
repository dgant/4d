import * as THREE from 'three';
import { MeshBVH, MeshBVHVisualizer, StaticGeometryGenerator } from '/node_modules/three-mesh-bvh/build/index.module.js';

import FPSControls from './fpscontrols.js';
import constants from './constants.js';
const global = {};
const playerState = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  running: false,
  grounded: false,
  colliding: false,  
  velocityV3: new THREE.Vector3(0, 0, 0),
  keyboardV3: new THREE.Vector3(0, 0, 0),
  decelV3: new THREE.Vector3(0, 0, 0),
  accelV3: new THREE.Vector3(0, 0, 0)
}

let prevMs = performance.now();

function setup() {
  const color = new THREE.Color();

  // Generate camera
  global.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5 * constants.playerRadius, 1000);
  global.camera.position.y = constants.playerEyeLevel;
  global.controls = new FPSControls(global.camera, document.body);

  // Generate scene
  global.scene = new THREE.Scene();
  global.scene.background = new THREE.Color(0xfff0f0);
  global.scene.fog = new THREE.Fog(0xfff0f0, 0, 20);
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);

  // Generate renderer
  global.renderer = new THREE.WebGLRenderer({antialias: true});
  global.renderer.setPixelRatio(window.devicePixelRatio);
  global.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(global.renderer.domElement);
 
  // Attach listeners
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);

  // Create terrain
  const terrainGroup = new THREE.Group();

  // Generate floor
  let floorGeometry = new THREE.PlaneGeometry(400, 400, 100, 100);
  floorGeometry.rotateX(- Math.PI / 2);
  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices
  const colorsFloor = [];
  for (let i = 0, l = floorGeometry.attributes.position.count; i < l; ++i) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsFloor.push(color.r, color.g, color.b);
  }
  floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsFloor, 3));
  const floorMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  terrainGroup.attach(floor);
 
  // Generate cubes
  const boxGeometry = new THREE.BoxGeometry(constants.gridSize, constants.gridSize, constants.gridSize).toNonIndexed();
  const colorsBox = [];
  for (let i = 0, l = boxGeometry.attributes.position.count; i < l; ++i) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsBox.push(color.r, color.g, color.b);
  }
  boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));
  for (let i = 0; i < 1000; ++i) {
    const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: true });
    boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.x = Math.floor(constants.mapSize * (Math.random() * 2 - 1)) * constants.gridSize;
    box.position.y = Math.floor(constants.mapSize * (Math.random() * 2    )) * constants.gridSize + constants.gridSize / 2;
    box.position.z = Math.floor(constants.mapSize * (Math.random() * 2 - 1)) * constants.gridSize;
    terrainGroup.attach(box);
  }

  // Collisions/physics ///////////////////////////////////////////////////////////////////  
  
  const staticGenerator = new StaticGeometryGenerator(terrainGroup);
  staticGenerator.attributes = [ 'position' ];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });

  global.collider = new THREE.Mesh(mergedGeometry);
  global.collider.material.wireframe = true;
  global.collider.material.opacity = 0.5;
  global.collider.material.transparent = true;

  //const visualizer = new MeshBVHVisualizer(global.collider, 10);  
  global.scene.add(light);
  global.scene.add(global.camera);
  //global.scene.add(visualizer);
	global.scene.add(global.collider);
	global.scene.add(terrainGroup);
  loop();
}

function onKeyDown (event) {
  global.controls.lock(); // Must call this during a user-initiated event
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': playerState.moveForward = true; break;
    case 'ArrowLeft': case 'KeyA': playerState.moveLeft = true; break;
    case 'ArrowDown': case 'KeyS': playerState.moveBackward = true; break;
    case 'ArrowRight': case 'KeyD': playerState.moveRight = true; break;
    case 'ShiftLeft': case 'ShiftRight': playerState.running = true; break;
    case 'Space':
      if (playerState.grounded === true) {
        playerState.velocityV3.y = constants.playerJumpVelocity;
      }
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': playerState.moveForward = false; break;
    case 'ArrowLeft': case 'KeyA': playerState.moveLeft = false; break;
    case 'ArrowDown': case 'KeyS': playerState.moveBackward = false; break;
    case 'ArrowRight': case 'KeyD': playerState.moveRight = false; break;
    case 'ShiftLeft': case 'ShiftRight': playerState.running = false; break;
  }
}
function onWindowResize() {
  global.camera.aspect = window.innerWidth / window.innerHeight;
  global.camera.updateProjectionMatrix();
  global.renderer.setSize(window.innerWidth, window.innerHeight);
}

function logToId(id, value) {
  document.getElementById(id).innerHTML = JSON.stringify(value);
}
function loop() {
  requestAnimationFrame(loop);
  const nowMs = performance.now();
  // Cap the amount of time that can elapse between update
  // For example, alt-tabbing out of the window should not result in a ton of updates
  const deltaS = Math.min(constants.physicsMaxStep * 10, (nowMs - prevMs) * 0.001);
  let deltaRemainingS = deltaS;
  while (deltaRemainingS > 0) {
    const deltaStepS = Math.min(deltaRemainingS, constants.physicsMaxStep);
    deltaRemainingS -= deltaStepS;
    updatePhysics(deltaStepS);
  }
  logToId("camera", global.camera.position);
  logToId("azimuth", global.controls.getAzimuthalDirection(new THREE.Vector3()));
  logToId("keyboard", playerState.keyboardV3);
  logToId("velocity", playerState.velocityV3);
  logToId("acceleration", playerState.accelV3);
  logToId("deceleration", playerState.decelV3);
  logToId("running", playerState.running);
  logToId("colliding", playerState.colliding);
  logToId("grounded", playerState.grounded);
  prevMs = nowMs;
  global.renderer.render(global.scene, global.camera);
}

function updatePhysics(deltaS) {
  // Protagonist movement

  const forward         = new THREE.Vector3(0, 0, -1);
  const azimuth         = global.controls.getAzimuthalDirection(new THREE.Vector3());
  const cameraAngle     = forward.angleTo(azimuth) * Math.sign(new THREE.Vector3().crossVectors(forward, azimuth).y);
  const topSpeedRun     = constants.playerTopSpeedRun * (playerState.running ? 1.0 : constants.playerTopSpeedWalkMultiplier);
  const playerVYBefore  = playerState.velocityV3.y;
  
  // Treat player movement as 2d until later  
  playerState.velocityV3.y = 0;

  // Vectorize keyboard input. This is respective to the "forward" orientation
  playerState.keyboardV3.set(
      Number(playerState.moveRight)     * constants.playerStrafeMultiplier
    - Number(playerState.moveLeft)      * constants.playerStrafeMultiplier,
      0,
      Number(playerState.moveBackward)  * constants.playerStrafeMultiplier
    - Number(playerState.moveForward)   * 1.0);

  // 1. Decelerate against the direction of velocity
  // 2. Reorient deceleration in the same "forward" orientation the player global.controls have, for clear distinction between X/Z
  // 3. Restrict deceleration in directions the player is moving
  // 4. Flip deceleration to oppose velocity, then reorient it back to the global.camera frame
  // TODO: We allow some deceleration in the direction of travel to account for running -> strafing.
  //       This likely results in excessive deceleration
  // TODO: Could this just be decelV3.addScaledVector(playerControlV3, - decelV3.dot(playerControlV3)) ?
  playerState.decelV3.copy(playerState.velocityV3).applyAxisAngle(global.camera.up, -cameraAngle).clampLength(0, 1);
  playerState.decelV3.x = playerState.decelV3.x > 0
    ? Math.max(0, playerState.decelV3.x - Math.max(0, playerState.keyboardV3.x))
    : Math.min(0, playerState.decelV3.x - Math.min(0, playerState.keyboardV3.x));
  playerState.decelV3.z = playerState.decelV3.z > 0
    ? Math.max(0, playerState.decelV3.z - Math.max(0, playerState.keyboardV3.z))
    : Math.min(0, playerState.decelV3.z - Math.min(0, playerState.keyboardV3.z));  
    playerState.decelV3.negate().applyAxisAngle(global.camera.up, cameraAngle);

  // Accelerate according to player global.controls, oriented towards global.camera, clamped to avoid diagonal speeding
  playerState.accelV3.copy(playerState.keyboardV3).applyAxisAngle(global.camera.up, cameraAngle).clampLength(0.0, 1.0);
  playerState.velocityV3.addScaledVector(playerState.decelV3, deltaS * constants.playerDecel);
  playerState.velocityV3.addScaledVector(playerState.accelV3, deltaS * constants.playerAccel);
  playerState.velocityV3.clampLength(0, topSpeedRun);
  playerState.velocityV3.y = playerVYBefore - deltaS * constants.playerGravity;
  playerState.velocityV3.clampLength(0, constants.playerTopSpeedTotal);
  global.camera.position.addScaledVector(playerState.velocityV3, deltaS);

  // Player collisions
  
  // The global.renderer will automatically update the global.camera's world matrix,
  // but if we apply physics out of phase with rendering we need to update it manually.
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
  playerState.colliding = false;
  global.collider.geometry.boundsTree.shapecast({
    intersectsBounds: box => box.intersectsBox(capsuleBoundingBox),
    intersectsTriangle: tri => {
      const distance = tri.closestPointToSegment(playerCapsule, collisionObjectV3, collisionPlayerV3);
      if (distance < constants.playerRadius) {
        const depth = constants.playerRadius - distance;
        const direction = collisionPlayerV3.sub(collisionObjectV3).normalize();
        playerCapsule.start.addScaledVector(direction, depth);
        playerCapsule.end.addScaledVector(direction, depth);
        playerState.colliding = true;
      }
    }
  });

  playerState.grounded &&= playerState.colliding;
  if (playerState.colliding) {
    const footAfterV3 = new THREE.Vector3().copy(playerCapsule.start);
    footAfterV3.y = footAfterV3.y - constants.playerRadius;
    const displacementV3 = new THREE.Vector3().copy(footAfterV3).sub(footBeforeV3);
    playerState.grounded = Math.abs(displacementV3.y) >= displacementV3.length() / 2;
    global.camera.position.add(displacementV3);
    displacementV3.normalize();
    playerState.velocityV3.addScaledVector(displacementV3, - displacementV3.dot(playerState.velocityV3));    
  }
  if (global.camera.position.y < constants.playerEyeLevel) {
    playerState.velocityV3.y = 0;
    global.camera.position.y = constants.playerEyeLevel;
    playerState.grounded = true;
    console.log("Fell through Earth");
  }
}

setup();