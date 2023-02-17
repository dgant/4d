import * as THREE from './node_modules/three/build/three.module.js';
import { PointerLockControls } from './node_modules/three/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls, raycaster;

const colliders = [];

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let running = false;
let crouching = false;

let prevMs = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

const gridSize = 20;
const mapSize = 30;
const protagDecel = 10.0;
const protagAccel = 50.0;
const protagJumpVelocity = 450.0;
const protagSpeedCrouch = 150.0;
const protagSpeedCrouchRun = 250.0;
const protagSpeedWalk = 350.0; // Humans: 2.5-4mph
const protagSpeedRun = 900.0; // Humans: 6mph jog, 18mph sprint
const protagEyeLevel = 16.0;
const protagHeight = gridSize;

setup();
loop();

function setup() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.y = protagEyeLevel;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff0f0);
  scene.fog = new THREE.Fog(0xfff0f0, 0, 400);

  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());  

  const onKeyDown = function (event) {
    controls.lock();
    switch (event.code) {
      case 'ArrowUp': case 'KeyW': moveForward = true; break;
      case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
      case 'ArrowDown': case 'KeyS': moveBackward = true; break;
      case 'ArrowRight': case 'KeyD': moveRight = true; break;
      case 'ShiftLeft': case 'ShiftRight': running = true; break;
      case 'ControlLeft': case 'ControlRight': crouching = true; break;
      case 'Space':
        if (canJump === true) velocity.y = protagJumpVelocity;
        canJump = false;
        break;
    }
  };
  const onKeyUp = function (event) {
    switch (event.code) {
      case 'ArrowUp': case 'KeyW': moveForward = false; break;
      case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
      case 'ArrowDown': case 'KeyS': moveBackward = false; break;
      case 'ArrowRight': case 'KeyD': moveRight = false; break;
      case 'ShiftLeft': case 'ShiftRight': running = false; break;
      case 'ControlLeft': case 'ControlRight': crouching = false; break;
    }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, protagEyeLevel);

  // Floor

  let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  floorGeometry.rotateX(- Math.PI / 2);

  let position = floorGeometry.attributes.position;
  for (let i = 0, l = position.count; i < l; ++i) {
    vertex.fromBufferAttribute(position, i);
    vertex.x += Math.random() * gridSize - 0.5 * gridSize;
    vertex.y += Math.random() * 2;
    vertex.z += Math.random() * gridSize - 0.5 * gridSize;
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

  position = floorGeometry.attributes.position;
  const colorsFloor = [];

  for (let i = 0, l = position.count; i < l; ++i) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsFloor.push(color.r, color.g, color.b);
  }

  floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsFloor, 3));

  const floorMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);
 
  // Generate cubes
  const boxGeometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize).toNonIndexed();
  position = boxGeometry.attributes.position;
  const colorsBox = [];

  for (let i = 0, l = position.count; i < l; ++i) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsBox.push(color.r, color.g, color.b);
  }
  boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));
  for (let i = 0; i < 8000; ++i) {
    const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: true });
    boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);

    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.x = Math.floor(mapSize * (Math.random() * 2 - 1)) * gridSize;
    box.position.y = Math.floor(mapSize * (Math.random() * 2    )) * gridSize + gridSize / 2;
    box.position.z = Math.floor(mapSize * (Math.random() * 2 - 1)) * gridSize;

    scene.add(box);
    colliders.push(box);
  }

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loop() {
  requestAnimationFrame(loop);

  const nowMs = performance.now();

  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= protagEyeLevel;

    const intersections = raycaster.intersectObjects(colliders, false);
    const onObject = intersections.length > 0;
    for (const intersector in intersections) {
      console.log(intersector.toString());
    }

    const deltaMs = (nowMs - prevMs) / 1000;

    // Deceleration
    velocity.x -= velocity.x * protagDecel * deltaMs;
    velocity.z -= velocity.z * protagDecel * deltaMs;
    velocity.y -= 9.8 * 100.0 * deltaMs; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    const deltaV = running ? protagSpeedRun : protagSpeedWalk;
    if (moveForward || moveBackward) velocity.z -= direction.z * deltaV * deltaMs;
    if (moveLeft || moveRight) velocity.x -= direction.x * deltaV * deltaMs;

    if (onObject === true) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
    }

    controls.moveRight(- velocity.x * deltaMs);
    controls.moveForward(- velocity.z * deltaMs);
    controls.getObject().position.y += (velocity.y * deltaMs); 

    if (controls.getObject().position.y < protagEyeLevel) {
      velocity.y = 0;
      controls.getObject().position.y = protagEyeLevel;
      canJump = true;
    }
  }
  prevMs = nowMs;
  renderer.render(scene, camera);
}
