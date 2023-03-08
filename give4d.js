import * as THREE from 'three';
import * as Math4 from './math.js';

const uniforms4d = {
  w4dCamera: { value: 0.0 }
};
const vertexShader4d = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const fragmentShader4d = `
  #define PI  3.1415926538
  #define TAU 6.2831853072
  #define INVTAU 0.1591549431
  uniform float w4d;
  uniform float w4dCamera;
  void main() {
    gl_FragColor = vec4(0.5, 0.5, 0.5, 0.5);
  }`;

function update4dUniforms(camera) {
  uniforms4d.w4dCamera.value = camera.getW4d();
}

function giveCamera4d(camera) {
  camera.getW4d = function() {
    return camera._w4d;
  }
  camera.setW4d = function(value) {
    camera._w4d = Math4.clampAngleTau(value);
    update4dUniforms(camera);
    return camera;
  };
  camera.addW4d = function(value) {
   camera.setW4d(camera.getW4d() + value);
   return camera;
  };
  camera.setW4d(0.0);
  return camera;
}

export { uniforms4d, vertexShader4d, fragmentShader4d, update4dUniforms, giveCamera4d };