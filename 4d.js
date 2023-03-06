import * as THREE from 'three';
import { MeshBVH, MeshBVHVisualizer, StaticGeometryGenerator } from '/node_modules/three-mesh-bvh/build/index.module.js';

// Units:
// * 1 distance unit = 1 meter
// * 1 unit of time = 1 ms
const gridSize = 2;
const mapSize = 15;
const playerGravity = 4 * 9.8; // 9.8 would be realistic, but due to higher jump height feels too floaty.
const playerJumpHeight = gridSize * 1.2;
const playerJumpVelocity = Math.sqrt(2 * playerGravity * playerJumpHeight);
const playerTopSpeed = 8; // Humans: 8m/s sprint, 3m/s jog, 1.8 m/s walk
const playerTopSpeedWalkMultiplier = 0.4;
const playerStrafeMultiplier = 0.65;
const playerDecelTime = 0.6;
const playerAccelTime = 1.0;
const playerDecel = playerTopSpeed / playerDecelTime;
const playerAccel = playerTopSpeed / playerAccelTime + playerDecel;

// Height/eye level taken as gender-averaged from
// https://www.firstinarchitecture.co.uk/average-male-and-female-dimensions/
const playerHeight = 1.675;
const playerEyeLevel = 1.567;
const playerRadius = 0.25;


let camera, collider, controls, renderer, scene;
const capsuleIntersection = new THREE.Vector3();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let running = false;
let jumping = false;
let colliding = false;

let prevMs = performance.now();
const playerV = new THREE.Vector3(0, 0, 0);
const playerControlV3 = new THREE.Vector3(0, 0, 0);
const playerDecelV3 = new THREE.Vector3(0, 0, 0);
const playerAccelV3 = new THREE.Vector3(0, 0, 0);
const color = new THREE.Color();

// Based on THREE.PointerLockControls
class FPSControls extends THREE.EventDispatcher {
	constructor(camera, domElement) {
    const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const _changeEvent = { type: 'change' };
    const _lockEvent = { type: 'lock' };
    const _unlockEvent = { type: 'unlock' };
    const _HALF_PI = Math.PI / 2;
		super();    
		this.domElement = domElement;
		this.isLocked = false;
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians
		this.pointerSpeed = 1.0;
		const scope = this;
		function onMouseMove(event) {
			if (scope.isLocked === false) return;
			const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
			const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
			_euler.setFromQuaternion(camera.quaternion);
			_euler.y -= movementX * 0.002 * scope.pointerSpeed;
			_euler.x -= movementY * 0.002 * scope.pointerSpeed;
			_euler.x = Math.max(_HALF_PI - scope.maxPolarAngle, Math.min(_HALF_PI - scope.minPolarAngle, _euler.x));
			camera.quaternion.setFromEuler(_euler);
			scope.dispatchEvent(_changeEvent);
		}
		function onPointerlockChange() {
      scope.isLocked = scope.domElement.ownerDocument.pointerLockElement === scope.domElement;
			scope.dispatchEvent(scope.isLocked ? _lockEvent : _unlockEvent);
		}
		function onPointerlockError() { console.error('FPSControls: Unable to use Pointer Lock API'); }
		this.connect = function () {
			scope.domElement.ownerDocument.addEventListener('mousemove', onMouseMove);
			scope.domElement.ownerDocument.addEventListener('pointerlockchange', onPointerlockChange);
			scope.domElement.ownerDocument.addEventListener('pointerlockerror', onPointerlockError);
		};
		this.disconnect = function() {
			scope.domElement.ownerDocument.removeEventListener('mousemove', onMouseMove);
			scope.domElement.ownerDocument.removeEventListener('pointerlockchange', onPointerlockChange);
			scope.domElement.ownerDocument.removeEventListener('pointerlockerror', onPointerlockError);
		};
		this.dispose = function() { this.disconnect(); };
		this.getDirection = function() {
			const direction = new THREE.Vector3(0, 0, - 1);
			return function(v) { return v.copy(direction).applyQuaternion(camera.quaternion); };
		}();
    this.getAzimuthalDirection = function(v) {
			const output = this.getDirection(v);
      output.y = 0;
      output.normalize();
      return output;
		}
		this.lock = function() {
      scope.domElement.requestPointerLock();
    }
		this.unlock = function() {
      scope.domElement.ownerDocument.exitPointerLock;
    }
		this.connect();
	}
}

