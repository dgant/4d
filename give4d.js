import * as THREE from 'three';
import * as Math4 from './math.js';

function giveCamera4d(camera) {
  camera.getW4d = function() { return camera._w4d; }
  camera.setW4d = function(value) { camera._w4d = Math4.clampAngleTau(value); return camera; };
  camera.addW4d = function(value) { camera.setW4d(camera.getW4d() + value); return camera; };
  camera.setW4d(0);
  return camera;
}

function shaderizeMaterial(material) {
  material.isShaderMaterial = true;
}

const uniforms4d = {
  w4d: {type: "float"}
};
const vertexShader4d = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const fragmentShader4d = `
  void main() {
    gl_FragColor = vec4(0.1, 0.1, 0.1, 0.1).rgba;
  }`;

export { giveCamera4d, uniforms4d, vertexShader4d, fragmentShader4d };