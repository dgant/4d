import * as THREE from 'three';
import { PlaneGeometry } from 'three';
import * as Make4d from './Make4d.js';

function getCubeMaterials(path) {
  const skyboxTexture = new THREE.TextureLoader().load(path);
  skyboxTexture.repeat = new THREE.Vector2(0.25, 1/3);
  const skyboxTextures = Array(5).fill().map(i => skyboxTexture.clone());
  skyboxTextures[0].offset = new THREE.Vector2(0/4, 1/3);
  skyboxTextures[1].offset = new THREE.Vector2(1/4, 1/3);
  skyboxTextures[2].offset = new THREE.Vector2(2/4, 1/3);
  skyboxTextures[3].offset = new THREE.Vector2(3/4, 1/3);  
  skyboxTextures[4].offset = new THREE.Vector2(1/4, 2/3); 
  const output = skyboxTextures.map(t => new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide }));
  return output;
}

function makeSkybox() {
  const output = new THREE.Group();
  output.name = 'SkyboxGroups';
  [0, 0.25, 0.5, 0.75].forEach(w01 => {
  //[0].forEach(w01 => {
    const skyboxGroup = new THREE.Group();
    skyboxGroup.name = `SkyboxGroup-${w01}`;
    const w = Math.PI * 2 * w01;
    const d = 1e5 + 1e4 * w01; // Offset skyboxes to prevent Z-fighting
    const materials = getCubeMaterials('textures/Daylight Box UV.png');
    const geometrySide = new PlaneGeometry(2 * d, d);
    const geometryTop = new PlaneGeometry(2 * d, 2 * d);
    const skyboxMeshes = ['right', 'front', 'left', 'back', 'top'].map((side, i) => {
      const geometry = i == 4 ? geometryTop : geometrySide;
      const skyboxMesh = new THREE.Mesh(geometry, materials[i]);
      Make4d.bless4d(skyboxMesh);
      skyboxMesh.setW4d(w);
      skyboxMesh.name = `Skybox-${side}-${w01}`;
      skyboxGroup.add(skyboxMesh);
      return skyboxMesh;
    })
    skyboxMeshes[4].rotateY(Math.PI); // Fixes texture alignment
    skyboxMeshes[0].rotateY( 1/2 * Math.PI);
    skyboxMeshes[1].rotateY( 2/2 * Math.PI);
    skyboxMeshes[2].rotateY( 3/2 * Math.PI);
    skyboxMeshes[3].rotateY( 4/2 * Math.PI);
    skyboxMeshes[4].rotateX(-1/2 * Math.PI);
    skyboxMeshes[0].position.set( d, d/2, 0);
    skyboxMeshes[1].position.set( 0, d/2,-d);
    skyboxMeshes[2].position.set(-d, d/2, 0);
    skyboxMeshes[3].position.set( 0, d/2, d);
    skyboxMeshes[4].position.set( 0, d,   0);
    skyboxGroup.rotateY(w);
    output.add(skyboxGroup);
  });
  return output;
}

export default makeSkybox;