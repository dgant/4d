import * as THREE from 'three';
import * as Math4 from './math.js';
import constants from './constants.js';

const uniforms4d = {
  w4dCamera: { value: 0.0 }
};
const vertexShader4d = `
  void main() {
    gl_Position = gl_Position;
  }`;
const fragmentShader4d = `
  #define INVTAU 0.1591549431
  uniform float w4d;
  uniform float w4dCamera;
  void main() {
    gl_FragColor.a = gl_FragColor.a * (1 - 4 * INVPI * abs(w4d - w4dCamera));
  }`;

function update4dUniforms(camera) {
  uniforms4d.w4dCamera.value = camera.getW4d();
}

function give4d(object) {
  object.getW4d = function() { return object._w4d; }
  object.setW4d = function(value) { object._w4d = Math4.clampAngleTau(value); return object; };
  object.addW4d = function(value) { object.setW4d(object.getW4d() + value); return object; };
  object.setW4d(0.0);
  return object;
}

function giveCamera4d(camera) {
  give4d(camera)
  const oldSet = camera.setW4d;
  camera.setW4d = function(value) {
    const output = oldSet(value);
    update4dUniforms(camera);
    return output;
  };
  return camera;
}

const _meshes4d = [];
function giveMesh4d(mesh) {
  give4d(mesh)
  _meshes4d.push(mesh);
}

function distanceW(w4d) {
  return Math4.INVPI * Math4.radianDistance(w4d, uniforms4d.w4dCamera.value);
}

function preRender4d() {
  const v = 1.0 / constants.visibilityThreshold;
  for (const mesh of _meshes4d) {
    const w = distanceW(mesh.getW4d());
    const alpha = 1 - w * (w >= constants.substanceThreshold ? 1.0 : 1.0);
    if (Array.isArray(mesh.material)) {
      for (material in mesh.material) {
        material.opacity = alpha;
      }
    } else {
      mesh.material.opacity = alpha;
    }
  }
}

export { uniforms4d, vertexShader4d, fragmentShader4d, update4dUniforms, giveCamera4d, giveMesh4d, preRender4d };