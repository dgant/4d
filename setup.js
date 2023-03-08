import * as THREE from 'three';
import { MeshBVH, StaticGeometryGenerator } from '/node_modules/three-mesh-bvh/build/index.module.js';

import FPSControls from './fpscontrols.js';
import constants from './constants.js';
import player from './player.js';
import global from './global.js';
import { giveCamera4d, vertexShader4d, fragmentShader4d } from './give4d.js';
import { HypercubeGeometry } from './hypercube.js';

function setup() {
  const color = new THREE.Color();

  // Generate camera
  global.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5 * constants.playerRadius, 1000);
  global.camera.position.y = constants.playerEyeLevel;
  global.controls = new FPSControls(giveCamera4d(global.camera), document.body);
  giveCamera4d(global.camera);

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
    //const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: true });
    //boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    const boxMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader4d,
      fragmentShader: fragmentShader4d,
      transparent: true });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.x = Math.floor(constants.mapSize * (Math.random() * 2 - 1)) * constants.gridSize;
    box.position.y = Math.floor(constants.mapSize * (Math.random() * 2    )) * constants.gridSize + constants.gridSize / 2;
    box.position.z = Math.floor(constants.mapSize * (Math.random() * 2 - 1)) * constants.gridSize;
    terrainGroup.attach(box);
  }

  // Build collider  
  const staticGenerator = new StaticGeometryGenerator(terrainGroup);
  staticGenerator.attributes = [ 'position' ];
  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });
  global.collider = new THREE.Mesh(mergedGeometry);
  global.collider.material.wireframe = true;
  global.collider.material.opacity = 0.5;
  global.collider.material.transparent = true;

  global.scene.add(light);
  global.scene.add(global.camera);
	global.scene.add(global.collider);
	global.scene.add(terrainGroup);
}

function onKeyDown (event) {
  global.controls.lock(); // Must call this during a user-initiated event
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': player.moveForward = true; break;
    case 'ArrowLeft': case 'KeyA': player.moveLeft = true; break;
    case 'ArrowDown': case 'KeyS': player.moveBackward = true; break;
    case 'ArrowRight': case 'KeyD': player.moveRight = true; break;
    case 'ShiftLeft': case 'ShiftRight': player.running = true; break;
    case 'Space':
      if (player.grounded === true) {
        player.velocityV3.y = constants.playerJumpVelocity;
      }
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': player.moveForward = false; break;
    case 'ArrowLeft': case 'KeyA': player.moveLeft = false; break;
    case 'ArrowDown': case 'KeyS': player.moveBackward = false; break;
    case 'ArrowRight': case 'KeyD': player.moveRight = false; break;
    case 'ShiftLeft': case 'ShiftRight': player.running = false; break;
  }
}
function onWindowResize() {
  global.camera.aspect = window.innerWidth / window.innerHeight;
  global.camera.updateProjectionMatrix();
  global.renderer.setSize(window.innerWidth, window.innerHeight);
}

export default setup;