function setup() {
  // Generate camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
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
  let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
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
  // TEmporary while testing collisions
  scene.add(floor);
  //terrainGroup.attach(floor);
 
  // Generate cubes
  const boxGeometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize).toNonIndexed();
  const colorsBox = [];
  for (let i = 0, l = boxGeometry.attributes.position.count; i < l; ++i) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsBox.push(color.r, color.g, color.b);
  }
  boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));
  for (let i = 0; i < 500; ++i) {
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

  const visualizer = new MeshBVHVisualizer(collider, 10);  
  scene.add(light);
  scene.add(camera);
  scene.add(visualizer);
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
      if (canJump === true) {
        playerV.y = playerJumpVelocity;
        jumping = true;
        canJump = false;
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
  const deltaS = (nowMs - prevMs) * 0.001;
  updatePhysics(deltaS)
  logToId("camera", camera.position);
  logToId("azimuth", controls.getAzimuthalDirection(new THREE.Vector3()));
  logToId("keyboard", playerControlV3);
  logToId("velocity", playerV);
  logToId("acceleration", playerAccelV3);
  logToId("deceleration", playerDecelV3);
  logToId("canjump", canJump);
  logToId("jumping", jumping);
  logToId("running", running);
  logToId("colliding", colliding);
  prevMs = nowMs;
  renderer.render(scene, camera);
}

function updatePhysics(deltaS) {
  // Protagonist movement

  const forward         = new THREE.Vector3(0, 0, -1);
  const azimuth         = controls.getAzimuthalDirection(new THREE.Vector3());
  const cameraAngle     = forward.angleTo(azimuth) * Math.sign(new THREE.Vector3().crossVectors(forward, azimuth).y);
  const topSpeed        = playerTopSpeed * (running ? 1.0 : playerTopSpeedWalkMultiplier);
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
  playerV.clampLength(0, topSpeed);
  playerV.y = playerVYBefore - deltaS * playerGravity;
  camera.position.addScaledVector(playerV, deltaS);

  // Player collisions
  
  // The renderer will automatically update the camera's world matrix,
  // but if we apply physics out of phase with rendering we need to update it manually.
  camera.updateMatrixWorld(); 
	// Get the position of the capsule in the local space of the collider
  const colliderRotation = new THREE.Matrix4();
  colliderRotation.copy(collider.matrixWorld).invert();
  const colliderDisplacement = new THREE.Line3();
  colliderDisplacement.start.copy(camera.position);
  colliderDisplacement.end.copy(camera.position);
  colliderDisplacement.start.y = camera.position.y - playerEyeLevel + playerRadius;
  colliderDisplacement.end.y   = camera.position.y - playerEyeLevel - playerRadius + playerHeight;
  //colliderDisplacement.start.applyMatrix4(camera.matrixWorld).applyMatrix4(colliderRotation);
  //colliderDisplacement.end.applyMatrix4(camera.matrixWorld).applyMatrix4(colliderRotation);

  // Get the axis-aligned bounding box of the capsule
  const capsuleBoundingBox = new THREE.Box3();
  capsuleBoundingBox.makeEmpty();
  capsuleBoundingBox.expandByPoint(colliderDisplacement.start);
  capsuleBoundingBox.expandByPoint(colliderDisplacement.end);
  capsuleBoundingBox.min.addScalar( - playerRadius);
  capsuleBoundingBox.max.addScalar(   playerRadius);

  const collisionV3 = new THREE.Vector3(0, 0, 0);
  colliding = false;
  collider.geometry.boundsTree.shapecast({
    intersectsBounds: box => box.intersectsBox(capsuleBoundingBox),
    intersectsTriangle: tri => {
      // Adjust the capsule position if the triangle is intersecting it
      const triangleIntersection = collisionV3;
      const distance = tri.closestPointToSegment(colliderDisplacement, triangleIntersection, capsuleIntersection);
      if (distance < playerRadius) {
        const depth = playerRadius - distance;
        const direction = capsuleIntersection.sub(triangleIntersection).normalize();
        colliderDisplacement.start.addScaledVector(direction, depth);
        colliderDisplacement.end.addScaledVector(direction, depth);
        colliding = true;
      }
    }
  });

  // Get the adjusted position of the capsule collider in world space after checking triangle collisions and moving it.
  // playerCapsule.start is assumed to be the origin of the player model.
  const newPosition = new THREE.Vector3().copy(colliderDisplacement.start).applyMatrix4(collider.matrixWorld);
  // Check how much the collider was moved
  const deltaVector = capsuleIntersection;
  deltaVector.subVectors(newPosition, camera.position);
  // If the player was primarily adjusted vertically, treat it as standing on a surface
  const onObject = deltaVector.y > Math.abs(deltaS * playerV.y * 0.25);
  // Resolve collision
  if (onObject) {
    canJump = true;
    playerV.y = Math.max(0, playerV.y);
    console.log("Standing");
  } else {
    //deltaVector.normalize();
    //playerV.addScaledVector(deltaVector, - deltaVector.dot(playerV));
  }  
  //camera.position.add(deltaVector);
  if (camera.position.y < playerEyeLevel) {
    playerV.y = 0;
    camera.position.y = playerEyeLevel;
    canJump = true;
    jumping = false;
  }
}

setup();