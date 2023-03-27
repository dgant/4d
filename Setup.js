import * as THREE from 'three';

import FPSControls from './FPSControls.js';
import constants from './Constants.js';
import Octree from './Octree.js';
import player from './Player.js';
import global from './Global.js';
import { Levels } from './Levels.js';
import * as Make4d from './Make4d.js';

async function setup() {
  const color = new THREE.Color();

  // Generate renderer
  global.renderer = new THREE.WebGLRenderer({antialias: true});
  global.renderer.setPixelRatio(window.devicePixelRatio);
  global.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(global.renderer.domElement);

  // Generate camera
  global.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1e6);
  global.camera.position.y = constants.playerEyeLevel;  
  Make4d.bless4d(global.camera);
  global.controls = new FPSControls(global.camera, document.body);
  player.updateCamera();

  // Generate scene
  global.scene = new THREE.Scene();
  global.scene.background = new THREE.Color(0x78a8c2);
  //global.scene.fog = new THREE.Fog(0xfff0f0, 0, 20);
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);

  // Create skybox
  const skyboxGeometry = new THREE.BoxGeometry(1e3, 1e3, 1e3);
  const skyboxTexture = new THREE.TextureLoader().load('textures/Daylight Box UV.png');
  skyboxTexture.repeat = new THREE.Vector2(0.25, 1/3);
  const skyboxTextures = Array(6).fill().map(i => skyboxTexture.clone());
  skyboxTextures[0].offset = new THREE.Vector2(0.00, 1/3);
  skyboxTextures[1].offset = new THREE.Vector2(0.50, 1/3);
  skyboxTextures[2].offset = new THREE.Vector2(0.25, 2/3);  
  skyboxTextures[3].offset = new THREE.Vector2(0.25, 0/3);
  //skyboxTextures[2].rotation = Math.PI;
  skyboxTextures[4].offset = new THREE.Vector2(0.75, 1/3);
  skyboxTextures[5].offset = new THREE.Vector2(0.25, 1/3);
  const skyboxMaterials = skyboxTextures.map(t => new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide }));
  const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
  skyboxMesh.position.y -= 1e2;
  global.scene.add(skyboxMesh);
 
  // Attach listeners
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);

  // Create terrain
  global.terrainGroup = new THREE.Group();

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
  global.terrainGroup.attach(floor);

  global.octree = new Octree();
  global.scene.add(light);
  global.scene.add(global.camera);
	global.scene.add(global.terrainGroup);

  // Load levels
  const levels = new Levels();
  await levels.loadAllLevels()
  global.octree.fromGraphNode(global.terrainGroup);  
}

function onKeyDown (event) {
  document.getElementById("intro").style.display = "none"
  global.controls.lock(); // Must call this during a user-initiated event
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': player.moveForward = true; break;
    case 'ArrowLeft': case 'KeyA': player.moveLeft = true; break;
    case 'ArrowDown': case 'KeyS': player.moveBackward = true; break;
    case 'ArrowRight': case 'KeyD': player.moveRight = true; break;
    case 'KeyQ': player.rotateOut = true; break;
    case 'KeyE': player.rotateIn = true; break;
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
    case 'KeyQ': player.rotateOut = false; break;
    case 'KeyE': player.rotateIn = false; break;
    case 'ShiftLeft': case 'ShiftRight': player.running = false; break;
  }
}
function onWindowResize() {
  global.camera.aspect = window.innerWidth / window.innerHeight;
  global.camera.updateProjectionMatrix();
  global.renderer.setSize(window.innerWidth, window.innerHeight);
}

export default setup;