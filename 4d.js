import * as THREE from 'three';
import { MeshBVH, MeshBVHVisualizer, StaticGeometryGenerator } from '/node_modules/three-mesh-bvh/build/index.module.js';

import FPSControls from './fpscontrols.js';

// Units:
// * 1 distance unit = 1 meter
// * 1 unit of time = 1 ms
// Treat all constants as eg. meters, seconds, meters per second (per second), etc.
const gridSize = 2;
const mapSize = 12;
// Height/eye level taken as gender-averaged from
// https://www.firstinarchitecture.co.uk/average-male-and-female-dimensions/
const playerHeight = 1.675;
const playerEyeLevel = 1.567;
const playerRadius = 0.25;
const playerGravity = 4 * 9.8; // 9.8 would be realistic, but due to higher jump height feels too floaty.
const playerJumpHeight = gridSize * 1.2;
const playerJumpVelocity = Math.sqrt(2 * playerGravity * playerJumpHeight);
const playerTopSpeedRun = 8; // Humans: 8m/s sprint, 3m/s jog, 1.8 m/s walk
const playerTopSpeedWalkMultiplier = 0.4;
const playerTopSpeedTotal = 64; // Top speed including falling; restricted to allow setting physicsMaxStep
const playerStrafeMultiplier = 0.65;
const playerDecelTime = 0.4;
const playerAccelTime = 1.0;
const playerDecel = playerTopSpeedRun / playerDecelTime;
const playerAccel = playerTopSpeedRun / playerAccelTime + playerDecel;
const physicsMaxStep = playerRadius / playerTopSpeedTotal / 3; // Ensure we update frequently enough to collide properly

let camera, collider, controls, renderer, scene;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let running = false;
let grounded = false;
let colliding = false;

let prevMs = performance.now();
const playerV = new THREE.Vector3(0, 0, 0);
const playerControlV3 = new THREE.Vector3(0, 0, 0);
const playerDecelV3 = new THREE.Vector3(0, 0, 0);
const playerAccelV3 = new THREE.Vector3(0, 0, 0);
const color = new THREE.Color();

function setup() {
  // Generate camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5 * playerRadius, 1000);
  camera.position.y = playerEyeLevel;
  controls = new FPSControls(camera, document.body);

  // Generate scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff0f0);
  scene.fog = new THREE.Fog(0xfff0f0, 0, 20);
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);

  // Generate renderer
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
 
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
  const boxGeometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize).toNonIndexed();
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
    box.position.x = Math.floor(mapSize * (Math.random() * 2 - 1)) * gridSize;
    box.position.y = Math.floor(mapSize * (Math.random() * 2    )) * gridSize + gridSize / 2;
    box.position.z = Math.floor(mapSize * (Math.random() * 2 - 1)) * gridSize;
    terrainGroup.attach(box);
  }

  // Collisions/physics ///////////////////////////////////////////////////////////////////  
  
  const staticGenerator = new StaticGeometryGenerator(terrainGroup);
  staticGenerator.attributes = [ 'position' ];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });

  collider = new THREE.Mesh(mergedGeometry);
  collider.material.wireframe = true;
  collider.material.opacity = 0.5;
  collider.material.transparent = true;

  //const visualizer = new MeshBVHVisualizer(collider, 10);  
  scene.add(light);
  scene.add(camera);
  //scene.add(visualizer);
	scene.add(collider);
	scene.add(terrainGroup);
  loop();
}

function onKeyDown (event) {
  controls.lock(); // Must call this during a user-initiated event
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = true; break;
    case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
    case 'ArrowDown': case 'KeyS': moveBackward = true; break;
    case 'ArrowRight': case 'KeyD': moveRight = true; break;
    case 'ShiftLeft': case 'ShiftRight': running = true; break;
    case 'Space':
      if (grounded === true) {
        playerV.y = playerJumpVelocity;
      }
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = false; break;
    case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
    case 'ArrowDown': case 'KeyS': moveBackward = false; break;
    case 'ArrowRight': case 'KeyD': moveRight = false; break;
    case 'ShiftLeft': case 'ShiftRight': running = false; break;
  }
}
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function logToId(id, value) {
  document.getElementById(id).innerHTML = JSON.stringify(value);
}
function loop() {
  requestAnimationFrame(loop);
  const nowMs = performance.now();
  // Cap the amount of time that can elapse between update
  // For example, alt-tabbing out of the window should not result in a ton of updates
  const deltaS = Math.min(physicsMaxStep * 10, (nowMs - prevMs) * 0.001);
  let deltaRemainingS = deltaS;
  while (deltaRemainingS > 0) {
    const deltaStepS = Math.min(deltaRemainingS, physicsMaxStep);
    deltaRemainingS -= deltaStepS;
    updatePhysics(deltaStepS);
  }
  logToId("camera", camera.position);
  logToId("azimuth", controls.getAzimuthalDirection(new THREE.Vector3()));
  logToId("keyboard", playerControlV3);
  logToId("velocity", playerV);
  logToId("acceleration", playerAccelV3);
  logToId("deceleration", playerDecelV3);
  logToId("running", running);
  logToId("colliding", colliding);
  logToId("grounded", grounded);
  prevMs = nowMs;
  renderer.render(scene, camera);
}

