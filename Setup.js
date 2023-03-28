import * as THREE from 'three';

import FPSControls from './FPSControls.js';
import constants from './Constants.js';
import Octree from './Octree.js';
import player from './Player.js';
import global from './Global.js';
import Levels from './Levels.js';
import makeSkybox from './Skybox.js';
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

  // Generate lights
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);

  // Generate scene  
  global.skybox                   = makeSkybox();
  global.background               = new THREE.Group();
  global.level                    = new THREE.Group();
  global.player                   = new THREE.Group();
  global.hud                      = new THREE.Group();
  global.menu                     = new THREE.Group();
  global.scene                    = new THREE.Scene();
  global.skybox     .name         = 'SkyboxGroup';
  global.background .name         = 'BackgroundGroup';  
  global.level      .name         = 'LevelGroup';
  global.player     .name         = 'PlayerGroup';
  global.hud        .name         = 'HudGroup';
  global.menu       .name         = 'MenuGroup';
  global.skybox     .renderOrder  = 1;
  global.background .renderOrder  = 2;  
  global.level      .renderOrder  = 3;
  global.player     .renderOrder  = 4;
  global.hud        .renderOrder  = 5;
  global.menu       .renderOrder  = 6;
  
  global.scene.add(
    light,
    global.camera,
    global.skybox,
    global.background,
    global.level,
    global.player,
    global.hud,
    global.menu);
  global.scene.background = new THREE.Color(0x78a8c2);
 
  // Attach listeners
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);

  // Create terrain

  // Generate floor
  let floorGeometry = new THREE.PlaneGeometry(400, 400, 100, 100);
  floorGeometry.name = 'floor';
  floorGeometry.rotateX(- Math.PI / 2);
  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices
  const colorsFloor = [];
  for (let i = 0, l = floorGeometry.attributes.position.count; i < l; ++i) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsFloor.push(color.r, color.g, color.b);
  }
  floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsFloor, 3));
  const floorMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial, { name: 'floor' });
  global.level.attach(floor);

  // Load levels
  const levels = new Levels();
  await levels.loadAllLevels()

  // Populate Octree
  global.octree = new Octree();
  global.octree.fromGraphNode(global.level);  
}

function onKeyDown (event) {
  document.getElementById('intro').style.display = 'none';
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