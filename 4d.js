import * as THREE from './node_modules/three/build/three.module.js';
import { PointerLockControls } from './node_modules/three/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls, protagMesh;

const colliders = [];

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
const mapSize = 30;
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

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff0f0);
  scene.fog = new THREE.Fog(0xfff0f0, 0, 400);
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.y = protagEyeLevel;
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

  // Generate floor
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

  // Generate protag
  const protagGeometry = new THREE.CylinderGeometry(protagRadius, protagRadius, protagHeight);
  const protagMaterial = new THREE.MeshBasicMaterial({});
  protagMesh = new THREE.Mesh(protagGeometry, protagMaterial);
  protagMesh.translateY(protagHeight / 2);

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
  const deltaMs = (nowMs - prevMs) / 1000;

  if (controls.isLocked === true) {
    let onObject = false;
    for (const collider of colliders) {
      // This treats protag as square
      if (protagMesh.position.manhattanDistanceTo(collider.position) <= gridSize + protagRadius) {
        onObject = true;
      }
    }

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

    if (onObject === true) {
      protagV.y = Math.max(0, protagV.y);
      canJump = true;
    }

    controls.moveRight(- protagV.x * deltaMs);
    controls.moveForward(- protagV.z * deltaMs);
    controls.getObject().position.y += (protagV.y * deltaMs);
    if (controls.getObject().position.y < protagEyeLevel) {
      protagV.y = 0;
      controls.getObject().position.y = protagEyeLevel;
      canJump = true;
    }
    protagMesh.position.set(controls.getObject().position);
  }
  prevMs = nowMs;
  renderer.render(scene, camera);
}
