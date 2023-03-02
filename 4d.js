//import * as THREE from '/node_modules/three/build/three.module.js';
import * as THREE from 'three';
import { PointerLockControls } from '/node_modules/three/examples/jsm/controls/PointerLockControls.js';
import { MeshBVH, MeshBVHVisualizer, StaticGeometryGenerator } from '/node_modules/three-mesh-bvh/build/index.module.js';

let camera, collider, controls, protagCapsule, renderer, scene;
const tempBox = new THREE.Box3();
const tempMat = new THREE.Matrix4();
const tempSegment = new THREE.Line3();
const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let running = false;
let jumping = false;
let crouching = false;

let prevMs = performance.now();
const protagV = new THREE.Vector3();
const protagD = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

const gridSize = 20;
const mapSize = 15;
const protagDecel = 10;
const protagAccel = 50;
const protagGravity = 1000;
const protagJumpVelocity = 450;
const protagSpeedCrouch = 150;
const protagSpeedCrouchRun = 250;
const protagSpeedWalk = 350; // Humans: 2.5-4mph
const protagSpeedRun = 900; // Humans: 6mph jog, 18mph sprint
const protagEyeLevel = 16.0;
const protagRadius = 3;
const protagHeight = gridSize;

setup();
loop();

function setup() {
  // Generate camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.y = protagEyeLevel;
  controls = new PointerLockControls(camera, document.body);

  // Generate scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff0f0);
  scene.fog = new THREE.Fog(0xfff0f0, 0, 400);
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);
  scene.add(controls.getObject());

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
  terrainGroup.attach(floor);
 
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

  // Generate protag
  protagCapsule = {
		radius: protagRadius,
		segment: new THREE.Line3(new THREE.Vector3(), new THREE.Vector3(0, - protagHeight, 0.0))
	};

  // Collisions/physics ///////////////////////////////////////////////////////////////////  
  
  const staticGenerator = new StaticGeometryGenerator( terrainGroup );
  staticGenerator.attributes = [ 'position' ];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH( mergedGeometry, { lazyGeneration: false } );

  collider = new THREE.Mesh(mergedGeometry);
  collider.material.wireframe = true;
  collider.material.opacity = 0.5;
  collider.material.transparent = true;

  const visualizer = new MeshBVHVisualizer(collider, 10);
  scene.add(visualizer);
	scene.add(collider);
	scene.add(terrainGroup);
}

function onKeyDown (event) {
  controls.lock(); // Must call this during a user-initiated event
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = true; break;
    case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
    case 'ArrowDown': case 'KeyS': moveBackward = true; break;
    case 'ArrowRight': case 'KeyD': moveRight = true; break;
    case 'ShiftLeft': case 'ShiftRight': running = true; break;
    case 'ControlLeft': case 'ControlRight': crouching = ! jumping; break;
    case 'Space':
      if (canJump === true) {
        protagV.y = protagJumpVelocity;
        jumping = true;
        crouching = false;
      }
      canJump = false;
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
    case 'ControlLeft': case 'ControlRight': crouching = false; break;
  }
}
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loop() {
  requestAnimationFrame(loop);
  const nowMs = performance.now();  
  const deltaMs = (nowMs - prevMs) / 1000;

  // Movement
  protagV.x -= protagV.x * protagDecel * deltaMs;
  protagV.z -= protagV.z * protagDecel * deltaMs;
  protagV.y -= protagGravity * deltaMs;
  protagD.z = Number(moveForward) - Number(moveBackward);
  protagD.x = Number(moveRight) - Number(moveLeft);
  protagD.normalize(); // this ensures consistent movements in all protagDs

  const deltaV = running ? protagSpeedRun : protagSpeedWalk;
  if (moveLeft    || moveRight)    protagV.x -= protagD.x * deltaV * deltaMs;
  if (moveForward || moveBackward) protagV.z -= protagD.z * deltaV * deltaMs;

  // Physics
  // Adjust player position based on collisions
  //protagMesh.updateMatrixWorld(); -- this would be controls.getObject().updateMatrixWorld() now?
  tempBox.makeEmpty();
  tempMat.copy(collider.matrixWorld).invert();
	// Get the position of the capsule in the local space of the collider
  tempSegment.copy(protagCapsule.segment);
  tempSegment.start.applyMatrix4(controls.getObject().matrixWorld).applyMatrix4(tempMat);
  tempSegment.end.applyMatrix4(controls.getObject().matrixWorld).applyMatrix4(tempMat);
  // Get the axis-aligned bounding box of the capsule
  tempBox.expandByPoint(tempSegment.start);
  tempBox.expandByPoint(tempSegment.end);
  tempBox.min.addScalar( - protagCapsule.radius);
  tempBox.max.addScalar(   protagCapsule.radius);
  collider.geometry.boundsTree.shapecast({
    intersectsBounds: box => box.intersectsBox(tempBox),
    intersectsTriangle: tri => {
      // Adjust the capsule position if the triangle is intersecting it
      const triPoint = tempVector;
      const capsulePoint = tempVector2;
      const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
      if (distance < protagCapsule.radius) {
        const depth = protagCapsule.radius - distance;
        const direction = capsulePoint.sub(triPoint).normalize();
        tempSegment.start.addScaledVector(direction, depth);
        tempSegment.end.addScaledVector(direction, depth);
        console.log(direction);
      }
    }
  });
  // Get the adjusted position of the capsule collider in world space after checking triangle collisions and moving it.
  // protagCapsule.segment.start is assumed to be the origin of the player model.
  const newPosition = tempVector;
  newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);
  // Check how much the collider was moved
  const deltaVector = tempVector2;
  deltaVector.subVectors(newPosition, controls.getObject().position);
  // If the player was primarily adjusted vertically, treat it as standing on a surface
  const onObject = deltaVector.y > Math.abs(deltaMs * protagV.y * 0.25);
  // Resolve collision
  controls.getObject().position.add(deltaVector);
  if (onObject) {
    canJump = true;
    protagV.y = Math.max(0, protagV.y);
  } else {
    deltaVector.normalize();
    protagV.addScaledVector(deltaVector, - deltaVector.dot(protagV));
  }
  controls.moveRight(- protagV.x * deltaMs);
  controls.moveForward(- protagV.z * deltaMs);
  controls.getObject().position.y += (protagV.y * deltaMs);
  if (controls.getObject().position.y < protagEyeLevel) {
    protagV.y = 0;
    controls.getObject().position.y = protagEyeLevel;
    canJump = true;
  }

  prevMs = nowMs;
  renderer.render(scene, camera);
}