function updatePhysics(deltaS) {
  // Protagonist movement

  const forward         = new THREE.Vector3(0, 0, -1);
  const azimuth         = controls.getAzimuthalDirection(new THREE.Vector3());
  const cameraAngle     = forward.angleTo(azimuth) * Math.sign(new THREE.Vector3().crossVectors(forward, azimuth).y);
  const topSpeedRun     = playerTopSpeedRun * (running ? 1.0 : playerTopSpeedWalkMultiplier);
  const playerVYBefore  = playerV.y;
  
  // Treat player movement as 2d until later  
  playerV.y = 0;

  // Vectorize keyboard input. This is respective to the "forward" orientation
  playerControlV3.set(
      Number(moveRight)     * playerStrafeMultiplier
    - Number(moveLeft)      * playerStrafeMultiplier,
      0,
      Number(moveBackward)  * playerStrafeMultiplier
    - Number(moveForward)   * 1.0);

  // 1. Decelerate against the direction of velocity
  // 2. Reorient deceleration in the same "forward" orientation the player controls have, for clear distinction between X/Z
  // 3. Restrict deceleration in directions the player is moving
  // 4. Flip deceleration to oppose velocity, then reorient it back to the camera frame
  // TODO: We allow some deceleration in the direction of travel to account for running -> strafing.
  //       This likely results in excessive deceleration
  // TODO: Could this just be playerDecelV3.addScaledVector(playerControlV3, - playerDecelV3.dot(playerControlV3)) ?
  playerDecelV3.copy(playerV).applyAxisAngle(camera.up, -cameraAngle).clampLength(0, 1);
  playerDecelV3.x = playerDecelV3.x > 0
    ? Math.max(0, playerDecelV3.x - Math.max(0, playerControlV3.x))
    : Math.min(0, playerDecelV3.x - Math.min(0, playerControlV3.x));
  playerDecelV3.z = playerDecelV3.z > 0
    ? Math.max(0, playerDecelV3.z - Math.max(0, playerControlV3.z))
    : Math.min(0, playerDecelV3.z - Math.min(0, playerControlV3.z));  
  playerDecelV3.negate().applyAxisAngle(camera.up, cameraAngle);

  // Accelerate according to player controls, oriented towards camera, clamped to avoid diagonal speeding
  playerAccelV3.copy(playerControlV3).applyAxisAngle(camera.up, cameraAngle).clampLength(0.0, 1.0);
  playerV.addScaledVector(playerDecelV3, deltaS * playerDecel);
  playerV.addScaledVector(playerAccelV3, deltaS * playerAccel);
  playerV.clampLength(0, topSpeedRun);
  playerV.y = playerVYBefore - deltaS * playerGravity;
  playerV.clampLength(0, playerTopSpeedTotal);
  camera.position.addScaledVector(playerV, deltaS);

  // Player collisions
  
  // The renderer will automatically update the camera's world matrix,
  // but if we apply physics out of phase with rendering we need to update it manually.
  camera.updateMatrixWorld();
  const footBeforeV3 = new THREE.Vector3().copy(camera.position);
  footBeforeV3.y = footBeforeV3.y - playerEyeLevel
  const playerCapsule = new THREE.Line3();  
  playerCapsule.start.copy(footBeforeV3);
  playerCapsule.end.copy(footBeforeV3);
  playerCapsule.start.y = footBeforeV3.y + playerRadius
  playerCapsule.end.y   = footBeforeV3.y + playerHeight - playerRadius;

  // Get the axis-aligned bounding box of the capsule
  const capsuleBoundingBox = new THREE.Box3();
  capsuleBoundingBox.makeEmpty();
  capsuleBoundingBox.expandByPoint(playerCapsule.start);
  capsuleBoundingBox.expandByPoint(playerCapsule.end);
  capsuleBoundingBox.min.addScalar( - playerRadius);
  capsuleBoundingBox.max.addScalar(   playerRadius);

  const collisionObjectV3 = new THREE.Vector3(0, 0, 0);
  const collisionPlayerV3 = new THREE.Vector3(0, 0, 0);
  colliding = false;
  collider.geometry.boundsTree.shapecast({
    intersectsBounds: box => box.intersectsBox(capsuleBoundingBox),
    intersectsTriangle: tri => {
      const distance = tri.closestPointToSegment(playerCapsule, collisionObjectV3, collisionPlayerV3);
      if (distance < playerRadius) {
        const depth = playerRadius - distance;
        const direction = collisionPlayerV3.sub(collisionObjectV3).normalize();
        playerCapsule.start.addScaledVector(direction, depth);
        playerCapsule.end.addScaledVector(direction, depth);
        colliding = true;
      }
    }
  });

  grounded &&= colliding;
  if (colliding) {
    const footAfterV3 = new THREE.Vector3().copy(playerCapsule.start);
    footAfterV3.y = footAfterV3.y - playerRadius;
    const displacementV3 = new THREE.Vector3().copy(footAfterV3).sub(footBeforeV3);
    grounded = Math.abs(displacementV3.y) >= displacementV3.length() / 2;
    camera.position.add(displacementV3);
    displacementV3.normalize();
    playerV.addScaledVector(displacementV3, - displacementV3.dot(playerV));    
  }
  if (camera.position.y < playerEyeLevel) {
    playerV.y = 0;
    camera.position.y = playerEyeLevel;
    grounded = true;
    console.log("Fell through Earth");
  }
}

setup();